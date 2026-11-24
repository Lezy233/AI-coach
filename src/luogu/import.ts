import type { Submission, Verdict } from "../domain/submission";
import { isObject } from "./parse";

const VERDICTS = new Set<Submission["verdict"]>([
  "CE",
  "OLE",
  "MLE",
  "TLE",
  "WA",
  "RE",
  "UKE",
  "AC",
  "NAC",
]);

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value);
}

function isValidDateString(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}

	const iso8601DateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
	return iso8601DateTime.test(value) && !Number.isNaN(Date.parse(value));
}

function isVerdict(value: unknown): value is Verdict {
	return typeof value === "string" && VERDICTS.has(value as Submission["verdict"]);
}

function parseImportedSubmission(
	input: unknown,
	index: number,
): Submission {
  if (!isObject(input)) {
		throw new Error(`导入文件中的 submission[${index}] 必须是对象`);
	}

	if (
    !isInteger(input.id) ||
    !(input.score === null || isFiniteNumber(input.score)) ||
		!isValidDateString(input.submitTime) ||
    !(input.contest === null || isObject(input.contest)) ||
		typeof input.problem !== "string" || input.problem.length === 0 ||
		!isVerdict(input.verdict)
	) {
		throw new Error(`导入文件中的 submission[${index}] 字段不符合预期`);
	}

	return {
		id: input.id,
		score: input.score,
		submitTime: new Date(input.submitTime),
		contest: input.contest,
		problem: input.problem,
		verdict: input.verdict,
	}
}

/**
 * @abstract 将浏览器拓展导出的 json 文件解析为 Submission 对象
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

	return input.submissions.map(parseImportedSubmission);
}

/**
 * @abstract 将浏览器拓展导出的 json 文件解析为 Submission 对象
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
