import { describe, expect, it } from 'vitest';
import { computeStats } from '../domain/stats';
import type { Submission } from '../domain/submission';
import type { AnalysisResult } from '../domain/analysis';
import { buildAnalysisMessages } from './prompt';

const submissions: Submission[] = [
	{
		platform: 'Luogu',
		submitId: 1,
		submitTime: new Date('2025-11-12T12:00:00.000Z'),
		submitStatus: 'WA',
		submitScore: 30,
		submitContest: null,
		problem: {
			platform: 'Luogu',
			id: 'P1001',
			name: 'A+B Problem',
			difficulty: 1,
		},
	},
	{
		platform: 'Luogu',
		submitId: 2,
		submitTime: new Date('2025-11-13T12:00:00.000Z'),
		submitStatus: 'AC',
		submitScore: 100,
		submitContest: null,
		problem: {
			platform: 'Luogu',
			id: 'P1002',
			name: '过河卒',
			difficulty: 2,
		},
	},
];

const stats = computeStats(submissions);

const previousResult: AnalysisResult = {
	summary: '上一轮总结',
	suggestions: [
		{
			category: 'other',
			title: '上一轮建议',
			relatedProblems: [],
			basis: '上一轮依据',
		},
	],
};

describe('buildAnalysisMessages', () => {
	it('组装 system 与 user 消息，并包含全量提交和统计', () => {
		const messages = buildAnalysisMessages({ submissions, stats });

		expect(messages.map(({ role }) => role)).toStrictEqual([
			'system',
			'user',
		]);
		expect(messages[0].content).toContain('JSON');
		expect(messages[1].content).toContain('P1001');
		expect(messages[1].content).toContain('P1002');
		expect(messages[1].content).toContain('"total": 2');
		expect(messages[1].content).toContain('"accepted": 1');
		expect(messages[1].content).toContain('"byVerdict"');
	});

	it('有上一轮结果时将其作为 assistant 消息', () => {
		const messages = buildAnalysisMessages({
			submissions,
			stats,
			previousResult,
		});

		expect(messages.map(({ role }) => role)).toStrictEqual([
			'system',
			'assistant',
			'user',
		]);
		expect(JSON.parse(messages[1].content)).toStrictEqual(previousResult);
		expect(messages[2].content).toContain('followUp');
	});

	it('上一轮结果为 null 时不添加 assistant 消息', () => {
		const messages = buildAnalysisMessages({
			submissions,
			stats,
			previousResult: null,
		});

		expect(messages.map(({ role }) => role)).toStrictEqual([
			'system',
			'user',
		]);
	});
});
