import type { Submission, Verdict } from "../domain/submission";
import { VERDICTS } from "./contract";

type UnknownRecord = Record<string, unknown>;

export function isObject( value: unknown): value is UnknownRecord {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

export function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

export function isNullableNumber(value: unknown): value is number | null {
	return value === null || isFiniteNumber(value);
}

export function isInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value);
}

export function isPositiveInteger(value: unknown): value is number {
	return ( isInteger(value) && value > 0);
}

export function isNonNegativeInteger(value: unknown): value is number {
	return ( isInteger(value) && value >= 0);
}

export function isNullableObject(
  value: unknown
): value is UnknownRecord | null {
  return value === null || isObject(value);
}

/**
 * 检查 value 是否符合 ISO 8601 日期格式
 */
export function isValidDateString(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}

	const iso8601DateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
	return iso8601DateTime.test(value) && !Number.isNaN(Date.parse(value));
}

export function isVerdict(value: unknown): value is Verdict {
	return typeof value === "string" && VERDICTS.has(value as Submission["verdict"]);
}