import { isPlatform } from "../domain/platform";
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

function parseImportedProblem(
	input: Record<string, unknown>,
	index: number,
): Problem {
	if (!isObject(input.problem)) {
		throw invalidSubmission(index);
	}

	const problem = input.problem;

	if (
		!isPlatform(problem.platform) ||
		typeof problem.id !== "string" || problem.id.length === 0 ||
		typeof problem.name !== "string" || problem.name.length === 0 ||
		!(problem.difficulty === null || isFiniteNumber(problem.difficulty))
	) {
		throw invalidSubmission(index);
	}

	return {
		platform: problem.platform,
		id: problem.id,
		name: problem.name,
		difficulty: problem.difficulty,
	};
}

function parseImportedSubmission(
	input: unknown,
	index: number,
): Submission {
  if (!isObject(input)) {
		throw new Error(`导入文件中的 submission[${index}] 必须是对象`);
	}

	if (
		input.platform !== LUOGU_PLATFORM ||
    !isInteger(input.submitId) ||
    !(input.submitScore === null || isFiniteNumber(input.submitScore)) ||
		!isValidDateString(input.submitTime) ||
    !(input.submitContest === null || isObject(input.submitContest)) ||
		!isVerdict(input.submitStatus)
	) {
		throw invalidSubmission(index);
	}

	return {
		platform: LUOGU_PLATFORM,
		submitId: input.submitId,
		submitTime: new Date(input.submitTime),
		submitStatus: input.submitStatus,
		submitScore: input.submitScore,
		submitContest: input.submitContest,
		problem: parseImportedProblem(input, index),
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

	if (input.source !== LUOGU_SOURCE) {
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

	return input.submissions.map((record, index) =>
		parseImportedSubmission(record, index),
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
