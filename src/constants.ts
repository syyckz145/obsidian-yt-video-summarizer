import { PluginSettings } from "./types";

// List of supported Gemini models
export const GEMINI_MODELS = [
	'gemini-2.0-flash-exp',
	'gemini-1.5-flash',
	'gemini-1.5-flash-8b',
	'gemini-1.5-pro'
] as const;

// Default prompt for video analysis
export const DEFAULT_PROMPT = `Please analyze video transcript and provide:
1. Main topic and key message
2. Important points in bullet points
3. Key takeaways
4. Any technical terms explained
5. Brief conclusion`;

// Default settings for the plugin
export const DEFAULT_SETTINGS: PluginSettings = {
	geminiApiKey: '',
	selectedModel: 'gemini-1.5-pro',
	customPrompt: DEFAULT_PROMPT,
	maxTokens: 3000,
	temperature: 1
};

// Regex pattern for extracting video title from meta tag
export const TITLE_REGEX = /<meta\s+name="title"\s+content="([^"]*)">/;

// Regex pattern for extracting video ID from YouTube URL
export const VIDEO_ID_REGEX = /(?:v=|\/)([a-zA-Z0-9_-]{11})/;

// Regex pattern for extracting video author from meta tag
export const AUTHOR_REGEX = /<link itemprop="name" content="([^"]+)">/;

// Regex pattern for extracting channel ID from video page
export const CHANNEL_ID_REGEX = /"channelId":"([^"]+)"/;
