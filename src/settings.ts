import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { waitForAI } from '@obsidian-ai-providers/sdk';

import { YouTubeSummarizerPlugin } from './main';

/**
 * Represents the settings tab for the YouTube Summarizer Plugin.
 * This class extends the PluginSettingTab and provides a user interface
 * for configuring the plugin's settings.
 */
export class SettingsTab extends PluginSettingTab {
	plugin: YouTubeSummarizerPlugin;
	selectedProvider: string; // To store the ID of the selected provider

	/**
	 * Creates an instance of SettingsTab.
	 * @param app - The Obsidian app instance.
	 * @param plugin - The YouTube Summarizer Plugin instance.
	 */
	constructor(app: App, plugin: YouTubeSummarizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		// Initialize selectedProvider, perhaps from plugin settings if you store it
		this.selectedProvider = this.plugin.settings.selectedProvider || '';
	}

	/**
	 * Displays the settings tab UI.
	 * This method is responsible for rendering the settings controls
	 * and handling user interactions.
	 */
	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		// AI Provider selection
		const aiResolver = await waitForAI();
		if (!aiResolver) {
			new Setting(containerEl)
				.setName('AI Providers Plugin Not Found')
				.setDesc('Please install and enable the AI Providers plugin to configure an AI provider.');
			return;
		}
		const aiProviders = await aiResolver.promise;

		const providers = aiProviders.providers.reduce(
			(
				acc: Record<string, string>,
				provider: { id: string; name: string; model?: string }
			) => ({
				...acc,
				[provider.id]: provider.model
					? [provider.name, provider.model].join(' ~ ')
					: provider.name,
			}),
			{
				'': 'Select a provider...', // Default empty option
			}
		);

		if (Object.keys(providers).length === 1 && providers[''] === 'Select a provider...') {
			new Setting(containerEl)
				.setName('No AI Providers Found')
				.setDesc(
					'No AI providers configured in the AI Providers plugin. Please configure one there first.'
				);
		} else {
			new Setting(containerEl)
				.setName('Select AI Provider')
				.setDesc('Choose an AI provider for summarization.')
				.setClass('ai-providers-select') // Optional: for styling
				.addDropdown(dropdown =>
					dropdown
						.addOptions(providers)
						.setValue(this.selectedProvider)
						.onChange(async (value) => {
							this.selectedProvider = value;
							// Save the selected provider ID to plugin settings
							await this.plugin.updateSettings({ selectedProvider: value });
							// Potentially refresh or update other parts of the settings tab if needed
							// await this.display();
						})
				);
		}

		// Setting for Summary Prompt
		new Setting(containerEl)
			.setName('Summary prompt')
			.setDesc('Customize the prompt for generating summaries')
			.addTextArea((text) =>
				text
					.setPlaceholder('Enter custom prompt')
					.setValue(this.plugin.settings.customPrompt)
					.onChange(async (value) => {
						await this.plugin.updateSettings({
							customPrompt: value,
						});
					})
					.then(textArea => {
						// Set width to 50% of container
						textArea.inputEl.style.width = '500px';
						// Set height to accommodate approximately 10 lines
						textArea.inputEl.style.height = '200px';
					})
			);

		// Button to reset settings
		new Setting(containerEl)
			.setName('Reset settings')
			.setDesc('Reset all settings to default values')
			.addButton((button) =>
				button
					.setButtonText('Reset')
					.setCta()
					.onClick(async () => {
						await this.plugin.updateSettings({
							...DEFAULT_SETTINGS,
						});
						new Notice('Settings reset to default values');
						this.display();
					})
			);
	}
}
