import { useId, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { AnalysisResult } from '../domain/analysis'
import type { Problem } from '../domain/problem'
import type { SubmissionStats } from '../domain/stats'
import { computeStats } from '../domain/stats'
import { requestAnalysis } from '../analysis/client'
import { parseAnalysisResultJson } from '../analysis/parse'
import { buildAnalysisMessages } from '../analysis/prompt'
import { useSettings } from './hooks/useSettings'
import { resolveBaseUrl } from './ai-providers'
import { db } from './storage/db'
import {
  FOLLOW_UP_STATUS_LABELS,
  getProblemUrl,
  summarizeAnalysisInput,
} from './analysis-log'

type AnalysisStatus = 'idle' | 'busy' | 'success' | 'error'

function formatLogDate(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(value)
}

function ProblemLink({ problem }: { problem: Problem }) {
  const label = `${problem.id} ${problem.name}`.trim()
  const href = getProblemUrl(problem)

  if (href === null) {
    return <span className="analysis-problem">{label}</span>
  }

  return (
    <a
      className="analysis-problem"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  )
}

function SuggestionList({ suggestions }: { suggestions: AnalysisResult['suggestions'] }) {
  if (suggestions.length === 0) {
    return <p className="analysis-empty">本次没有给出建议。</p>
  }

  return (
    <ol className="analysis-suggestions">
      {suggestions.map((suggestion, index) => (
        <li key={`${index}-${suggestion.title}`}>
          <div className="analysis-suggestion-head">
            <span className="analysis-category">{suggestion.category}</span>
            <span className="analysis-title">{suggestion.title}</span>
          </div>
          {suggestion.detail !== undefined && (
            <p className="analysis-detail">{suggestion.detail}</p>
          )}
          {suggestion.relatedProblems.length > 0 && (
            <ul className="analysis-problems">
              {suggestion.relatedProblems.map((problem) => (
                <li key={`${problem.platform}-${problem.id}`}>
                  <ProblemLink problem={problem} />
                </li>
              ))}
            </ul>
          )}
          <p className="analysis-basis">依据：{suggestion.basis}</p>
        </li>
      ))}
    </ol>
  )
}

function ResultView({ result }: { result: AnalysisResult }) {
  return (
    <article className="analysis-result">
      <h3>总结</h3>
      <p className="analysis-summary">{result.summary}</p>

      {result.masteryProfile !== undefined && (
        <>
          <h3>掌握情况</h3>
          <p className="analysis-summary">{result.masteryProfile}</p>
        </>
      )}

      <h3>建议</h3>
      <SuggestionList suggestions={result.suggestions} />

      {result.followUp !== undefined && result.followUp.length > 0 && (
        <>
          <h3>上轮跟进</h3>
          <ul className="analysis-follow-ups">
            {result.followUp.map((followUp, index) => (
              <li key={`${index}-${followUp.suggestionRef}`}>
                <span
                  className="analysis-badge"
                  data-status={followUp.status}
                >
                  {FOLLOW_UP_STATUS_LABELS[followUp.status]}
                </span>
                <span className="analysis-follow-up-ref">{followUp.suggestionRef}</span>
                {followUp.comments !== '' && (
                  <p className="analysis-detail">{followUp.comments}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

/**
 * 分析面板：按钮触发一次真实 LLM 分析，结果写入 analysisLog，
 * 面板本身始终从 analysisLog 读最近一条记录渲染。
 */
export function AnalysisPanel() {
  const { settings } = useSettings()
  const titleId = useId()
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [message, setMessage] = useState('点击“生成分析”开始。')
  const controllerRef = useRef<AbortController | null>(null)

  const latestLog = useLiveQuery(
    () => db.analysisLog.orderBy('createdAt').reverse().first(),
    [],
  )
  const logCount = useLiveQuery(() => db.analysisLog.count(), [], 0)

  const hasApiKey = settings.apiKey.trim() !== ''
  const isBusy = status === 'busy'

  const handleAnalyze = async () => {
    if (controllerRef.current !== null) {
      return
    }

    const apiKey = settings.apiKey.trim()
    const model = settings.model.trim()

    if (apiKey === '') {
      setStatus('error')
      setMessage('尚未配置 API Key，请先在「AI 配置」中填写并保存。')
      return
    }

    if (model === '') {
      setStatus('error')
      setMessage('尚未配置模型，请先在「AI 配置」中选择并保存。')
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller

    setStatus('busy')
    setMessage('正在读取提交记录…')

    try {
      const submissions = await db.submissions.toArray()

      if (submissions.length === 0) {
        throw new Error('暂无提交记录，请先导入 JSON。')
      }

      const stats: SubmissionStats = computeStats(submissions)
      const previousLog = await db.analysisLog
        .orderBy('createdAt')
        .reverse()
        .first()

      setMessage('正在生成分析，请稍候…')

      const content = await requestAnalysis(
        buildAnalysisMessages({
          submissions,
          stats,
          previousResult: previousLog?.result ?? null,
        }),
        { apiKey, model, baseUrl: resolveBaseUrl(settings), signal: controller.signal },
      )

      setMessage('正在校验分析结果…')

      const result = parseAnalysisResultJson(content)
      const entry = {
        createdAt: new Date(),
        result,
        inputSummary: summarizeAnalysisInput(submissions),
      }

      await db.analysisLog.add(entry)

      setStatus('success')
      setMessage(`分析完成，已保存（${submissions.length} 条提交记录）。`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle')
        setMessage('已取消本次分析。')
        return
      }

      const reason = error instanceof Error ? error.message : '未知错误'
      setStatus('error')
      setMessage(`分析失败：${reason}`)
    } finally {
      controllerRef.current = null
    }
  }

  const handleCancel = () => {
    controllerRef.current?.abort()
  }

  return (
    <section
      className="analysis-panel"
      aria-labelledby={titleId}
      aria-busy={isBusy}
    >
      <h2 id={titleId}>AI 分析</h2>

      <div className="analysis-toolbar">
        <button
          type="button"
          className="analysis-run"
          onClick={handleAnalyze}
          disabled={!hasApiKey || isBusy}
        >
          {isBusy ? '分析中…' : '生成分析'}
        </button>
        {isBusy && (
          <button type="button" className="analysis-cancel" onClick={handleCancel}>
            取消
          </button>
        )}
        <span className="analysis-history">历史记录：{logCount} 条</span>
      </div>

      {!hasApiKey && (
        <p className="analysis-warning" role="note">
          尚未配置 API Key，请先在下方「AI 配置」中填写并保存。
        </p>
      )}

      <p
        className="analysis-feedback"
        data-kind={status}
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>

      {latestLog === undefined ? (
        <p className="analysis-empty">还没有分析记录，点击上方按钮生成第一条。</p>
      ) : (
        <>
          <p className="analysis-log-meta">
            {formatLogDate(latestLog.createdAt)} · {latestLog.inputSummary}
          </p>
          <ResultView result={latestLog.result} />
        </>
      )}
    </section>
  )
}
