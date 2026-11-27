import {
	isCatalog,
	type AnalysisResult,
	type FollowUp,
	type Suggestion,
} from '../domain/analysis';
import { isPlatform } from '../domain/platform';
import type { Problem } from '../domain/problem';

type UnknownRecord = Record<string, unknown>;

const FOLLOW_UP_STATUSES: ReadonlySet<FollowUp['status']> = new Set([
	'not-done',
	'in-progress',
	'done',
]);

function isObject(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isFollowUpStatus(value: unknown): value is FollowUp['status'] {
	return typeof value === 'string' &&
		FOLLOW_UP_STATUSES.has(value as FollowUp['status']);
}

function invalid(path: string): Error {
	return new Error(`分析结果中的 ${path} 字段不符合预期`);
}

function readString(
	input: UnknownRecord,
	key: string,
	path: string,
	allowEmpty = false,
): string {
	const value = input[key];

	if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
		throw invalid(path);
	}

	return value;
}

function parseProblem(input: unknown, path: string): Problem {
	if (!isObject(input)) {
		throw invalid(path);
	}

	if (
		!isPlatform(input.platform) ||
		typeof input.id !== 'string' || input.id.length === 0 ||
		typeof input.name !== 'string' || input.name.length === 0 ||
		!(input.difficulty === null || isFiniteNumber(input.difficulty))
	) {
		throw invalid(path);
	}

	return {
		platform: input.platform,
		id: input.id,
		name: input.name,
		difficulty: input.difficulty,
	};
}

function parseSuggestion(input: unknown, index: number): Suggestion {
	const path = `suggestions[${index}]`;

	if (!isObject(input)) {
		throw invalid(path);
	}

	const title = readString(input, 'title', `${path}.title`);
	const basis = readString(input, 'basis', `${path}.basis`);
	let detail: string | undefined;

	if (input.detail !== undefined && input.detail !== null) {
		if (typeof input.detail !== 'string') {
			throw invalid(`${path}.detail`);
		}
		detail = input.detail;
	}

	let relatedProblems: Problem[] = [];

	if (input.relatedProblems !== undefined && input.relatedProblems !== null) {
		if (!Array.isArray(input.relatedProblems)) {
			throw invalid(`${path}.relatedProblems`);
		}

		relatedProblems = input.relatedProblems.map((problem, problemIndex) =>
			parseProblem(problem, `${path}.relatedProblems[${problemIndex}]`),
		);
	}

	const suggestion: Suggestion = {
		category: isCatalog(input.category) ? input.category : 'other',
		title,
		relatedProblems,
		basis,
	};

	if (detail !== undefined) {
		suggestion.detail = detail;
	}

	return suggestion;
}

function parseFollowUp(input: unknown, index: number): FollowUp {
	const path = `followUp[${index}]`;

	if (!isObject(input)) {
		throw invalid(path);
	}

	const suggestionRef = readString(input, 'suggestionRef', `${path}.suggestionRef`);
	const status = input.status;

	if (!isFollowUpStatus(status)) {
		throw invalid(`${path}.status`);
	}

	return {
		suggestionRef,
		status,
		comments: readString(input, 'comments', `${path}.comments`, true),
	};
}

export function parseAnalysisResult(input: unknown): AnalysisResult {
	if (!isObject(input)) {
		throw new Error('分析结果必须是对象');
	}

	const summary = readString(input, 'summary', 'summary');

	if (!Array.isArray(input.suggestions)) {
		throw invalid('suggestions');
	}

	const result: AnalysisResult = {
		summary,
		suggestions: input.suggestions.map(parseSuggestion),
	};

	if (input.masteryProfile !== undefined && input.masteryProfile !== null) {
		result.masteryProfile = readString(
			input,
			'masteryProfile',
			'masteryProfile',
			true,
		);
	}

	if (input.followUp !== undefined && input.followUp !== null) {
		if (!Array.isArray(input.followUp)) {
			throw invalid('followUp');
		}

		result.followUp = input.followUp.map(parseFollowUp);
	}

	return result;
}

function extractJson(text: string): string {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	const candidate = fenced?.[1]?.trim() ?? trimmed;
	const start = candidate.indexOf('{');
	const end = candidate.lastIndexOf('}');

	if (start === -1 || end <= start) {
		throw new Error('分析结果不是有效的 JSON');
	}

	return candidate.slice(start, end + 1);
}

export function parseAnalysisResultJson(text: string): AnalysisResult {
	let input: unknown;

	try {
		input = JSON.parse(extractJson(text));
	} catch {
		throw new Error('分析结果不是有效的 JSON');
	}

	return parseAnalysisResult(input);
}
