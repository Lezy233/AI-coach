import type { Submission } from "../domain/submission";
import {
  LUOGU_CONTENT_ONLY_HEADER,
  LUOGU_CONTENT_ONLY_VALUE,
  LUOGU_RECORD_LIST_PATH,
  LUOGU_PAGE_DELAY_MS,
} from "./contract";
import {
  isObject,
  isPositiveInteger,
  isNonNegativeInteger,
} from "./guards";
import { normalizeResult, parseSubmissionsPage } from "./parse"

export type FetchProgress = {
  fetched: number;
  total: number;
};

type FetchSubmissionsOptions = {
  baseUrl?: string;
  knownMaxId?: number;
  signal?: AbortSignal;
  onProgress?: (progress: FetchProgress) => void;
};

type PageMeta = {
  count: number;
  perPage: number;
};

function readPageMeta(input: unknown): PageMeta {
  if (!isObject(input)) {
    throw new Error("响应必须是对象");
  }

  if (
    !isObject(input.data) ||
    !isObject(input.data.records)
  ) {
    throw new Error("响应中 data.records 格式不正确");
  }

  const { count, perPage } = input.data.records;

  if (!isNonNegativeInteger(count) || !isPositiveInteger(perPage)) {
    throw new Error("响应中 count 或 perPage 字段不合法");
  }

  return { count, perPage };
}

function assertSuccessEnvelope(input: unknown): void {
  if (!isObject(input)) {
    throw new Error("响应不是 json 对象");
  }

  if (input.template === "error") {
    const data = isObject(input.data) ? input.data : null;
    const message =
      data !== null && typeof data.errorMessage === "string"
        ? data.errorMessage
        : "洛谷接口返回错误信封";

    throw new Error(message);
  }

  if (input.status !== 200) {
    throw new Error(
      `洛谷接口返回失败状态：${String(input.status)}`
    );
  }

  if (input.template !== "record.list") {
    throw new Error(
      `响应 template 不正确：${String(input.template)}`
    );
  }

  const user = input.user;

  if (
    !isObject(user) ||
    !isPositiveInteger(user.uid)
  ) {
    throw new Error( "洛谷登录态失效，请先登录洛谷后重试");
  }
}

function getPageRecordsLength(input: unknown): number {
  if (
    !isObject(input) ||
    !isObject(input.data) ||
    !isObject(input.data.records)
  ) {
    throw new Error("响应中的 records 格式不正确");
  }

  return normalizeResult(input.data.records.result).length;
}

function expectedRowsForPage(page: number, meta: PageMeta): number {
  const remaining = meta.count - (page - 1) * meta.perPage;
  return Math.max(0, Math.min(meta.perPage, remaining));
}

// function getMaxSubmissionId(
//   submissions: Submission[],
// ): number {
//   return submissions.reduce(
//     (maxId, submission) => Math.max(maxId, submission.id),
//     0,
//   );
// }

function sleep(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new DOMException("请求已取消", "AbortError"));
      return;
    }

    const timer = globalThis.setTimeout(resolve, milliseconds);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("请求已取消", "AbortError"));
    }, { once: true });
  });
}

async function fetchPage(
  uid: number,
  page: number,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<{
  meta: PageMeta;
  submissions: Submission[];
}> {
  const url = new URL(LUOGU_RECORD_LIST_PATH, baseUrl);
  url.searchParams.set("user", String(uid));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      [LUOGU_CONTENT_ONLY_HEADER]: LUOGU_CONTENT_ONLY_VALUE,
    },
    signal,
  });

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new Error("洛谷返回的不是 JSON，登录态可能已失效");
  }

  assertSuccessEnvelope(body);

  if (!response.ok) {
    throw new Error( `洛谷 HTTP 请求失败：${response.status}`);
  }

  const meta = readPageMeta(body);
  const submissions = parseSubmissionsPage(body);
  const actualLength = getPageRecordsLength(body);

  if (actualLength !== submissions.length) {
    throw new Error("响应记录数量与解析结果不一致");
  }

  const expectedLength = expectedRowsForPage(page, meta);

  if (actualLength !== expectedLength) {
    throw new Error(
      `第 ${page} 页记录数不正确：期望 ${expectedLength} 条，实际 ${actualLength} 条`,
    );
  }

  return { meta, submissions };
}

export async function fetchSubmissions(
  uid: number,
  options: FetchSubmissionsOptions = {},
): Promise<Submission[]> {
  if (!isPositiveInteger(uid)) {
    throw new Error("uid 必须是正整数");
  }

  const baseUrl = options.baseUrl ?? window.location.origin;
  const knownMaxId = options.knownMaxId ?? 0;

  const allSubmissions: Submission[] = [];
  let page = 1;
  let expectedMeta: PageMeta | undefined;

  while (true) {
    if (page > 1) {
      await sleep(LUOGU_PAGE_DELAY_MS, options.signal);
    }

    const { meta, submissions } = await fetchPage(
      uid,
      page,
      baseUrl,
      options.signal,
    );

    if (expectedMeta === undefined) {
      expectedMeta = meta;
    } else if (
      meta.count !== expectedMeta.count ||
      meta.perPage !== expectedMeta.perPage
    ) { // count/perPage 跨页应保持一致
      throw new Error("分页期间 count 或 perPage 发生变化");
    }

    const freshSubmissions = submissions.filter(
      (submission) => submission.id > knownMaxId,
    );

    allSubmissions.push(...freshSubmissions);
    options.onProgress?.({
      fetched: allSubmissions.length,
      total: meta.count,
    });

    const reachedKnownRecord =
      submissions.some((submission) => submission.id <= knownMaxId);

    const totalPages = Math.ceil(meta.count / meta.perPage);

    if (
      reachedKnownRecord ||
      page >= totalPages ||
      submissions.length === 0
    ) {
      break;
    }

    page += 1;
  }

  if (knownMaxId === 0 && expectedMeta !== undefined) {
    const uniqueIds = new Set(
      allSubmissions.map((submission) => submission.id),
    );

    if (uniqueIds.size !== expectedMeta.count) {
      throw new Error(
        `提交记录唯一 ID 数量不正确：期望 ${expectedMeta.count} 个，实际 ${uniqueIds.size} 个`,
      );
    }
  }

  return allSubmissions;
}
