import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { PluginSettings, TranscriptResponse } from './types';
import { initAI, waitForAI } from '@obsidian-ai-providers/sdk';

import { SettingsTab } from './settings';
import { StorageService } from './services/storage';
import { YouTubeService } from './services/youtube';
import { YouTubeURLModal } from './modals/youtube-url';
import { PromptService } from './services/prompt';

/**
 * Represents the YouTube Summarizer Plugin.
 * This class extends the Plugin class and provides the main functionality
 * for the YouTube Summarizer Plugin.
 */
export class YouTubeSummarizerPlugin extends Plugin {
	settings: PluginSettings;
	private storageService: StorageService;
	private youtubeService: YouTubeService;
	private promptService: PromptService;
	private isProcessing = false;

	/**
	 * Called when the plugin is loaded.
	 */
	async onload() {
		initAI(this.app, this, async () => {
			try {
				// Initialize services
				await this.initializeServices();

				// Add settings tab
				this.addSettingTab(new SettingsTab(this.app, this));

				// Register commands
				this.registerCommands();
			} catch (error) {
				new Notice(`Error: ${error.message}`);
			}
		});
	}

	/**
	 * Initializes the plugin services.
	 * This method creates instances of the required services and loads the plugin settings.
	 * @returns {Promise<void>} A promise that resolves when the services are initialized.
	 * @throws {Error} Throws an error if the services cannot be initialized.
	 */
	private async initializeServices(): Promise<void> {
		// Initialize storage service
		this.storageService = new StorageService(this);
		await this.storageService.loadData();

		// Initialize youtube service
		this.youtubeService = new YouTubeService();

		// Load settings
		this.settings = await this.storageService.getSettings();

		// Initialize prompt service
		this.promptService = new PromptService(this.settings.customPrompt);
	}

	/**
	 * Registers the plugin commands.
	 * This method adds the commands to the Obsidian app.
	 * @returns {void}
	 */
	private registerCommands(): void {
		// Register the summarize command
		// Command to summarize a YouTube video from URL
		this.addCommand({
			id: 'summarize-youtube-video',
			name: 'Summarize youtube video',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					const selectedText = editor.getSelection().trim();
					if (
						selectedText &&
						YouTubeService.isYouTubeUrl(selectedText)
					) {
						await this.summarizeVideo(selectedText, editor);
					} else if (selectedText) {
						new Notice('Selected text is not a valid YouTube URL');
					} else {
						new YouTubeURLModal(this.app, async (url) => {
							await this.summarizeVideo(url, editor);
						}).open();
					}
				} catch (error) {
					new Notice(`Failed to process video: ${error.message}`);
				}
			},
		});

		// Command to summarize a YouTube video with custom prompt
		this.addCommand({
			id: 'summarize-youtube-video-prompt',
			name: 'Summarize youtube video (with prompt)',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					const selectedText = editor.getSelection().trim();
					if (
						selectedText &&
						YouTubeService.isYouTubeUrl(selectedText)
					) {
						await this.summarizeVideo(selectedText, editor);
					} else if (selectedText) {
						new Notice('Selected text is not a valid YouTube URL');
					} else {
						new YouTubeURLModal(this.app, async (url) => {
							await this.summarizeVideo(url, editor);
						}).open();
					}
				} catch (error) {
					new Notice(`Failed to process video: ${error.message}`);
				}
			},
		});
	}

	/**
	 * Updates the plugin settings.
	 * This method updates the settings in the storage service and reinitializes the Gemini service.
	 * @param settings The new settings to be applied.
	 * @returns {Promise<void>} A promise that resolves when the settings are updated.
	 */
	async updateSettings(settings: Partial<PluginSettings>): Promise<void> {
		// Update settings in storage service
		await this.storageService.updateSettings(settings);
		this.settings = await this.storageService.getSettings();

		// Reinitialize the prompt service
		this.promptService = new PromptService(this.settings.customPrompt);
	}

	/**
	 * Summarizes the YouTube video for the given URL and updates the markdown view with the summary.
	 * @param url - The URL of the YouTube video to summarize.
	 * @param view - The active markdown view where the summary will be inserted.
	 * @returns {Promise<void>} A promise that resolves when the video is summarized.
	 */
	private async summarizeVideo(url: string, editor: Editor): Promise<void> {
		// Check if a video is already being processed
		if (this.isProcessing) {
			new Notice('Already processing a video, please wait...');
			return;
		}

		try {
			this.isProcessing = true;

			const aiResolver = await waitForAI();
			const aiProviders = await aiResolver.promise;

			if (!aiProviders || !aiProviders.providers.length) {
				new Notice(
					'AI Providers plugin not found or no providers configured. Please install and configure the AI Providers plugin.'
				);
				return;
			}

			// TODO: Allow user to select provider if multiple are available
			const provider = aiProviders.providers[0];

			if (!provider) {
				new Notice('No AI provider selected or available.');
				return;
			}

			// Fetch the video transcript
			new Notice('Fetching video transcript...');
			const transcript = await this.youtubeService.fetchTranscript(url);
			const thumbnailUrl = YouTubeService.getThumbnailUrl(
				transcript.videoId
			);

			//Build the prompt for LLM
			const prompt = this.promptService.buildPrompt(transcript.lines.map((line) => line.text).join(' '));

			// Generate the summary using AI Providers SDK
			new Notice('Generating summary...');
			let summaryText = '';
			const chunkHandler = await aiProviders.execute({
				provider,
				prompt,
			});

			chunkHandler.onData((chunk, accumulatedText) => {
				summaryText = accumulatedText;
				// Optionally, update UI with partial results here
			});

			await new Promise<void>((resolve, reject) => {
				chunkHandler.onEnd((fullText) => {
					summaryText = fullText;
					resolve();
				});
				chunkHandler.onError((error) => {
					new Notice(`Error generating summary: ${error.message}`);
					reject(error);
				});
			});

			// Create the summary content
			const summary = this.generateSummary(
				transcript,
				thumbnailUrl,
				url,
				summaryText
			);

			// Insert the summary into the markdown view
			editor.replaceSelection(summary);
			new Notice('Summary generated successfully!');
		} catch (error) {
			new Notice(`Error: ${error.message}`);
		} finally {
			// Reset the processing flag
			this.isProcessing = false;
		}
	}

	/**
	 * Generates a summary string based on the provided transcript, thumbnail URL, video URL, and Gemini summary.
	 *
	 * @param transcript - The transcript response containing the title and author.
	 * @param thumbnailUrl - The URL of the thumbnail image.
	 * @param url - The URL of the video.
	 * @param summaryText - The Gemini response containing the summary, key points, technical terms, and conclusion.
	 * @returns A formatted summary string.
	 */
	private generateSummary(
		transcript: TranscriptResponse,
		thumbnailUrl: string,
		url: string,
		summaryText: string
	): string {
		// Initialize summary parts with title, thumbnail, video link, author, and summary
		const summaryParts = [
			`# ${transcript.title}\n`,
			`![Thumbnail](${thumbnailUrl})\n`,
			`👤 [${transcript.author}](${transcript.channelUrl})  🔗 [Watch video](${url})`,
			summaryText,
		];

		return summaryParts.join('\n');
	}
}

export default YouTubeSummarizerPlugin;
