import type { Problem } from './problem';

type Catalog = "巩固旧知识点" | "接触新知识点" | "提高难度" | "同水平变体" | "重做旧题" | "other";

type Suggestion = {
  category: Catalog;          // 建议类型
  title: string;              // 一句话建议（列表渲染的主行）
  detail?: string;          	// 展开说明，可空
  relatedProblems: Problem[]; // 关联题目，可为空——引用历史 pid 或外部题
  basis: string;              // 依据：引用了哪些统计数字/提交记录
};

type FollowUp = {
	suggestionRef: string;	// 对照的上轮建议 (title/id)
	status: "not-done" | "in-progress" | "done";
	comments: string;
};

export type AnalysisResult = {
	summary: string;
	suggestions: Suggestion[];
	masteryProfile?: string;
	followUp?: FollowUp[];
};