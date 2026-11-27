export type AIProviderId = 'deepseek' | 'zhipu'

export type AIModel = {
	id: string
	name: string
}

export type AIProvider = {
	id: AIProviderId
	name: string
	baseUrl: string
	models: AIModel[]
	note?: string
}

export type AIConfig = {
	providerId: AIProviderId
	apiKey: string
	model: string
	/** 留空表示使用厂商默认地址；填代理地址可绕开浏览器 CORS 限制 */
	baseUrl?: string
}

export const AI_PROVIDERS: AIProvider[] = [
	{
		id: 'deepseek',
		name: 'DeepSeek',
		baseUrl: 'https://api.deepseek.com',
		models: [
			{ id: 'deepseek-chat', name: 'DeepSeek Chat' },
			{ id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
		],
	},
	{
		id: 'zhipu',
		name: '智谱 GLM',
		baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
		models: [
			{ id: 'glm-4-flash', name: 'GLM-4-Flash（免费）' },
			{ id: 'glm-4-flash-250414', name: 'GLM-4-Flash-250414（免费）' },
			{ id: 'glm-4.7-flash', name: 'GLM-4.7-Flash（免费）' },
			{ id: 'glm-4.6', name: 'GLM-4.6' },
			{ id: 'glm-4.7', name: 'GLM-4.7' },
		],
		note: '智谱的对话接口不接受浏览器跨域请求，直连时测试连接可用，但生成分析会失败；需要把 Base URL 指向自建代理。',
	},
]

export const DEFAULT_PROVIDER_ID: AIProviderId = 'deepseek'

const STORAGE_KEY = 'ai-coach:ai-config'

export function getProvider(providerId: string): AIProvider | undefined {
	return AI_PROVIDERS.find((provider) => provider.id === providerId)
}

export function getModels(providerId: string): AIModel[] {
	return getProvider(providerId)?.models ?? []
}

export function resolveBaseUrl(config: AIConfig): string {
	const custom = config.baseUrl?.trim()

	if (custom !== undefined && custom !== '') {
		return custom.replace(/\/$/, '')
	}

	return getProvider(config.providerId)?.baseUrl ?? ''
}

export function normalizeAIConfig(input: Partial<AIConfig>): AIConfig {
	const provider = getProvider(input.providerId ?? DEFAULT_PROVIDER_ID) ??
		getProvider(DEFAULT_PROVIDER_ID)!
	const modelList = provider.models
	const requestedModel = input.model?.trim() ?? ''
	const model = requestedModel !== ''
		? requestedModel
		: modelList[0]?.id ?? ''
	const baseUrl = input.baseUrl?.trim() ?? ''

	const config: AIConfig = {
		providerId: provider.id,
		apiKey: input.apiKey?.trim() ?? '',
		model,
	}

	if (baseUrl !== '') {
		config.baseUrl = baseUrl
	}

	return config
}

export function loadAIConfig(): AIConfig {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)

		if (raw === null) {
			return normalizeAIConfig({})
		}

		return normalizeAIConfig(JSON.parse(raw) as Partial<AIConfig>)
	} catch {
		return normalizeAIConfig({})
	}
}

export function saveAIConfig(config: AIConfig): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAIConfig(config)))
}

export function maskApiKey(apiKey: string): string {
	const trimmed = apiKey.trim()

	if (trimmed === '') {
		return '未配置'
	}

	if (trimmed.length <= 8) {
		return '*'.repeat(trimmed.length)
	}

	return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

export type ConnectionTestResult = {
	ok: boolean
	latencyMs: number
	message: string
}

function authHeaders(apiKey: string): Record<string, string> {
	const headers: Record<string, string> = {}

	if (apiKey !== '') {
		headers.Authorization = `Bearer ${apiKey}`
	}

	return headers
}

async function readErrorMessage(response: Response): Promise<string> {
	const text = await response.text().catch(() => '')
	let detail = text.slice(0, 200)

	try {
		const body = JSON.parse(text) as unknown

		if (typeof body === 'object' && body !== null) {
			const record = body as Record<string, unknown>
			const error = record.error

			if (typeof error === 'object' && error !== null) {
				const message = (error as Record<string, unknown>).message
				if (typeof message === 'string' && message !== '') {
					detail = message
				}
			} else if (typeof record.message === 'string' && record.message !== '') {
				detail = record.message
			}
		}
	} catch {
		// 保留原始文本
	}

	return `HTTP ${response.status}${detail === '' ? '' : `：${detail}`}`
}

/**
 * 用 /models 端点测试 API Key 与网络连通性。
 * 只验证列举模型，不发送对话请求——智谱的对话端点不允许浏览器跨域。
 */
export async function testConnection(
	config: AIConfig,
): Promise<ConnectionTestResult> {
	const baseUrl = resolveBaseUrl(config)
	const startedAt = Date.now()

	try {
		const response = await fetch(`${baseUrl}/models`, {
			headers: authHeaders(config.apiKey),
		})
		const latencyMs = Date.now() - startedAt

		if (!response.ok) {
			return { ok: false, latencyMs, message: await readErrorMessage(response) }
		}

		const body = (await response.json()) as unknown
		const models = typeof body === 'object' && body !== null && Array.isArray(
			(body as Record<string, unknown>).data,
		)
			? (body as { data: unknown[] }).data.length
			: 0

		return {
			ok: true,
			latencyMs,
			message: models > 0 ? `连接成功，可用模型 ${models} 个` : '连接成功',
		}
	} catch (error) {
		const latencyMs = Date.now() - startedAt

		if (error instanceof TypeError) {
			return {
				ok: false,
				latencyMs,
				message: `无法连接 ${baseUrl}：跨域被拦截或网络不可达。`,
			}
		}

		return {
			ok: false,
			latencyMs,
			message: error instanceof Error ? error.message : String(error),
		}
	}
}
