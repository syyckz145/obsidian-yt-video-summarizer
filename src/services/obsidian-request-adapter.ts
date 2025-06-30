import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';

// Define a simplified Axios-like interface that yt-transcript-ts likely uses
interface AxiosLikeError extends Error {
	isAxiosError?: boolean;
	config?: any;
	code?: string | null;
	request?: any;
	response?: AxiosLikeResponse;
}

interface AxiosLikeResponse {
	data: any;
	status: number;
	statusText: string;
	headers: Record<string, string | string[] | number | boolean | null>;
	config: any;
	request?: any;
}

interface AxiosLikeInstance {
	get<T = any, R = AxiosLikeResponse<T>>(url: string, config?: any): Promise<R>;
	// We can add post, put, etc. if needed by yt-transcript-ts, but it likely only uses get
}

interface AxiosLikeStatic {
	create(config?: any): AxiosLikeInstance;
}

class ObsidianRequestAdapter implements AxiosLikeInstance {
	private defaultConfig: any;

	constructor(config?: any) {
		this.defaultConfig = config || {};
	}

	async get<T = any, R = AxiosLikeResponse<T>>(url: string, config?: any): Promise<R> {
		const requestConfig = { ...this.defaultConfig, ...config };
		const params: RequestUrlParam = {
			url,
			method: 'GET',
			headers: { ...this.defaultConfig.headers, ...requestConfig.headers },
			// body?: string | ArrayBuffer;
			// contentType?: string;
			// withCredentials?: boolean;
			// throw?: boolean; // Defaults to true - throws on status >= 400
		};

		if (requestConfig.timeout) {
			// Obsidian's requestUrl doesn't have a direct timeout,
			// so this would need to be implemented with a Promise.race if critical.
			// For now, we'll ignore it as yt-transcript-ts might have its own internal timeout handling
			// or the default Obsidian timeout might be sufficient.
			console.warn('ObsidianRequestAdapter: axios timeout option is not fully supported by requestUrl.');
		}

		// yt-transcript-ts might expect JSON by default
		if (requestConfig.responseType === 'json' && !params.headers?.Accept) {
			if(!params.headers) params.headers = {};
			params.headers['Accept'] = 'application/json, text/plain, */*';
		}


		try {
			const response: RequestUrlResponse = await requestUrl(params);

			// Transform Obsidian's RequestUrlResponse to AxiosLikeResponse
			const axiosResponse: AxiosLikeResponse = {
				data: this.parseResponseData(response, requestConfig.responseType),
				status: response.status,
				statusText: this.getStatusText(response.status), // requestUrl doesn't provide statusText
				headers: response.headers,
				config: requestConfig,
				request: params, // Or some other representation of the request
			};
			return axiosResponse as R;
		} catch (error) {
			// Try to make the error look like an Axios error
			const axiosError: AxiosLikeError = new Error(error.message);
			axiosError.isAxiosError = true;
			axiosError.config = requestConfig;

			if (error.status) { // If it's an HTTPError from requestUrl
				axiosError.response = {
					data: error.body !== undefined ? error.body : null, // Attempt to get body if available
					status: error.status,
					statusText: this.getStatusText(error.status),
					headers: error.headers || {},
					config: requestConfig,
				};
			}
			// console.error('ObsidianRequestAdapter Error:', error, 'Transformed to:', axiosError);
			throw axiosError;
		}
	}

	private parseResponseData(response: RequestUrlResponse, responseType?: string): any {
		// yt-transcript-ts seems to expect parsed JSON if the content type indicates JSON.
		// Obsidian's requestUrl.json is already parsed.
		// If it's not json, it's text.
		const contentType = response.headers['content-type'];
		if (responseType === 'json' || (contentType && contentType.includes('application/json'))) {
			return response.json;
		}
		return response.text;
	}

	private getStatusText(status: number): string {
		// Common HTTP status texts (simplified)
		const statusTexts: Record<number, string> = {
			200: 'OK',
			201: 'Created',
			204: 'No Content',
			400: 'Bad Request',
			401: 'Unauthorized',
			403: 'Forbidden',
			404: 'Not Found',
			500: 'Internal Server Error',
		};
		return statusTexts[status] || 'Unknown Status';
	}
}

// This is what will be imported and used by YouTubeService
export const ObsidianAxiosAdapter: AxiosLikeStatic = {
	create(config?: any): AxiosLikeInstance {
		return new ObsidianRequestAdapter(config);
	},
};
