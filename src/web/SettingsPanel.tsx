import { useId, useState } from 'react'
import {
  AI_PROVIDERS,
  getModels,
  getProvider,
  maskApiKey,
  normalizeAIConfig,
  resolveBaseUrl,
  testConnection,
  type AIConfig,
  type ConnectionTestResult,
} from './ai-providers'
import { useSettings } from './hooks/useSettings'

type Feedback = {
  kind: 'idle' | 'success' | 'error'
  message: string
}

type Draft = {
  providerId: AIConfig['providerId']
  apiKey: string
  model: string
  baseUrl: string
}

function toDraft(config: AIConfig): Draft {
  return {
    providerId: config.providerId,
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl ?? '',
  }
}

/**
 * 最简 AI 配置面板：选择服务商 → 填 API Key → 选模型 → 测试连接 → 保存
 * 目前只保留 DeepSeek 与智谱 GLM 两家，未来会增加更多服务商
 * GLM 在 BYOK 模式下无法正常调用，此处只是为了演示多服务商的配置界面
 */
export function SettingsPanel() {
  const { settings, saveConfig } = useSettings()
  const titleId = useId()
  const keyId = useId()
  const baseUrlId = useId()

  const [draft, setDraft] = useState<Draft>(() => toDraft(settings))
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({
    kind: 'idle',
    message: '保存后，AI 分析会使用这里的配置。',
  })

  const provider = getProvider(draft.providerId)
  const models = getModels(draft.providerId)
  const providerName = provider?.name ?? draft.providerId
  const defaultBaseUrl = provider?.baseUrl ?? ''
  const canSave = draft.apiKey.trim() !== '' && draft.model !== ''

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setFeedback({ kind: 'idle', message: '记得点击「保存配置」使其生效。' })
  }

  const handleProviderChange = (providerId: string) => {
    const nextProvider = getProvider(providerId)

    if (nextProvider === undefined) {
      return
    }

    setDraft({
      providerId: nextProvider.id,
      apiKey: draft.apiKey,
      model: nextProvider.models[0]?.id ?? '',
      baseUrl: '',
    })
    setFeedback({ kind: 'idle', message: '已切换服务商，模型已重置为默认值。' })
  }

  const handleTest = async () => {
    setTesting(true)
    setFeedback({ kind: 'idle', message: '正在测试连接…' })

    const result: ConnectionTestResult = await testConnection(
      normalizeAIConfig(draft),
    )

    setTesting(false)
    setFeedback({
      kind: result.ok ? 'success' : 'error',
      message: `${result.message}（${result.latencyMs} ms）`,
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSave) {
      setFeedback({ kind: 'error', message: '请填写 API Key 并选择模型。' })
      return
    }

    const config = normalizeAIConfig(draft)

    saveConfig(config)
    setDraft(toDraft(config))
    setFeedback({ kind: 'success', message: '已保存配置。' })
  }

  return (
    <section className="settings-section" aria-labelledby={titleId}>
      <h2 id={titleId}>AI 配置</h2>
      <p className="settings-summary">
        当前：{providerName} · {settings.model} · {maskApiKey(settings.apiKey)}
        <span className="settings-summary-url">（{resolveBaseUrl(settings)}）</span>
      </p>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-field">
          <label htmlFor={`${titleId}-provider`}>服务商</label>
          <select
            id={`${titleId}-provider`}
            value={draft.providerId}
            onChange={(event) => handleProviderChange(event.target.value)}
          >
            {AI_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="settings-field">
          <label htmlFor={keyId}>API Key</label>
          <div className="settings-inline">
            <input
              id={keyId}
              type={showKey ? 'text' : 'password'}
              value={draft.apiKey}
              autoComplete="off"
              spellCheck={false}
              placeholder="粘贴 API Key…"
              onChange={(event) => update({ apiKey: event.target.value })}
            />
            <button
              type="button"
              className="settings-secondary"
              onClick={() => setShowKey((current) => !current)}
            >
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        <div className="settings-field">
          <label htmlFor={baseUrlId}>Base URL</label>
          <input
            id={baseUrlId}
            type="url"
            value={draft.baseUrl}
            spellCheck={false}
            placeholder={defaultBaseUrl}
            onChange={(event) => update({ baseUrl: event.target.value })}
          />
          <p className="settings-hint">
            留空使用默认地址 {defaultBaseUrl}；填写代理地址可绕开浏览器跨域限制。
          </p>
        </div>

        <div className="settings-field">
          <label htmlFor={`${titleId}-model`}>模型</label>
          <select
            id={`${titleId}-model`}
            value={draft.model}
            onChange={(event) => update({ model: event.target.value })}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        {provider?.note !== undefined && (
          <p className="settings-note">{provider.note}</p>
        )}

        <div className="settings-actions">
          <button type="submit" className="settings-primary" disabled={!canSave}>
            保存配置
          </button>
          <button
            type="button"
            className="settings-secondary"
            disabled={testing || draft.apiKey.trim() === ''}
            onClick={() => void handleTest()}
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
        </div>
      </form>

      <p
        className="settings-status"
        data-kind={feedback.kind}
        role={feedback.kind === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {feedback.message}
      </p>
    </section>
  )
}
