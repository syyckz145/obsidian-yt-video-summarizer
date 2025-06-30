import {
	AUTHOR_REGEX,
	CHANNEL_ID_REGEX,
	TITLE_REGEX,
	VIDEO_ID_REGEX,
} from 'src/constants';
import {
	ThumbnailQuality,
	// TranscriptLine, // Will be implicitly typed from youtube-transcript
	TranscriptResponse,
} from 'src/types';

import { parse } from 'node-html-parser';
import { request } from 'obsidian';
import { YoutubeTranscript, TranscriptLine } from 'youtube-transcript';

/**
 * Service class for interacting with YouTube videos.
 * Provides methods to fetch video thumbnails and transcripts.
 */
export class YouTubeService {
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

			// Fetch the video page content
			const videoPageBody = await request(url);

			// Extract video metadata from page content
			const title = this.extractMatch(videoPageBody, TITLE_REGEX);
			const author = this.extractMatch(videoPageBody, AUTHOR_REGEX);
			const channelId = this.extractMatch(
				videoPageBody,
				CHANNEL_ID_REGEX
			);

			// Fetch transcript using youtube-transcript library
			const transcriptLines: TranscriptLine[] = await YoutubeTranscript.fetchTranscript(videoId, {
				lang: langCode,
				country: 'US', // Optional: to potentially improve consistency
			});

			// Ensure text is decoded (youtube-transcript might already do this, but doesn't hurt to double-check or apply our decoding)
			const decodedLines = transcriptLines.map(line => ({
				...line,
				text: this.decodeHTML(line.text),
			}));

			const response: TranscriptResponse = {
				url,
				videoId,
				title: this.decodeHTML(title || 'Unknown'),
				author: this.decodeHTML(author || 'Unknown'),
				channelUrl: channelId
					? `https://www.youtube.com/channel/${channelId}`
					: '',
				lines: decodedLines,
			};

			return response;
		} catch (error) {
			if (error instanceof Error) {
				// Check for specific error messages from the library if needed
				if (error.message.includes('No transcript found for video')) {
					throw new Error (`No transcript available for video ID ${videoId} in language '${langCode}'. It might be disabled or not exist.`);
				}
				if (error.message.includes('disabled for this video')) {
					throw new Error (`Transcripts are disabled for video ID ${videoId}.`);
				}
				throw new Error(`Failed to fetch transcript for ${videoId}: ${error.message}`);
			}
			throw new Error(`Failed to fetch transcript for ${videoId}: An unknown error occurred`);
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

	// Removed extractCaptions and parseCaptions methods as they are no longer needed.
	// The youtube-transcript library handles fetching and parsing.

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
