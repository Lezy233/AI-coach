import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../domain/analysis';
import { parseAnalysisResult, parseAnalysisResultJson } from './parse';

const result: AnalysisResult = {
	summary: '近期 AC 率稳定，但 WA 集中在图论题。',
	suggestions: [
		{
			category: '巩固旧知识点',
			title: '复习最短路',
			detail: '重点复习 Dijkstra 的堆优化写法。',
			relatedProblems: [
				{
					platform: 'Luogu',
					id: 'P4779',
					name: '【模板】单源最短路径（标准版）',
					difficulty: 3,
				},
			],
			basis: 'WA 记录集中在图论题，最近 10 次提交中 4 次为 WA。',
		},
	],
	masteryProfile: '基础算法掌握较好，图论稳定性不足。',
	followUp: [
		{
			suggestionRef: '复习最短路',
			status: 'in-progress',
			comments: '已经开始复习，但还没有完成模板题。',
		},
	],
};

describe('parseAnalysisResult', () => {
	it('解析完整的 AnalysisResult', () => {
		expect(parseAnalysisResult(result)).toStrictEqual(result);
	});

	it('未收录的 category 落为 other', () => {
		const parsed = parseAnalysisResult({
			...result,
			suggestions: [
				{
					...result.suggestions[0],
					category: '未知分类',
				},
			],
		});

		expect(parsed.suggestions[0].category).toBe('other');
	});

	it('缺失 category 时落为 other', () => {
		const parsed = parseAnalysisResult({
			summary: '总结',
			suggestions: [
				{
					title: '建议',
					relatedProblems: [],
					basis: '依据',
				},
			],
		});

		expect(parsed.suggestions[0].category).toBe('other');
	});

	it('省略可选的 detail、masteryProfile 和 followUp', () => {
		expect(parseAnalysisResult({
			summary: '总结',
			suggestions: [
				{
					category: 'other',
					title: '建议',
					relatedProblems: [],
					basis: '依据',
				},
			],
		})).toStrictEqual({
			summary: '总结',
			suggestions: [
				{
					category: 'other',
					title: '建议',
					relatedProblems: [],
					basis: '依据',
				},
			],
		});
	});

	it('relatedProblems 缺失时默认为空数组', () => {
		const parsed = parseAnalysisResult({
			summary: '总结',
			suggestions: [
				{
					category: 'other',
					title: '建议',
					basis: '依据',
				},
			],
		});

		expect(parsed.suggestions[0].relatedProblems).toStrictEqual([]);
	});

	it('拒绝非法的 followUp.status', () => {
		expect(() => parseAnalysisResult({
			...result,
			followUp: [
				{
					suggestionRef: '复习最短路',
					status: 'unknown',
					comments: '点评',
				},
			],
		})).toThrow(/followUp\[0\]\.status/);
	});

	it('拒绝非法的 relatedProblems 平台', () => {
		expect(() => parseAnalysisResult({
			...result,
			suggestions: [
				{
					...result.suggestions[0],
					relatedProblems: [
						{
							platform: 'unknown',
							id: 'P1',
							name: '题目',
							difficulty: null,
						},
					],
				},
			],
		})).toThrow(/relatedProblems\[0\]/);
	});

	it('拒绝缺少 suggestions 的结果', () => {
		expect(() => parseAnalysisResult({ summary: '总结' }))
			.toThrow(/suggestions/);
	});
});

describe('parseAnalysisResultJson', () => {
	it('解析纯 JSON 文本', () => {
		expect(parseAnalysisResultJson(JSON.stringify(result)))
			.toStrictEqual(result);
	});

	it('解析 Markdown JSON 代码块', () => {
		expect(parseAnalysisResultJson(
			'```json\n' + JSON.stringify(result, null, 2) + '\n```',
		)).toStrictEqual(result);
	});

	it('拒绝非法 JSON 文本', () => {
		expect(() => parseAnalysisResultJson('{')).toThrow('分析结果不是有效的 JSON');
	});
});
