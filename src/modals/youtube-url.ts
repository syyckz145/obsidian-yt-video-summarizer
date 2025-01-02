import { App, Modal, Notice } from "obsidian";

/**
 * A modal dialog for entering a YouTube URL.
 */
export class YouTubeURLModal extends Modal {
	private onSubmit: (url: string) => void;

	/**
	 * Constructs a new YouTubeURLModal.
	 * @param app - The Obsidian app instance.
	 * @param onSubmit - Callback function to handle the submitted URL.
	 */
	constructor(app: App, onSubmit: (url: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	/**
	 * Called when the modal is opened. 
	 * Sets up the modal content.
	 */
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal title
		contentEl.createEl("h2", { text: "Enter YouTube URL" });

		// Add input field for URL
		const inputEl = contentEl.createEl("input", {
			type: "text",
			placeholder: "https://www.youtube.com/watch?v=..."
		});
		inputEl.style.width = "100%";
		inputEl.style.marginBottom = "1em";

		// Add submit and cancel button container
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";

		// Add submit button
		const submitButton = buttonContainer.createEl("button", { text: "Submit" });
		submitButton.style.backgroundColor = "var(--interactive-accent)";
		submitButton.style.color = "white";
		submitButton.addEventListener("click", () => {
			const url = inputEl.value.trim();
			if (url) {
				this.onSubmit(url);
				this.close();
			} else {
				new Notice('Please enter a valid URL');
			}
		});

		// Add cancel button
		const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
		cancelButton.style.backgroundColor = "red";
		cancelButton.style.color = "white";
		cancelButton.addEventListener("click", () => this.close());
	}

	/**
	 * Called when the modal is closed. 
	 * Cleans up the modal content.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
