import type { Verdict, Submission } from './submission';

function isValidDateString(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}

	const iso8601Date = /^\d{4}-\d{2}-\d{2}$/;
	return iso8601Date.test(value) && !Number.isNaN(Date.parse(value));
}

function formatLocalDate(value: Date): string {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, '0');
	const day = String(value.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export type SubmissionStats = {
	total: number; 											// 总提交数
	accepted: number; 									// 通过的提交数
	acceptedRate: number; 							// 通过率
	byVerdict: Record<Verdict, number>; // 各判定次数
	byDay: Record<string, number>;   		// 按本地日期统计的提交数(2001-01-11: 5)
};

export function computeStats(submissions: Submission[]): SubmissionStats {
	const total = submissions.length;
	const accepted = submissions.filter((s) => s.submitStatus === "AC").length;
	const acceptedRate = total === 0 ? 0 : accepted / total;

	const byVerdict: Record<Verdict, number> = {
		CE: 0,
		OLE: 0,
		MLE: 0,
		TLE: 0,
		WA: 0,
		RE: 0,
		UKE: 0,
		AC: 0,
		NAC: 0,
	};

	for (const submission of submissions) {
		byVerdict[submission.submitStatus]++;
	}

	const byDay: Record<string, number> = {};
	for (const submission of submissions) {
		const dateStr = formatLocalDate(submission.submitTime);

		if (!isValidDateString(dateStr)) {
			throw new Error(`Invalid date string: ${dateStr}`);
		}
		if (!byDay[dateStr]) {
			byDay[dateStr] = 0;
		}
		byDay[dateStr]++;
	}

	return {
		total,
		accepted,
		acceptedRate,
		byVerdict,
		byDay
	};
}