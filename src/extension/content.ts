import { fetchSubmissions } from "../luogu/fetch";
import type { Submission } from "../toSubmission";
import { downloadSubmissions } from "./export";

const HOST_ID = "ai-coach-luogu-panel";

const styles = `
  :host {
    all: initial;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .panel {
    --background: #ffffff;
    --foreground: #18201c;
    --muted: #58645e;
    --border: #d8dfda;
    --accent: #176b43;
    --accent-hover: #105735;
    --accent-text: #ffffff;
    --secondary: #edf3ef;
    --secondary-hover: #e0eae4;
    --error: #b42318;
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    width: 304px;
    max-width: calc(100vw - 32px);
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--background);
    box-shadow: 0 12px 32px rgba(17, 32, 24, 0.18);
    color: var(--foreground);
    font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    color-scheme: light;
  }

  .eyebrow {
    margin: 0 0 2px;
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.35;
  }

  .description {
    margin: 6px 0 14px;
    color: var(--muted);
    font-size: 12px;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  input {
    display: block;
    width: 100%;
    height: 40px;
    margin: 0 0 12px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 7px;
    outline: none;
    background: var(--background);
    color: var(--foreground);
    font: inherit;
  }

  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(23, 107, 67, 0.16);
  }

  input:disabled {
    opacity: 0.65;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  button {
    min-height: 40px;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: 7px;
    font: 600 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 3px solid rgba(23, 107, 67, 0.3);
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .fetch {
    background: var(--accent);
    color: var(--accent-text);
  }

  .fetch:not(:disabled):hover {
    background: var(--accent-hover);
  }

  .export {
    border-color: var(--border);
    background: var(--secondary);
    color: var(--foreground);
  }

  .export:not(:disabled):hover {
    background: var(--secondary-hover);
  }

  .status {
    min-height: 18px;
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .status[data-kind="error"] {
    color: var(--error);
  }

  @media (prefers-color-scheme: dark) {
    .panel {
      --background: #18201c;
      --foreground: #f2f6f3;
      --muted: #b6c2ba;
      --border: #3b4840;
      --accent: #3fae76;
      --accent-hover: #52bd86;
      --accent-text: #08150e;
      --secondary: #26342b;
      --secondary-hover: #304237;
      --error: #ff8a80;
      color-scheme: dark;
    }

    input:focus {
      box-shadow: 0 0 0 3px rgba(63, 174, 118, 0.22);
    }
  }
`;

function uidFromLocation(): string {
  const match = window.location.pathname.match(/^\/user\/(\d+)(?:\/|$)/);
  return match?.[1] ?? "";
}

function mountPanel(): void {
  const host = document.createElement("div");
  host.id = HOST_ID;

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${styles}</style>
    <section class="panel" aria-labelledby="ai-coach-title">
      <p class="eyebrow">AI Coach</p>
      <h2 id="ai-coach-title">导出洛谷提交</h2>
      <p class="description">在当前登录状态下抓取，数据仅保存在本机。</p>
      <form novalidate>
        <label for="ai-coach-uid">洛谷 UID</label>
        <input
          id="ai-coach-uid"
          name="uid"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          autocomplete="off"
          placeholder="填写自己的洛谷用户编号，例如：8457"
          required
        />
        <div class="actions">
          <button class="fetch" type="submit">抓取提交</button>
          <button class="export" type="button" disabled>导出 JSON</button>
        </div>
      </form>
      <p class="status" role="status" aria-live="polite">输入 UID 后开始抓取。</p>
    </section>
  `;

  const form = shadow.querySelector<HTMLFormElement>("form")!;
  const input = shadow.querySelector<HTMLInputElement>("input")!;
  const fetchButton = shadow.querySelector<HTMLButtonElement>(".fetch")!;
  const exportButton = shadow.querySelector<HTMLButtonElement>(".export")!;
  const status = shadow.querySelector<HTMLParagraphElement>(".status")!;

  let submissions: Submission[] | undefined;
  let resultUid: number | undefined;

  input.value = uidFromLocation();

  function setStatus(message: string, kind: "idle" | "error" = "idle"): void {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function updateExportButton(): void {
    exportButton.disabled =
      submissions === undefined || resultUid !== Number(input.value);
  }

  input.addEventListener("input", () => {
    updateExportButton();
    if (submissions !== undefined && resultUid !== Number(input.value)) {
      setStatus("UID 已变化，请重新抓取。");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const uid = Number(input.value);
    if (!Number.isInteger(uid) || uid <= 0) {
      setStatus("请输入有效的正整数 UID。", "error");
      input.focus();
      return;
    }

    submissions = undefined;
    resultUid = undefined;
    input.disabled = true;
    fetchButton.disabled = true;
    fetchButton.textContent = "抓取中…";
    exportButton.disabled = true;
    setStatus("正在抓取全部提交记录，请稍候…");

    try {
      const result = await fetchSubmissions(uid);
      submissions = result;
      resultUid = uid;
      setStatus(`已获取 ${result.length} 条提交，可以导出 JSON。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setStatus(`抓取失败：${message}`, "error");
    } finally {
      input.disabled = false;
      fetchButton.disabled = false;
      fetchButton.textContent = "抓取提交";
      updateExportButton();
    }
  });

  exportButton.addEventListener("click", () => {
    if (submissions === undefined || resultUid === undefined) {
      return;
    }

    downloadSubmissions(resultUid, submissions);
    setStatus(`已导出 ${submissions.length} 条提交记录。`);
  });

  document.body.append(host);
}

if (document.getElementById(HOST_ID) === null) {
  mountPanel();
}
