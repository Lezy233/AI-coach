export type Verdict = "CE" | "OLE" | "MLE" | "TLE" | "WA" | "RE" | "UKE" | "AC" | "NAC";

/*
Submission 数据结构示意图
└─ platform
    └─ submit // 单次提交记录
        ├─ id
        ├─ time
        ├─ score
        ├─ status
        ├─ contest // 是否在比赛中提交
        └─ problem // 提交题目
            ├─ id
            ├─ name
            └─ difficulty
 */
export type Submission = {
  platform: string;
  submitId: number;
  submitTime: Date;
  submitStatus: Verdict;
  submitScore: number | null;
  submitContest: Record<string, unknown> | null;
  problemId: string;
  problemName: string;
  problemDifficulty: number | null;
};

export type SubmissionKey = [platform: string, submitId: number];

export function submissionKey({ platform, submitId }: Submission): SubmissionKey {
  return [platform, submitId];
}