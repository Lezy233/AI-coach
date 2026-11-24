import { useState, type ChangeEvent } from 'react'
import type { Submission } from '../domain/submission'
import { parseImportedSubmissionsJson } from '../luogu/import'

type ImportPanelProps = {
  importSubmissions: (
    batch: Submission[],
  ) => Promise<{ imported: number; overwritten: number }>
}

type ImportStatus = 'idle' | 'busy' | 'success' | 'error'

export function ImportPanel({ importSubmissions }: ImportPanelProps) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [message, setMessage] = useState('尚未导入文件。')

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (file === undefined) {
      return
    }

    setStatus('busy')
    setMessage(`正在导入 ${file.name}…`)

    try {
      const batch = parseImportedSubmissionsJson(await file.text())
      const result = await importSubmissions(batch)
      setStatus('success')
      setMessage(`导入 ${result.imported} 条，覆盖 ${result.overwritten} 条。`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知错误'
      setStatus('error')
      setMessage(`导入失败：${reason}`)
    } finally {
      input.value = ''
    }
  }

  return (
    <section
      className="import-panel"
      aria-labelledby="import-panel-title"
      aria-busy={status === 'busy'}
    >
      <h2 id="import-panel-title">导入提交记录</h2>
      <label htmlFor="submission-import">选择浏览器扩展导出的 JSON 文件</label>
      <input
        id="submission-import"
        type="file"
        accept=".json,application/json"
        disabled={status === 'busy'}
        aria-describedby="import-feedback"
        onChange={handleFileChange}
      />
      <p
        id="import-feedback"
        className="import-feedback"
        data-kind={status}
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>
    </section>
  )
}
