# YouTube Video Summarizer for Obsidian

Generate AI-powered summaries of YouTube videos directly in Obsidian. This plugin leverages the [obsidian-ai-providers](https://github.com/pfrankov/obsidian-ai-providers) hub, allowing you to choose from a variety of AI providers, including:

- Ollama
- OpenAI
- OpenAI compatible API
- OpenRouter
- Google Gemini
- LM Studio
- Groq

## Demo

![Demo](assets/demo.gif)

## Features

-   🎥 Extract transcripts from YouTube videos
-   🤖 Generate summaries using various AI providers
-   📝 Create structured notes with key points
-   🔍 Identify and explain technical terms
-   📊 Format summaries with metadata and tags

## Requirements

-   Obsidian v0.15.0+

## Manual Installation

This plugin must be installed manually as it is not available in the Community Plugins store.

1.  **Download the Plugin:** Go to the GitHub page of the plugin: [https://github.com/syyckz145/obsidian-yt-video-summarizer](https://github.com/syyckz145/obsidian-yt-video-summarizer). Click the green "Code" button and select "Download ZIP".
2.  **Unzip the Files:** Unzip the downloaded file. You should now have a folder named something like `obsidian-yt-video-summarizer-main`.
3.  **Find Your Obsidian Plugins Folder:**
    *   In Obsidian, go to `Settings` > `Community Plugins`.
    *   Under "Installed plugins", click the folder icon to open your vault's plugins folder. It's usually located at `YourVaultName/.obsidian/plugins/` (where `YourVaultName` is the name of your Obsidian vault).
4.  **Copy the Plugin Folder:** Copy the unzipped plugin folder (e.g., `obsidian-yt-video-summarizer-main`) into the plugins folder you just opened.
5.  **Reload Obsidian:** Go back to Obsidian and, in the "Community Plugins" settings, click the "Reload plugins" button (the circular arrow icon).
6.  **Enable the Plugin:** Your manually installed plugin should now appear in the list. Enable it by toggling it on.

You will also need to install and configure the [obsidian-ai-providers](https://github.com/pfrankov/obsidian-ai-providers) plugin, which this plugin uses to connect to various AI services.

## Configuration

1.  **Install and configure `obsidian-ai-providers`:**
    *   Follow the installation and configuration instructions for the [obsidian-ai-providers](https://github.com/pfrankov/obsidian-ai-providers) plugin.
    *   Ensure you have correctly set up your desired AI provider (e.g., entered API keys, selected models) within the `obsidian-ai-providers` settings.
2.  **Configure `obsidian-yt-video-summarizer` (Optional):**
    *   Open this plugin's settings in Obsidian (`Settings` > `Community Plugins` > `YouTube Video Summarizer`).
    *   You can customize the summary prompt if needed. The core AI provider settings are managed by `obsidian-ai-providers`.

## Usage

### Method 1: Command Palette

1. Copy YouTube URL
2. Open command palette (`Ctrl/Cmd + P`)
3. Search for "Summarize YouTube Video"
4. Paste URL when prompted

### Method 2: Selection

1. Paste YouTube URL in note
2. Select the URL
3. Use command palette or context menu to summarize

## Output Format

```markdown
# Video Title

[Video thumbnail]

## Summary

[AI-generated summary]

## Key Points

-   Point 1
-   Point 2

## Technical Terms

-   Term 1: Definition
-   Term 2: Definition

## Conclusion

[Summary conclusion]
```

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
