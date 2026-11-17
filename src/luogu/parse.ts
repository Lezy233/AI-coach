import type { Submission } from "../toSubmission";
import {
  STATUS_TO_VERDICT,
  type RawLuoguRecord
} from "./contract";

type UnknownRecord = Record<string, unknown>;

function isObject( value: unknown): value is UnknownRecord {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isNullableObject(
  value: unknown
): value is UnknownRecord | null {
  return value === null || isObject(value);
}

/**
 * 兼容：
 * 1. result: [...]
 * 2. result: { "0": {...}, "1": {...}, ... }
 */
function normalizeResult(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isObject(value)) {
    throw new Error("响应中的 result 不是数组或数字索引对象");
  }

  const entries = Object.entries(value);

  if (!entries.every(([key]) => /^\d+$/.test(key))) {
    throw new Error("响应中的 result 对象不是数字索引对象");
  }

  return entries
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, record]) => record);
}

function readRecords(input: unknown): unknown[] {
  if (!isObject(input)) {
    throw new Error("响应必须是对象");
  }

  if (!isObject(input.data) || !isObject(input.data.records)) {
    throw new Error("响应中的 data.records 格式不正确");
  }

  return normalizeResult(input.data.records.result);
}

/**
 * 读取成功响应后的记录数组
 */
function parseRecord(input: unknown): RawLuoguRecord {
  if (!isObject(input)) {
    throw new Error("提交记录必须是对象");
  }

	if (
    !isNumber(input.id) || !Number.isInteger(input.id) ||         // id
    !isNumber(input.status) || !Number.isInteger(input.status) || // status
    !isNullableNumber(input.score) ||                             // score  
    !isNumber(input.submitTime) ||                                // submitTime
    !isNullableObject(input.contest) ||                           // contest
		!isObject(input.problem) || 																	// problem
		typeof input.problem.pid !== "string" ||
		typeof input.problem.name !== "string"
	) {
		throw new Error("提交记录字段不符合预期");
	}

	return {
		id: input.id,
		status: input.status,
		score: input.score,
		submitTime: input.submitTime,
		contest: input.contest,
		problem: {
			pid: input.problem.pid,
			name: input.problem.name,
		},
	};
}

function toSubmission(input: RawLuoguRecord): Submission {
	const verdict = STATUS_TO_VERDICT[input.status];

	if (verdict === undefined) {
		throw new Error(`未知的提交状态码: ${input.status}`);
	}

	return {
		id: input.id,
		score: input.score,
		submitTime: new Date(input.submitTime * 1000),
		contest: input.contest,
		problem: input.problem.pid,
		verdict,
	};
}

export function parseSubmissionsPage(input: unknown): Submission[] {
  return readRecords(input).map((record) => {
    return toSubmission(parseRecord(record));
  });
}
