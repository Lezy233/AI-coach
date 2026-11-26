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
        ├─ status
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
  submitStatus: Verdict; // 提交状态
  submitScore: number | null;
  submitContest: Record<string, unknown> | null;
  problem: Problem;
};

export type SubmissionKey = [platform: Platform, submitId: number];

export function submissionKey({ platform, submitId }: Submission): SubmissionKey {
  return [platform, submitId];
}