export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
	role: ChatRole;
	content: string;
};

export type AnalysisClientOptions = {
	apiKey: string;
	model: string;
	baseUrl?: string;
	signal?: AbortSignal;
	temperature?: number;
	maxTokens?: number;
};

export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const CHAT_COMPLETIONS_PATH = 'chat/completions';

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildChatCompletionsUrl(baseUrl: string): URL {
	const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
	return new URL(CHAT_COMPLETIONS_PATH, normalized);
}

function readApiError(body: unknown): string | undefined {
	if (!isObject(body) || !isObject(body.error)) {
		return undefined;
	}

	const message = body.error.message;

	if (typeof message === 'string' && message.length > 0) {
		return message;
	}

	return 'DeepSeek 接口返回错误';
}

function readAssistantContent(body: unknown): string {
	if (!isObject(body)) {
		throw new Error('DeepSeek 响应不是 JSON 对象');
	}

	const choices = body.choices;

	if (!Array.isArray(choices) || choices.length === 0) {
		throw new Error('DeepSeek 响应缺少 choices');
	}

	const choice = choices[0];

	if (!isObject(choice) || !isObject(choice.message)) {
		throw new Error('DeepSeek 响应缺少 message');
	}

	if (choice.finish_reason === 'length') {
		throw new Error('DeepSeek 输出被截断，请减少输入或重试');
	}

	if (choice.finish_reason === 'content_filter') {
		throw new Error('DeepSeek 输出被内容过滤，请调整输入或重试');
	}

	const content = choice.message.content;

	if (typeof content !== 'string' || content.trim().length === 0) {
		throw new Error('DeepSeek 响应内容为空');
	}

	return content;
}

/**
 * 调用 DeepSeek 兼容的 Chat Completions 接口，返回 assistant 的原始文本。
 * 结果解析由 parse.ts 负责。
 */
export async function requestAnalysis(
	messages: ChatMessage[],
	options: AnalysisClientOptions,
): Promise<string> {
	if (messages.length === 0) {
		throw new Error('分析消息不能为空');
	}

	if (options.apiKey.trim().length === 0) {
		throw new Error('DeepSeek API Key 不能为空');
	}

	if (options.model.trim().length === 0) {
		throw new Error('DeepSeek 模型不能为空');
	}

	if (options.signal?.aborted === true) {
		throw new DOMException('请求已取消', 'AbortError');
	}

	const requestBody: Record<string, unknown> = {
		model: options.model,
		messages,
		stream: false,
		response_format: { type: 'json_object' },
	};

	if (options.temperature !== undefined) {
		requestBody.temperature = options.temperature;
	}

	if (options.maxTokens !== undefined) {
		requestBody.max_tokens = options.maxTokens;
	}

	const endpoint = buildChatCompletionsUrl(
		options.baseUrl ?? DEFAULT_DEEPSEEK_BASE_URL,
	);

	let response: Response;

	try {
		response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
			signal: options.signal,
		});
	} catch (error) {
		if (error instanceof TypeError) {
			throw new Error(
				`无法直连 ${endpoint.origin}：浏览器跨域（CORS）被拦截或网络不可达，请改用支持浏览器直连的厂商或配置代理。`,
				{ cause: error },
			);
		}

		throw error;
	}

	let body: unknown;
	let isJson = true;

	try {
		body = await response.json();
	} catch {
		isJson = false;
	}

	const apiError = readApiError(body);

	if (apiError !== undefined) {
		throw new Error(apiError);
	}

	if (!response.ok) {
		throw new Error(`DeepSeek HTTP 请求失败：${response.status}`);
	}

	if (!isJson) {
		throw new Error('DeepSeek 返回的不是 JSON');
	}

	return readAssistantContent(body);
}
