import type { AnalysisResult } from '../domain/analysis';
import type { Platform } from '../domain/platform';
import type { Problem } from '../domain/problem';

export type AnalysisLogEntry = {
	id?: number;
	createdAt: Date;
	result: AnalysisResult;
	inputSummary: string;
};

export type AnalysisLogSummary = {
	submissionCount: number;
	firstSubmitTime: Date | null;
	lastSubmitTime: Date | null;
};

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function formatLocalDate(value: Date): string {
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * 记录本次分析覆盖的提交范围，供历史列表直接展示。
 */
export function summarizeAnalysisInput(
	submissions: readonly { submitTime: Date }[],
): string {
	if (submissions.length === 0) {
		return '0 条提交记录';
	}

	let firstSubmitTime = submissions[0].submitTime;
	let lastSubmitTime = submissions[0].submitTime;

	for (const { submitTime } of submissions) {
		if (submitTime.getTime() < firstSubmitTime.getTime()) {
			firstSubmitTime = submitTime;
		}
		if (submitTime.getTime() > lastSubmitTime.getTime()) {
			lastSubmitTime = submitTime;
		}
	}

	return [
		`${submissions.length} 条提交记录`,
		`${formatLocalDate(firstSubmitTime)} 至 ${formatLocalDate(lastSubmitTime)}`,
	].join(' · ');
}

const problemUrlBuilders: Record<Platform, (problem: Problem) => string | null> = {
	Luogu: ({ id }) => `https://www.luogu.com.cn/problem/${encodeURIComponent(id)}`,
	Codeforces: ({ id, name }) => {
		const contestMatch = /^(\d+)([A-Za-z]\d*)$/.exec(id);
		if (contestMatch !== null) {
			return `https://codeforces.com/problemset/problem/${contestMatch[1]}/${contestMatch[2].toUpperCase()}`;
		}

		const gymMatch = /^gym-?(\d+)([A-Za-z]\d*)$/i.exec(id);
		if (gymMatch !== null) {
			return `https://codeforces.com/gym/${gymMatch[1]}/problem/${gymMatch[2].toUpperCase()}`;
		}

		const search = encodeURIComponent(`${id} ${name}`.trim());
		return `https://codeforces.com/problemset?order=BY_SOLVED_DESC&search=${search}`;
	},
	AtCoder: ({ id }) =>
		/^[a-z]+\d+_[a-z\d]+$/.test(id)
			? `https://atcoder.jp/contests/${encodeURIComponent(id.split('_')[0])}/tasks/${encodeURIComponent(id)}`
			: null,
	LeetCode: ({ id }) => `https://leetcode.com/problems/${encodeURIComponent(id)}/`,
	LeetCodeCN: ({ id }) => `https://leetcode.cn/problems/${encodeURIComponent(id)}/`,
	HDU: ({ id }) => `https://acm.hdu.edu.cn/showproblem.php?pid=${encodeURIComponent(id)}`,
	POJ: ({ id }) => `http://poj.org/problem?id=${encodeURIComponent(id)}`,
	UVA: ({ id }) =>
		`https://onlinejudge.org/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=${encodeURIComponent(id)}`,
	CFGym: ({ id }) => `https://codeforces.com/gym/${encodeURIComponent(id)}`,
	Other: () => null,
};

/**
 * 把题目映射到 OJ 题目页；无法确定链接时返回 null。
 */
export function getProblemUrl(problem: Problem): string | null {
	const builder = problemUrlBuilders[problem.platform];

	if (builder === undefined) {
		return null;
	}

	return builder(problem);
}

export const FOLLOW_UP_STATUS_LABELS = {
	'not-done': '未开始',
	'in-progress': '进行中',
	done: '已完成',
} as const;
