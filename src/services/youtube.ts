import { request } from 'obsidian';
import { parse } from 'node-html-parser';
import {
	VIDEO_ID_REGEX,
	WATCH_URL,
	INNERTUBE_API_KEY_REGEX,
	INNERTUBE_API_URL,
	INNERTUBE_CONTEXT,
} from '../constants';
import {
	TranscriptResponse,
	TranscriptLine,
	ThumbnailQuality,
} from '../types';

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
	 */
	async fetchTranscript(
		url: string,
		langCode = 'en'
	): Promise<TranscriptResponse> {
		const videoId = this.extractMatch(url, VIDEO_ID_REGEX);
		if (!videoId) throw new Error('Invalid YouTube URL');

		const videoPageBody = await this._fetchVideoHtml(videoId);
		const apiKey = this._extractInnertubeApiKey(videoPageBody, videoId);
		const innertubeData = await this._fetchInnertubeData(videoId, apiKey);

		const captionsJson = this._extractCaptionsJson(innertubeData, videoId);

		const captionTrack = this._findCaptionTrack(captionsJson, langCode);

		const transcriptXml = await request(captionTrack.baseUrl);
		const lines = this._parseTranscript(transcriptXml);

		const { title, author, channelId } = innertubeData.videoDetails;

		return {
			url,
			videoId,
			title: this.decodeHTML(title || 'Unknown'),
			author: this.decodeHTML(author || 'Unknown'),
			channelUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : '',
			lines,
		};
	}

	private async _fetchVideoHtml(videoId: string): Promise<string> {
		const url = `${WATCH_URL}${videoId}`;
		return await request(url);
	}

	private _extractInnertubeApiKey(html: string, videoId: string): string {
		const match = html.match(INNERTUBE_API_KEY_REGEX);
		if (match && match[1]) {
			return match[1];
		}
		throw new Error(`Failed to extract InnerTube API key for video ${videoId}`);
	}

	private async _fetchInnertubeData(videoId: string, apiKey: string): Promise<any> {
		const url = `${INNERTUBE_API_URL}${apiKey}`;
		const response = await request({
			url,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				context: INNERTUBE_CONTEXT,
				videoId,
			}),
		});
		return JSON.parse(response);
	}

	private _extractCaptionsJson(innertubeData: any, videoId: string): any {
		const playabilityStatus = innertubeData?.playabilityStatus?.status;
		if (playabilityStatus === 'LOGIN_REQUIRED') {
			throw new Error(`Age-restricted video: ${videoId}`);
		}
		if (playabilityStatus === 'ERROR') {
			throw new Error(`Video unavailable: ${videoId}`);
		}

		const captions = innertubeData?.captions?.playerCaptionsTracklistRenderer;
		if (!captions || !captions.captionTracks) {
			throw new Error(`Transcripts disabled for video: ${videoId}`);
		}
		return captions;
	}

	private _findCaptionTrack(captionsJson: any, langCode: string): any {
		const captionTracks = captionsJson.captionTracks || [];
		let track = captionTracks.find((t: any) => t.languageCode === langCode && t.kind !== 'asr');
		if (!track) {
			track = captionTracks.find((t: any) => t.languageCode === langCode);
		}
		if (!track) {
			track = captionTracks.find((t: any) => t.languageCode.startsWith(langCode));
		}
		if (!track && captionTracks.length > 0) {
			track = captionTracks[0];
		}

		if (!track) {
			throw new Error(`No suitable transcript found for language: ${langCode}`);
		}

		return track;
	}

	private _parseTranscript(xml: string): TranscriptLine[] {
		const parsedXML = parse(xml);
		return parsedXML.getElementsByTagName('text').map((cue) => ({
			text: this.decodeHTML(cue.textContent),
			duration: parseFloat(cue.attributes.dur) * 1000,
			offset: parseFloat(cue.attributes.start) * 1000,
		}));
	}

	private extractMatch(text: string, regex: RegExp): string | null {
		const match = text.match(regex);
		return match ? match[1] : null;
	}

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