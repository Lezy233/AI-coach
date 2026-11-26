import type { Platform } from "../domain/platform";
import type { Submission } from "../domain/submission";

export const LUOGU_PLATFORM: Platform = "Luogu";
export const LUOGU_SOURCE = "luogu";

export const LUOGU_RECORD_LIST_PATH = "/record/list";
export const LUOGU_CONTENT_ONLY_HEADER = "x-lentille-request";
export const LUOGU_CONTENT_ONLY_VALUE = "content-only";
export const LUOGU_PAGE_DELAY_MS = 300;

/**
 * 直接在 parse 层转译成 verdict,
 * 不排除未来洛谷官方增加新状态码的风险
 */
export const STATUS_TO_VERDICT: Partial<
Record<number, Submission["submitStatus"]>
> = {
  2: "CE",
  3: "OLE",
  4: "MLE",
  5: "TLE",
  6: "WA",
  7: "RE",
  11: "UKE",
  12: "AC",
  14: "NAC",
};

export const VERDICTS = new Set<Submission["submitStatus"]>([
  "CE",
  "OLE",
  "MLE",
  "TLE",
  "WA",
  "RE",
  "UKE",
  "AC",
  "NAC",
]);


export type RawLuoguRecord = {
  id: number;
  status: number;
	score: number | null;
	submitTime: number;
	contest: Record<string, unknown> | null;
  problem: {
    pid: string,
    name: string,
    difficulty: number | null,
  };
};