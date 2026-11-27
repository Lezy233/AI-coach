import type { Platform } from './platform';
import type { Problem } from './problem';
export type Verdict = "CE" | "OLE" | "MLE" | "TLE" | "WA" | "RE" | "UKE" | "AC" | "NAC";

/*
Submission 数据结构示意图
└─ platform
    └─ submit // 单次提交记录
        ├─ id
        ├─ time
        ├─ score
        ├─ status  // 提交结果（与平台原始 status 含义不同）
        ├─ contest // 是否在比赛中提交
        └─ problem // 提交题目
            ├─ id
            ├─ name
            └─ difficulty
 */
export type Submission = {
  platform: Platform;
  submitId: number;
  submitTime: Date;
  submitStatus: Verdict;
  submitScore: number | null;
  submitContest: Record<string, unknown> | null;
  problem: Problem;
};

export type SubmissionKey = [platform: Platform, submitId: number];

export function submissionKey({ platform, submitId }: Submission): SubmissionKey {
  return [platform, submitId];
}