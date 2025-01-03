import { GeminiResponse, PluginSettings } from 'src/types';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Service for interacting with Gemini AI.
 * This class provides methods for summarizing video transcripts using Gemini AI.
 * It utilizes the GoogleGenerativeAI library to interact with the Gemini API.
 */
export class GeminiService {
	private model: GenerativeModel;

	/**
	 * Creates an instance of GeminiService.
	 * @param settings - The plugin settings.
	 */
	constructor(private settings: PluginSettings) {
		// Initialize the Gemini AI model
		const genAI = new GoogleGenerativeAI(settings.geminiApiKey);

		// Create the generative model instance
		this.model = genAI.getGenerativeModel({
			model: settings.selectedModel,
			generationConfig: {
				maxOutputTokens: settings.maxTokens,
				temperature: settings.temperature
			}
		});
	}

	/**
	 * Summarizes video transcript using Gemini AI
	 * @param transcript - Video transcript text
	 * @returns Structured summary response
	 */
	async summarize(transcript: string): Promise<GeminiResponse> {
		// Build the prompt for Gemini AI
		const prompt = this.buildPrompt(transcript);
		try {
			// Generate content using Gemini
			const result = await this.model.generateContent(prompt);
			const response = await result.response;
			// Parse the response
			return this.parseResponse(response.text());
		} catch (error) {
			throw new Error(`Gemini API error: ${error.message}`);
		}
	}

	/**
	 * Builds the prompt for Gemini AI based on the video transcript
	 * @param transcript - Video transcript text
	 * @returns Prompt string for Gemini AI
	 * @example
	 * const prompt = this.buildPrompt('This is a sample transcript.');
	 * console.log(prompt); // 'Custom prompt\n\nTranscript:\nThis is a sample transcript.\n\nPlease provide the response in the following JSON format: ...'
	 */
	private buildPrompt(transcript: string): string {
		return `${this.settings.customPrompt}\n\nTranscript:\n${transcript}\n\nPlease provide the response in the following JSON format:
        {
   			"summary": "Brief summary of main points",
            "keyPoints": ["point1", "point2", ...],
            "technicalTerms": [{"term": "term1", "explanation": "explanation1"}, ...],
            "conclusion": "brief conclusion"
        }`;
	}

	/**
	 * Parses the Gemini AI response into a structured format
	 * @param text - Raw response text from Gemini AI
	 * @returns Structured summary response
	 * @example
	 * const response = this.parseResponse('{"summary": "Summary", "keyPoints": ["point1", "point2"], "technicalTerms": [], "conclusion": "Conclusion"}');
	 * console.log(response); // { summary: 'Summary', keyPoints: ['point1', 'point2'], technicalTerms: [], conclusion: 'Conclusion' }
	 */
	private parseResponse(text: string): GeminiResponse {
		try {
			// Remove any leading/trailing whitespace and backticks
			const cleanText = text.replace(/```json\s*|\s*```/g, '')  // Remove code block markers
            .replace(/^\s+|\s+$/g, '')          // Trim whitespace
            .replace(/\n\s*\n/g, '\n');         // Remove extra newlines

			// Parse the cleaned text
			const parsed = JSON.parse(cleanText);
            
			// Validate response structure
			if (!this.isValidResponse(parsed)) {
				throw new Error('Invalid response structure');
			}
            
			return parsed;
		} catch (error) {
			console.error('Response parsing error:', error, '\nRaw text:', text);
			return {
				summary: 'Failed to parse response. Please try again.',
				keyPoints: [],
				technicalTerms: [],
				conclusion: ''
			};
		}
	}

	/**
	 * Validates the structure of the Gemini AI response
	 * @param response - The parsed response object
	 * @returns True if the response is valid, false otherwise
	 * @example
	 * const response = { summary: 'Summary', keyPoints: ['point1', 'point2'], technicalTerms: [], conclusion: 'Conclusion' };
	 * console.log(this.isValidResponse(response)); // true
	 */
	private isValidResponse(response: any): boolean {
		return (
			response &&
			typeof response.summary === 'string' &&
			Array.isArray(response.keyPoints) &&
			Array.isArray(response.technicalTerms) &&
			typeof response.conclusion === 'string'
		);
	}
}
