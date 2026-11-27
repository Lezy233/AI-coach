import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_PROVIDERS,
  DEFAULT_PROVIDER_ID,
  getModels,
  getProvider,
  maskApiKey,
  normalizeAIConfig,
  resolveBaseUrl,
  testConnection,
} from './ai-providers'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('provider catalog', () => {
  it('只保留 DeepSeek 与智谱 GLM', () => {
    expect(AI_PROVIDERS.map((provider) => provider.id)).toStrictEqual([
      'deepseek',
      'zhipu',
    ])
    expect(getProvider('deepseek')?.name).toBe('DeepSeek')
    expect(getProvider('zhipu')?.name).toBe('智谱 GLM')
    expect(getProvider('unknown')).toBeUndefined()
  })

  it('GLM 模型列表包含免费的 flash 型号', () => {
    const ids = getModels('zhipu').map((model) => model.id)

    expect(ids).toContain('glm-4-flash')
    expect(ids).toContain('glm-4.7-flash')
  })

  it('DeepSeek 默认使用官方地址', () => {
    expect(resolveBaseUrl(normalizeAIConfig({}))).toBe('https://api.deepseek.com')
  })
})

describe('normalizeAIConfig', () => {
  it('补全默认服务商与模型', () => {
    expect(normalizeAIConfig({ apiKey: '  sk-test ' })).toStrictEqual({
      providerId: DEFAULT_PROVIDER_ID,
      apiKey: 'sk-test',
      model: 'deepseek-chat',
    })
  })

  it('未知服务商回退到默认值', () => {
    expect(normalizeAIConfig({ providerId: 'openai' as never }).providerId)
      .toBe(DEFAULT_PROVIDER_ID)
  })

  it('保留自定义 Base URL 并去掉末尾斜杠', () => {
    expect(resolveBaseUrl(normalizeAIConfig({
      providerId: 'zhipu',
      apiKey: 'sk-test',
      model: 'glm-4-flash',
      baseUrl: 'https://proxy.example.com/v4/',
    }))).toBe('https://proxy.example.com/v4')
  })

  it('空白 Base URL 视为未设置', () => {
    expect(normalizeAIConfig({ baseUrl: '   ' }).baseUrl).toBeUndefined()
  })
})

describe('maskApiKey', () => {
  it('脱敏展示', () => {
    expect(maskApiKey('')).toBe('未配置')
    expect(maskApiKey('short')).toBe('*****')
    expect(maskApiKey('sk-1234567890abcd')).toBe('sk-1…abcd')
  })
})

describe('testConnection', () => {
  it('用 /models 校验 API Key 且只发送 Authorization', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }] }),
    )

    const result = await testConnection(normalizeAIConfig({ apiKey: 'sk-test' }))

    expect(result).toMatchObject({
      ok: true,
      message: '连接成功，可用模型 2 个',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.deepseek.com/models')
    expect(init?.headers).toStrictEqual({ Authorization: 'Bearer sk-test' })
  })

  it('区分 401 错误信息', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { message: 'Authentication Fails' } }, 401),
    )

    await expect(testConnection(normalizeAIConfig({ apiKey: 'sk-bad' })))
      .resolves.toMatchObject({
        ok: false,
        message: 'HTTP 401：Authentication Fails',
      })
  })

  it('网络/CORS 失败给出提示', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(testConnection(normalizeAIConfig({ apiKey: 'sk-test' })))
      .resolves.toMatchObject({
        ok: false,
        message: expect.stringContaining('无法连接'),
      })
  })

  it('智谱使用默认地址', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: [] }),
    )

    await testConnection(normalizeAIConfig({
      providerId: 'zhipu',
      apiKey: 'sk-test',
      model: 'glm-4-flash',
    }))

    expect(String(fetchMock.mock.calls[0][0]))
      .toBe('https://open.bigmodel.cn/api/paas/v4/models')
  })
})
