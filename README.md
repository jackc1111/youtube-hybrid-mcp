# YouTube Hybrid MCP Server

A Model Context Protocol (MCP) server that provides YouTube video tools using both the YouTube Data API and yt-dlp.

## Features

- Get video metadata (title, description, views, likes, channelId, etc.)
- Retrieve video comments
- Extract video subtitles/transcripts (with auto-generated captions support)
- Robust thumbnail extraction
- Search videos and retrieve related channel content

## Prerequisites

- Node.js 18+
- YouTube Data API v3 key (see [Getting API Key](#getting-youtube-api-key))
- yt-dlp (optional, required only for subtitles functionality - see [Installing yt-dlp](#installing-yt-dlp))

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

## Installing yt-dlp

yt-dlp is required only for the `get_subtitles` tool. If you don't need subtitles functionality, you can skip this step.

### Windows
```bash
pip install yt-dlp
```

### macOS
```bash
pip install yt-dlp
# or using Homebrew
brew install yt-dlp
```

### Linux

**Recommended (Latest Build):**
```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Using package manager (may be outdated):**
```bash
# Ubuntu/Debian/Mint
sudo apt install yt-dlp
# Fedora
sudo dnf install yt-dlp
# Arch Linux
sudo pacman -S yt-dlp
```

### Verify Installation
After installation, verify yt-dlp is in your PATH:
```bash
yt-dlp --version
```

If yt-dlp is not found, you may need to add Python Scripts to your PATH:
- **Windows**: Add `%USERPROFILE%\AppData\Roaming\Python\Python3X\Scripts` to PATH
- **macOS/Linux**: Add `~/.local/bin` to PATH

## Configuration

### Environment Setup

Set your YouTube API key as an environment variable:

```bash
export YOUTUBE_API_KEY=your_api_key_here
```

### Editor/IDE Configuration

#### VSCode (with KiloCode extension)
Add to your MCP settings (usually in `settings.json` or MCP configuration):

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "youtube-hybrid-mcp"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Cursor
Add to your `.cursorrules` or MCP configuration:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "youtube-hybrid-mcp"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Claude Desktop
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "youtube-hybrid-mcp"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Other MCP-compatible editors
For any MCP-compatible editor, use this configuration:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "youtube-hybrid-mcp"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Usage

Run the server directly:

```bash
npm start
```

Or via npx:

```bash
npx youtube-hybrid-mcp
```

## Tools

### get_video_meta

Retrieves metadata for a YouTube video.

**Parameters:**
- `videoId` (string): YouTube video ID

**Returns:** title, description, publishedAt, channelId, channelTitle, viewCount, likeCount, commentCount.

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

### get_related_videos

Gets videos related to a specific video (shows other videos from the same channel).

**Parameters:**
- `videoId` (string): YouTube video ID
- `maxResults` (number, optional): Maximum number of related videos (default: 10)

### get_channel_info

Gets information about a YouTube channel.

**Parameters:**
- `channelId` (string): YouTube channel ID

### search_videos

Searches for videos on YouTube.

**Parameters:**
- `query` (string): Search query
- `maxResults` (number, optional): Maximum number of results (default: 10)

### get_video_thumbnails

Gets thumbnail information for a video.

**Parameters:**
- `videoId` (string): YouTube video ID

## MCP Integration

This server implements the Model Context Protocol and can be used with MCP-compatible clients.

## License

MIT