import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_DEEPSEEK_BASE_URL,
	requestAnalysis,
	type ChatMessage,
} from './client';

const messages: ChatMessage[] = [
	{ role: 'system', content: 'system prompt' },
	{ role: 'user', content: 'user prompt' },
];

function mockJsonResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as unknown as Response;
}

function mockInvalidJsonResponse(status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => {
			throw new SyntaxError('invalid json');
		},
	} as unknown as Response;
}

function mockChatResponse(content: string, finishReason = 'stop'): Response {
	return mockJsonResponse({
		choices: [
			{
				message: { role: 'assistant', content },
				finish_reason: finishReason,
			},
		],
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('requestAnalysis', () => {
	it('发送 DeepSeek 兼容的 Chat Completions 请求并返回 content', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockChatResponse('{"summary":"ok"}'),
		);

		const content = await requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
			baseUrl: 'https://api.example.com/v1',
			temperature: 0.3,
			maxTokens: 512,
		});

		expect(content).toBe('{"summary":"ok"}');

		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('https://api.example.com/v1/chat/completions');
		expect(init).toMatchObject({
			method: 'POST',
			headers: {
				Authorization: 'Bearer sk-test',
				'Content-Type': 'application/json',
			},
		});

		expect(JSON.parse(String(init?.body))).toStrictEqual({
			model: 'deepseek-chat',
			messages,
			stream: false,
			response_format: { type: 'json_object' },
			temperature: 0.3,
			max_tokens: 512,
		});
	});

	it('使用默认 DeepSeek 地址', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockChatResponse('{"summary":"ok"}'),
		);

		await requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		});

		expect(String(fetchMock.mock.calls[0][0]))
			.toBe(`${DEFAULT_DEEPSEEK_BASE_URL}/chat/completions`);
	});

	it('优先抛出 DeepSeek 错误信封中的 message', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockJsonResponse({ error: { message: 'Invalid API key' } }, 401),
		);

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('Invalid API key');
	});

	it('非 2xx 且响应不是 JSON 时报告 HTTP 状态', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockInvalidJsonResponse(500),
		);

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('DeepSeek HTTP 请求失败：500');
	});

	it('2xx 但响应不是 JSON 时报告格式错误', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockInvalidJsonResponse(200),
		);

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('DeepSeek 返回的不是 JSON');
	});

	it('拒绝缺少 choices 的响应', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockJsonResponse({ choices: [] }),
		);

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('DeepSeek 响应缺少 choices');
	});

	it('拒绝空 content', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockChatResponse('   '),
		);

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('DeepSeek 响应内容为空');
	});

	it('拒绝被截断的输出', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockChatResponse('{"summary":"ok"}', 'length'),
		);

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('DeepSeek 输出被截断');
	});

	it('请求前已取消时抛出 AbortError 且不发起 fetch', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch');
		const controller = new AbortController();
		controller.abort();

		await expect(requestAnalysis(messages, {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
			signal: controller.signal,
		})).rejects.toMatchObject({ name: 'AbortError' });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('拒绝空消息和空 API Key', async () => {
		await expect(requestAnalysis([], {
			apiKey: 'sk-test',
			model: 'deepseek-chat',
		})).rejects.toThrow('分析消息不能为空');

		await expect(requestAnalysis(messages, {
			apiKey: '   ',
			model: 'deepseek-chat',
		})).rejects.toThrow('DeepSeek API Key 不能为空');
	});
});
