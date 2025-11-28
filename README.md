# YouTube Hybrid MCP Server

A Model Context Protocol (MCP) server that provides YouTube video tools using both the YouTube Data API and yt-dlp.

## Features

- Get video metadata (title, description, views, likes, etc.)
- Retrieve video comments
- Extract video subtitles/transcripts

## Prerequisites

- Node.js 18+
- YouTube Data API v3 key (see [Getting API Key](#getting-youtube-api-key))
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

## Getting YouTube API Key

To use this MCP server, you need a YouTube Data API v3 key. Follow these steps:

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2. Enable YouTube Data API v3
1. In the Cloud Console, go to "APIs & Services" > "Library"
2. Search for "YouTube Data API v3"
3. Click on it and enable the API

### 3. Create API Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. Copy the generated API key

### 4. Restrict the API Key (Recommended)
1. Click on the created API key
2. Under "Application restrictions":
   - Select "HTTP referrers"
   - Add your domain or leave unrestricted for development
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "YouTube Data API v3"
4. Save the changes

### 5. Set Environment Variable
```bash
export YOUTUBE_API_KEY=your_api_key_here
```

**Note**: Keep your API key secure and never commit it to version control.

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