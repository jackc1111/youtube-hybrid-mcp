#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { google } from 'googleapis';
import { spawn } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  throw new Error('YOUTUBE_API_KEY environment variable is required');
}

const youtube = google.youtube({
  version: 'v3',
  auth: YOUTUBE_API_KEY
});

class YouTubeMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "youtube-hybrid-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_video_meta",
            description: "Get video metadata from YouTube API",
            inputSchema: {
              type: "object",
              properties: {
                videoId: {
                  type: "string",
                  description: "YouTube video ID"
                }
              },
              required: ["videoId"]
            }
          },
          {
            name: "get_comments",
            description: "Get video comments from YouTube API",
            inputSchema: {
              type: "object",
              properties: {
                videoId: {
                  type: "string",
                  description: "YouTube video ID"
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of comments",
                  default: 10
                }
              },
              required: ["videoId"]
            }
          },
          {
            name: "get_subtitles",
            description: "Get video subtitles using yt-dlp",
            inputSchema: {
              type: "object",
              properties: {
                videoId: {
                  type: "string",
                  description: "YouTube video ID"
                },
                language: {
                  type: "string",
                  description: "Language code (default: en)",
                  default: "en"
                }
              },
              required: ["videoId"]
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("Arguments are required");
      }

      switch (name) {
        case "get_video_meta":
          return await this.getVideoMeta((args as any).videoId);
        case "get_comments":
          return await this.getComments((args as any).videoId, (args as any).maxResults || 10);
        case "get_subtitles":
          return await this.getSubtitles((args as any).videoId, (args as any).language || "en");
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async getVideoMeta(videoId: string) {
    try {
      const response = await youtube.videos.list({
        part: ['snippet', 'statistics'],
        id: [videoId]
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new Error("Video not found");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              title: video.snippet?.title,
              description: video.snippet?.description,
              publishedAt: video.snippet?.publishedAt,
              channelTitle: video.snippet?.channelTitle,
              viewCount: video.statistics?.viewCount,
              likeCount: video.statistics?.likeCount,
              commentCount: video.statistics?.commentCount
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting video meta: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  private async getComments(videoId: string, maxResults: number) {
    try {
      const response = await youtube.commentThreads.list({
        part: ['snippet'],
        videoId: videoId,
        maxResults: maxResults
      });

      const comments = response.data.items?.map(item => ({
        text: item.snippet?.topLevelComment?.snippet?.textDisplay,
        author: item.snippet?.topLevelComment?.snippet?.authorDisplayName,
        publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt,
        likeCount: item.snippet?.topLevelComment?.snippet?.likeCount
      })) || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comments, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting comments: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  private async getSubtitles(videoId: string, language: string) {
    try {
      const tempBase = join(tmpdir(), `subs_${videoId}_${language}`);
      await new Promise((resolve, reject) => {
        const ytDlp = spawn('yt-dlp', [
          '--write-subs',
          '--sub-langs', language,
          '--skip-download',
          '-o', tempBase,
          `https://www.youtube.com/watch?v=${videoId}`
        ]);

        ytDlp.on('close', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`yt-dlp failed with code ${code}`));
          }
        });

        ytDlp.on('error', reject);
      });

      const vttFile = `${tempBase}.${language}.vtt`;
      const vttContent = readFileSync(vttFile, 'utf-8');
      unlinkSync(vttFile);

      // Parse VTT to JSON
      const lines = vttContent.split('\n');
      const transcript = [];
      let currentItem = null;

      for (const line of lines) {
        if (line.includes('-->')) {
          if (currentItem) {
            transcript.push(currentItem);
          }
          const [start, end] = line.split(' --> ');
          const startTime = this.timeToSeconds(start);
          const duration = this.timeToSeconds(end) - startTime;
          currentItem = { text: '', duration, offset: startTime * 1000 };
        } else if (currentItem && line.trim() && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
          currentItem.text += line + ' ';
        }
      }
      if (currentItem) {
        transcript.push(currentItem);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              videoId,
              language,
              transcript
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting subtitles: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  private timeToSeconds(time: string): number {
    const parts = time.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new YouTubeMCPServer();
server.run().catch(console.error);