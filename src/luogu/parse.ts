import type { Submission } from "../domain/submission";
import {
  STATUS_TO_VERDICT,
  type RawLuoguRecord
} from "./contract";
import {
  isObject,
  isNullableObject,
  isFiniteNumber,
  isNullableNumber,
} from "./guards";

/**
 * 兼容：
 * 1. result: [...]
 * 2. result: { "0": {...}, "1": {...}, ... }
 */
export function normalizeResult(value: unknown): unknown[] {
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
    !isFiniteNumber(input.id) || !Number.isInteger(input.id) ||         // id
    !isFiniteNumber(input.status) || !Number.isInteger(input.status) || // status
    !(input.score === undefined || isNullableNumber(input.score)) || // score
    !isFiniteNumber(input.submitTime) ||                                // submitTime
    !isNullableObject(input.contest) ||                           // contest
		!isObject(input.problem) || 																	// problem
		typeof input.problem.pid !== "string" || input.problem.pid.length === 0 ||
		typeof input.problem.name !== "string" ||
		!(input.problem.difficulty === null || isFiniteNumber(input.problem.difficulty))
	) {
		throw new Error("提交记录字段不符合预期");
	}

	return {
		id: input.id,
		status: input.status,
		score: input.score ?? null,
		submitTime: input.submitTime,
		contest: input.contest,
		problem: {
			pid: input.problem.pid,
			name: input.problem.name,
			difficulty: input.problem.difficulty,
		},
	};
}

function toSubmission(input: RawLuoguRecord): Submission {
	const submitStatus = STATUS_TO_VERDICT[input.status]; // 原始 status 转译

	if (submitStatus === undefined) {
		throw new Error(`未知的提交状态码: ${input.status}`);
	}

	return {
		platform: "luogu",
		submitId: input.id,
		submitTime: new Date(input.submitTime * 1000),
		submitStatus,
		submitScore: input.score,
		submitContest: input.contest,
		problemId: input.problem.pid,
		problemName: input.problem.name,
		problemDifficulty: input.problem.difficulty,
	};
}

export function parseSubmissionsPage(input: unknown): Submission[] {
  return readRecords(input).map((record) => {
    return toSubmission(parseRecord(record));
  });
}
