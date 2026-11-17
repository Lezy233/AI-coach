import type { Submission } from "../toSubmission";

export const LUOGU_RECORD_LIST_PATH = "/record/list";
export const LUOGU_CONTENT_ONLY_HEADER = "x-lentille-request";
export const LUOGU_CONTENT_ONLY_VALUE = "content-only";
export const LUOGU_PAGE_DELAY_MS = 300;

export const STATUS_TO_VERDICT: Partial<
Record<number, Submission["verdict"]>
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

export type RawLuoguRecord = {
  id: number;
  status: number;
	score: number | null;
	submitTime: number;
	contest: Record<string, unknown> | null;
  problem: {
    pid: string,
    name: string,
  };
};