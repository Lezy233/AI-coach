export type Verdict = "CE" | "OLE" | "MLE" | "TLE" | "WA" | "RE" | "UKE" | "AC" | "NAC";

export type Submission = {
  platform: string;
  id: number;
  score: number | null;
  submitTime: Date;
  contest: Record<string, unknown> | null;
  problem: string;
  verdict: Verdict;
};

export type SubmissionKey = [platform: string, id: number];

export function submissionKey({ platform, id }: Submission): SubmissionKey {
  return [platform, id];
}