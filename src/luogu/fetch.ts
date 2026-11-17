import type { Submission } from "../toSubmission";
import {
  LUOGU_CONTENT_ONLY_HEADER,
  LUOGU_CONTENT_ONLY_VALUE,
  LUOGU_RECORD_LIST_PATH,
  LUOGU_PAGE_DELAY_MS,
} from "./contract";
import { normalizeResult, parseSubmissionsPage } from "./parse"

type UnknownRecord = Record<string, unknown>;

type FetchSubmissionsOptions = {
  baseUrl?: string;
  knownMaxId?: number;
  signal?: AbortSignal;
};

type PageMeta = {
  count: number;
  perPage: number;
};

function isObject(value: unknown): value is UnknownRecord {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

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

  if (
    !isPositiveInteger(count) ||
    !isPositiveInteger(perPage)
  ) {
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

  const result = input.data.records.result;

  if (!isObject(result)) {
    throw new Error("响应中的 result 格式不正确");
  }

  return normalizeResult(result).length;
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

    const timer = window.setTimeout(resolve, milliseconds);

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
  body: unknown;
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

  if (actualLength > meta.perPage) {
    throw new Error("单页记录数超过 perPage 限制");
  }

  return { body, meta, submissions };
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
    ) {
      throw new Error("分页期间 count 或 perPage 发生变化");
    }

    const freshSubmissions = submissions.filter(
      (submission) => submission.id > knownMaxId,
    );

    allSubmissions.push(...freshSubmissions);

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

  return allSubmissions;
}