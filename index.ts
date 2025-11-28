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
          },
          {
              name: "get_related_videos",
              description: "Get videos related to a specific video",
              inputSchema: {
                  type: "object",
                  properties: {
                      videoId: {
                          type: "string",
                          description: "YouTube video ID"
                      },
                      maxResults: {
                          type: "number",
                          description: "Maximum number of related videos (default: 10)",
                          default: 10
                      }
                  },
                  required: ["videoId"]
              }
          },
          {
              name: "get_channel_info",
              description: "Get information about a YouTube channel",
              inputSchema: {
                  type: "object",
                  properties: {
                      channelId: {
                          type: "string",
                          description: "YouTube channel ID"
                      }
                  },
                  required: ["channelId"]
              }
          },
          {
              name: "search_videos",
              description: "Search for videos on YouTube",
              inputSchema: {
                  type: "object",
                  properties: {
                      query: {
                          type: "string",
                          description: "Search query"
                      },
                      maxResults: {
                          type: "number",
                          description: "Maximum number of results (default: 10)",
                          default: 10
                      }
                  },
                  required: ["query"]
              }
          },
          {
              name: "get_video_thumbnails",
              description: "Get thumbnail information for a video",
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
        case "get_related_videos":
          return await this.getRelatedVideos((args as any).videoId, (args as any).maxResults || 10);
        case "get_channel_info":
          return await this.getChannelInfo((args as any).channelId);
        case "search_videos":
          return await this.searchVideos((args as any).query, (args as any).maxResults || 10);
        case "get_video_thumbnails":
          return await this.getVideoThumbnails((args as any).videoId);
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
      // First, check if subtitles are available
      const availableSubs = await this.checkSubtitlesAvailability(videoId, language);

      if (!availableSubs.hasSubtitles) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                videoId,
                language,
                available: false,
                message: "No auto-generated subtitles available for this video. YouTube only generates subtitles for videos with sufficient spoken content.",
                availableLanguages: availableSubs.availableLanguages
              }, null, 2)
            }
          ]
        };
      }

      // Subtitles are available, proceed with download
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
              available: true,
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

  private async checkSubtitlesAvailability(videoId: string, language: string): Promise<{hasSubtitles: boolean, availableLanguages: string[]}> {
    return new Promise((resolve) => {
      const ytDlp = spawn('yt-dlp', [
        '--list-subs',
        `https://www.youtube.com/watch?v=${videoId}`
      ]);

      let output = '';
      let errorOutput = '';

      ytDlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytDlp.on('close', (code) => {
        if (code === 0) {
          // Parse the output to check for available subtitles
          const lines = output.split('\n');
          const availableLanguages: string[] = [];

          let inSubsSection = false;
          for (const line of lines) {
            if (line.includes('Available subtitles')) {
              inSubsSection = true;
              continue;
            }
            if (inSubsSection && line.trim() === '') {
              break; // End of subtitles section
            }
            if (inSubsSection && line.includes(':')) {
              const lang = line.split(':')[0].trim();
              if (lang && lang !== 'Language') {
                availableLanguages.push(lang);
              }
            }
          }

          const hasRequestedLanguage = availableLanguages.includes(language);
          resolve({
            hasSubtitles: hasRequestedLanguage,
            availableLanguages
          });
        } else {
          resolve({
            hasSubtitles: false,
            availableLanguages: []
          });
        }
      });

      ytDlp.on('error', () => {
        resolve({
          hasSubtitles: false,
          availableLanguages: []
        });
      });
    });
  }

  private async getRelatedVideos(videoId: string, maxResults: number) {
    try {
      // First get the video info to find the channel
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      const video = videoResponse.data.items?.[0];
      if (!video) {
        throw new Error("Video not found");
      }

      const channelId = video.snippet?.channelId;
      if (!channelId) {
        throw new Error("Channel ID not found for video");
      }

      // Get other videos from the same channel
      const response = await youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        type: ['video'],
        maxResults: maxResults + 1, // +1 to account for the original video
        order: 'date'
      });

      const videos = response.data.items
        ?.filter(item => item.id?.videoId !== videoId) // Exclude the original video
        ?.slice(0, maxResults) // Limit to maxResults
        ?.map(item => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          description: item.snippet?.description
        })) || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              note: "Showing other videos from the same channel (YouTube API doesn't provide true 'related videos')",
              videos
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting related videos: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  private async getChannelInfo(channelId: string) {
    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId]
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error("Channel not found");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              title: channel.snippet?.title,
              description: channel.snippet?.description,
              publishedAt: channel.snippet?.publishedAt,
              subscriberCount: channel.statistics?.subscriberCount,
              videoCount: channel.statistics?.videoCount,
              viewCount: channel.statistics?.viewCount
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting channel info: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  private async searchVideos(query: string, maxResults: number) {
    try {
      const response = await youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults: maxResults
      });

      const videos = response.data.items?.map(item => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt,
        description: item.snippet?.description
      })) || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(videos, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching videos: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  private async getVideoThumbnails(videoId: string) {
    try {
      const response = await youtube.videos.list({
        part: ['snippet'],
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
              videoId,
              thumbnails: video.snippet?.thumbnails
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting video thumbnails: ${error instanceof Error ? error.message : String(error)}`
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