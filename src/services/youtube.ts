import {
	AUTHOR_REGEX,
	CHANNEL_ID_REGEX,
	TITLE_REGEX,
	VIDEO_ID_REGEX,
} from 'src/constants';
import {
	ThumbnailQuality,
	TranscriptLine,
	TranscriptResponse,
} from 'src/types';
import {
	YouTubeTranscriptApi,
	TranscriptSnippet,
	YouTubeTranscriptApiConfig,
	CouldNotRetrieveTranscript,
	CouldNotRetrieveTranscriptReason
} from 'yt-transcript-ts';
import { ObsidianAxiosAdapter } from './obsidian-request-adapter'; // Import the adapter

// import { parse } from 'node-html-parser'; // No longer needed for transcript fetching
import { request } from 'obsidian'; // For fetching metadata directly

/**
 * Service class for interacting with YouTube videos.
 * Provides methods to fetch video thumbnails and transcripts.
 */
export class YouTubeService {
	private ytApi: YouTubeTranscriptApi;

	constructor() {
		// Configure YouTubeTranscriptApi to use the ObsidianAxiosAdapter
		const apiConfig: YouTubeTranscriptApiConfig = {
			httpClient: ObsidianAxiosAdapter.create({
				// We can specify a User-Agent that is less likely to be blocked if necessary.
				// Obsidian's requestUrl might override or ignore this anyway.
				headers: {
					// 'User-Agent': 'Mozilla/5.0 (compatible; ObsidianPlugin/1.0; +https://obsidian.md)'
				}
			}),
			// userAgent for yt-transcript-ts to use if it passes it to its httpClient.
			// userAgent: 'Mozilla/5.0 (compatible; ObsidianPlugin/1.0; +https://obsidian.md)',
		};
		this.ytApi = new YouTubeTranscriptApi(apiConfig);
	}

	/**
	 * Gets the thumbnail URL for a YouTube video
	 * @param videoId - The YouTube video identifier
	 * @param quality - Desired thumbnail quality (default: 'maxres')
	 * @returns URL string for the video thumbnail
	 * @example
	 * const thumbnailUrl = YouTubeService.getThumbnailUrl('dQw4w9WgXcQ', 'maxres');
	 * console.log(thumbnailUrl); // 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
	 */
	static getThumbnailUrl(
		videoId: string,
		quality: keyof ThumbnailQuality = 'maxres'
	): string {
		const qualities: ThumbnailQuality = {
			default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
			medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
			high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
			standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
			maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
		};
		return qualities[quality];
	}

	/**
	 * Checks if a URL is a valid YouTube URL
	 * @param url - The URL to check
	 * @returns True if the URL is a YouTube URL, false otherwise
	 * @example
	 * const isYoutube = YouTubeService.isYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ');
	 * console.log(isYoutube); // true
	 */
	static isYouTubeUrl(url: string): boolean {
		return (
			url.startsWith('https://www.youtube.com/') ||
			url.startsWith('https://youtu.be/')
		);
	}

	/**
	 * Fetches and processes a YouTube video transcript
	 * @param url - Full YouTube video URL
	 * @param langCode - Language code for caption track (default: 'en')
	 * @returns Promise containing video metadata and transcript
	 * @throws Error if transcript cannot be fetched or processed
	 */
	async fetchTranscript(
		url: string,
		langCode = 'en'
	): Promise<TranscriptResponse> {
		try {
			// Extract video ID from URL
			const videoId = this.extractMatch(url, VIDEO_ID_REGEX);
			if (!videoId) throw new Error('Invalid YouTube URL');

			// Fetch the video page content to extract metadata
			// This part remains as yt-transcript-ts doesn't provide video title, author, etc.
			const videoPageBody = await request(url);
			const title = this.extractMatch(videoPageBody, TITLE_REGEX);
			const author = this.extractMatch(videoPageBody, AUTHOR_REGEX);
			const channelId = this.extractMatch(
				videoPageBody,
				CHANNEL_ID_REGEX
			);

			// Fetch transcript using yt-transcript-ts via the adapter
			const transcript = await this.ytApi.fetchTranscript(videoId, { lang: langCode });

			// Adapt snippets to TranscriptLine format
			const lines: TranscriptLine[] = transcript.snippets.map(
				(snippet: TranscriptSnippet) => ({
					text: this.decodeHTML(snippet.text), // Assuming decodeHTML is still needed
					duration: snippet.duration * 1000, // Convert seconds to milliseconds
					offset: snippet.start * 1000, // Convert seconds to milliseconds
				})
			);

			const response = {
				url,
				videoId,
				title: this.decodeHTML(title || 'Unknown'),
				author: this.decodeHTML(author || 'Unknown'),
				channelUrl: channelId
					? `https://www.youtube.com/channel/${channelId}`
					: '',
				lines,
			};

			return response;
		} catch (error) {
			if (error instanceof CouldNotRetrieveTranscript) {
				// Handle specific reasons if necessary, e.g., NoTranscriptFound
				if (error.reason === CouldNotRetrieveTranscriptReason.NoTranscriptFound ||
				    error.reason === CouldNotRetrieveTranscriptReason.TranscriptsDisabled) {
					// Fetch metadata and return with empty lines, as before
					// This part might be repetitive if videoId, title, etc., are already fetched
					// and could be refactored if these are available outside the try block.
					// For now, keeping it simple:
					const videoIdFromError = this.extractMatch(url, VIDEO_ID_REGEX); // Re-extract or pass videoId
					if (!videoIdFromError) throw new Error('Invalid YouTube URL on error handling');

					// Re-fetch metadata as it's inside the try block scope
					// Consider moving metadata fetching outside try if transcript fetching is the main concern
					const videoPageBody = await request(url);
					const title = this.extractMatch(videoPageBody, TITLE_REGEX);
					const author = this.extractMatch(videoPageBody, AUTHOR_REGEX);
					const channelId = this.extractMatch(videoPageBody, CHANNEL_ID_REGEX);

					console.warn(`Transcript not available for ${videoIdFromError}: ${error.message}`);
					return {
						url,
						videoId: videoIdFromError,
						title: this.decodeHTML(title || 'Unknown'),
						author: this.decodeHTML(author || 'Unknown'),
						channelUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : '',
						lines: [],
					};
				}
			}
			// For other errors or if not a CouldNotRetrieveTranscript error, rethrow or wrap
			console.error('Failed to fetch transcript:', error);
			throw new Error(`Failed to fetch transcript: ${error.message || error}`);
		}
	}

	/**
	 * Extracts the first match of a regex pattern from a string
	 * @param text - The text to search within
	 * @param regex - The regex pattern to match
	 * @returns The first match or null if not found
	 * @example
	 * const match = this.extractMatch('Hello World', /Hello/);
	 * console.log(match); // 'Hello'
	 */
	private extractMatch(text: string, regex: RegExp): string | null | '' {
		const match = text.match(regex);
		return match ? match[1] : null;
	}

	/**
	 * Decodes HTML entities in a text string
	 *
	 * @param text - Text string with HTML entities
	 * @returns Decoded text string
	 * @example
	 * const decodedText = this.decodeHTML('Hello &amp; World');
	 * console.log(decodedText); // 'Hello & World'
	 */
	private decodeHTML(text: string): string {
		return text
			.replace(/&#39;/g, "'")
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>');
	}
}
