import { MarkdownView, Notice, Plugin } from 'obsidian';

import { PluginSettings } from './types';
import { SettingsTab } from './settings';
import { StorageService } from './services/storage';

/**
 * Represents the YouTube Summarizer Plugin.
 * This class extends the Plugin class and provides the main functionality
 * for the YouTube Summarizer Plugin.
 */
export class YouTubeSummarizerPlugin extends Plugin {
	settings: PluginSettings;
    private storageService: StorageService;
    private isProcessing = false;

	/**
	 * Called when the plugin is loaded.
	 */
	async onload() {
		try {
			// Initialize services
			await this.initializeServices();

			// Add settings tab
			this.addSettingTab(new SettingsTab(this.app, this));

			// Register commands
			this.registerCommands();
		} catch (error) { 
			new Notice(`Error: ${error.message}`);
			console.log(error);
		}

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
	}
	
	/**
	 * Registers the plugin commands.
	 * This method adds the commands to the Obsidian app.
	 * @returns {void}
	 */
	private registerCommands(): void {
		// Register the summarize command 
        this.addCommand({
            id: 'summarize-youtube-video',
            name: 'Summarize YouTube Video',
			callback: () => this.handleSummarizeCommand()
        });

		// Register the summarize command with prompt
        this.addCommand({
            id: 'summarize-youtube-video-prompt',
            name: 'Summarize YouTube Video (Prompt)',
            callback: () => this.handleSummarizeCommandWithPrompt()
        });
	}

	async updateSettings(settings: Partial<PluginSettings>): Promise<void> {
		// Update settings in storage service
		await this.storageService.updateSettings(settings);
		this.settings = await this.storageService.getSettings();
   }

	private async handleSummarizeCommand(): Promise<void> {
		// Get the active markdown view
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('No active markdown view');
			return;
		}

		// Get the selected text (YouTube URL)
		const selection = activeView.editor.getSelection().trim();
		if (!selection) {
			new Notice('Please select a YouTube URL');
			return;
		}
	}

	private async handleSummarizeCommandWithPrompt(): Promise<void> {
		// Get the active markdown view
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('No active markdown view');
			return;
		}
	}

}

export default YouTubeSummarizerPlugin;
