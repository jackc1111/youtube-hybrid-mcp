# YouTube Hybrid MCP Server

A Model Context Protocol (MCP) server that provides YouTube video tools using both the YouTube Data API and yt-dlp.

## Features

- Get video metadata (title, description, views, likes, etc.)
- Retrieve video comments
- Extract video subtitles/transcripts

## Prerequisites

- Node.js 18+
- YouTube Data API v3 key
- yt-dlp installed and available in PATH

## Installation

### Via npx (after publishing)

```bash
npx youtube-hybrid-mcp
```

### Local development

```bash
git clone <repository-url>
cd youtube-hybrid-mcp
npm install
npm run build
```

## Usage

Set your YouTube API key:

```bash
export YOUTUBE_API_KEY=your_api_key_here
```

Run the server:

```bash
npm start
```

Or directly:

```bash
node dist/index.js
```

## Tools

### get_video_meta

Retrieves metadata for a YouTube video.

**Parameters:**
- `videoId` (string): YouTube video ID

### get_comments

Retrieves comments for a YouTube video.

**Parameters:**
- `videoId` (string): YouTube video ID
- `maxResults` (number, optional): Maximum number of comments (default: 10)

### get_subtitles

Extracts subtitles/transcript from a YouTube video.

**Parameters:**
- `videoId` (string): YouTube video ID
- `language` (string, optional): Language code (default: "en")

## MCP Integration

This server implements the Model Context Protocol and can be used with MCP-compatible clients.

## License

MIT