import type { Submission } from "../domain/submission";
import {
	isObject,
	isFiniteNumber,
	isInteger,
	isValidDateString,
	isVerdict,
} from "./guards";


function parseImportedSubmission(
	platform: string,
	input: unknown,
	index: number,
): Submission {
  if (!isObject(input)) {
		throw new Error(`导入文件中的 submission[${index}] 必须是对象`);
	}

	if (
    !isInteger(input.submitId) ||
    !(input.submitScore === null || isFiniteNumber(input.submitScore)) ||
		!isValidDateString(input.submitTime) ||
    !(input.submitContest === null || isObject(input.submitContest)) ||
		typeof input.problemId !== "string" || input.problemId.length === 0 ||
		typeof input.problemName !== "string" || input.problemName.length === 0 ||
		!(input.problemDifficulty === null || isFiniteNumber(input.problemDifficulty)) ||
		!isVerdict(input.submitStatus) ||
		(input.platform !== undefined && input.platform !== platform)
	) {
		throw new Error(`导入文件中的 submission[${index}] 字段不符合预期`);
	}

	return {
		platform,
		submitId: input.submitId,
		submitTime: new Date(input.submitTime),
		submitStatus: input.submitStatus,
		submitScore: input.submitScore,
		submitContest: input.submitContest,
		problemId: input.problemId,
		problemName: input.problemName,
		problemDifficulty: input.problemDifficulty,
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

	if (input.source !== "luogu") {
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

	const platform = input.source;

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
