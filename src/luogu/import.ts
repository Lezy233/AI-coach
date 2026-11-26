import { isPlatform, type Platform } from "../domain/platform";
import type { Problem } from "../domain/problem";
import type { Submission } from "../domain/submission";
import { LUOGU_PLATFORM, LUOGU_SOURCE } from "./contract";
import {
	isObject,
	isFiniteNumber,
	isInteger,
	isValidDateString,
	isVerdict,
} from "./guards";

function invalidSubmission(index: number): Error {
	return new Error(`导入文件中的 submission[${index}] 字段不符合预期`);
}

function normalizePlatform(value: unknown): Platform | undefined {
	if (value === LUOGU_SOURCE) {
		return LUOGU_PLATFORM;
	}
	return isPlatform(value) ? value : undefined;
}

function parseImportedProblem(
	input: Record<string, unknown>,
	fallbackPlatform: Platform,
	index: number,
): Problem {
	if (isObject(input.problem)) {
		const platform = normalizePlatform(input.problem.platform);

		if (
			platform === undefined ||
			typeof input.problem.id !== "string" || input.problem.id.length === 0 ||
			typeof input.problem.name !== "string" || input.problem.name.length === 0 ||
			!(input.problem.difficulty === null || isFiniteNumber(input.problem.difficulty))
		) {
			throw invalidSubmission(index);
		}

		return {
			platform,
			id: input.problem.id,
			name: input.problem.name,
			difficulty: input.problem.difficulty,
		};
	}

	// 兼容旧版扁平字段：problemId / problemName / problemDifficulty
	if (
		typeof input.problemId === "string" && input.problemId.length > 0 &&
		typeof input.problemName === "string" && input.problemName.length > 0 &&
		(input.problemDifficulty === null || isFiniteNumber(input.problemDifficulty))
	) {
		return {
			platform: fallbackPlatform,
			id: input.problemId,
			name: input.problemName,
			difficulty: input.problemDifficulty,
		};
	}

	// 兼容更早版本导出中的 problem: "P1001" 字符串形式
	if (typeof input.problem === "string" && input.problem.length > 0) {
		return {
			platform: fallbackPlatform,
			id: input.problem,
			name: input.problem,
			difficulty: null,
		};
	}

	throw invalidSubmission(index);
}

function parseImportedSubmission(
	platform: Platform,
	input: unknown,
	index: number,
): Submission {
  if (!isObject(input)) {
		throw new Error(`导入文件中的 submission[${index}] 必须是对象`);
	}

	const inputPlatform = input.platform === undefined
		? platform
		: normalizePlatform(input.platform);
	const submitId = input.submitId !== undefined ? input.submitId : input.id;
	const submitStatus = input.submitStatus !== undefined
		? input.submitStatus
		: input.verdict;
	const submitScore = input.submitScore !== undefined
		? input.submitScore
		: input.score;
	const submitContest = input.submitContest !== undefined
		? input.submitContest
		: input.contest;

	if (
		inputPlatform !== platform ||
    !isInteger(submitId) ||
    !(submitScore === null || isFiniteNumber(submitScore)) ||
		!isValidDateString(input.submitTime) ||
    !(submitContest === null || isObject(submitContest)) ||
		!isVerdict(submitStatus)
	) {
		throw invalidSubmission(index);
	}

	return {
		platform,
		submitId,
		submitTime: new Date(input.submitTime),
		submitStatus,
		submitScore,
		submitContest,
		problem: parseImportedProblem(input, platform, index),
	}
}

/**
 * 将浏览器拓展导出的 json 文件解析为 Submission 对象
 * @param input - 使用浏览器拓展从洛谷导出的 JSON 数据
 * @returns 解析后的 Submission 对象数组
 */
export function parseImportedSubmissions(
	input: unknown,
): Submission[] {
	if (!isObject(input)) {
		throw new Error("导入文件必须是对象");
	}

	if (normalizePlatform(input.source) !== LUOGU_PLATFORM) {
		throw new Error("导入文件的 source 必须为 luogu");
	}

	if (!isInteger(input.uid)) {
		throw new Error("导入文件的 uid 必须是整数");
	}

	if (!isValidDateString(input.exportedAt)) {
		throw new Error("导入文件的 exportedAt 必须是有效的日期字符串");
	}

	if (!Array.isArray(input.submissions)) {
		throw new Error("导入文件的 submissions 必须是数组");
	}

	const platform = LUOGU_PLATFORM;

	return input.submissions.map((record, index) =>
		parseImportedSubmission(platform, record, index),
	);
}

/**
 * 将浏览器拓展导出的 json 文件解析为 Submission 对象
 */
export function parseImportedSubmissionsJson(
	text: string,
): Submission[] {
	let input: unknown;

	try {
		input = JSON.parse(text) as unknown;
	} catch {
		throw new Error("导入文件不是有效的 JSON");
	}

	return parseImportedSubmissions(input);
}
