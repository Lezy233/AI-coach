export type Verdict = "CE" | "OLE" | "MLE" | "TLE" | "WA" | "RE" | "UKE" | "AC" | "NAC";

export type Submission = {
  id: number;
  score: number | null;
  submitTime: Date;
  contest: Record<string, unknown> | null;
  problem: string;
  verdict: Verdict;
};