import { describe, expect, it } from 'vitest'
import type { Submission } from '../domain/submission'
import type { AIConfig } from './ai-providers'
import { buildFingerprintPayload, computeAnalysisFingerprint } from './analysis-fingerprint'

const config: AIConfig = {
	providerId: 'deepseek',
	apiKey: 'sk-test',
	model: 'deepseek-chat',
}

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
	return {
		platform: 'Luogu',
		submitId: 1,
		submitTime: new Date('2025-11-12T12:00:00.000Z'),
		submitStatus: 'AC',
		submitScore: 100,
		submitContest: null,
		problem: {
			platform: 'Luogu',
			id: 'P1001',
			name: 'A+B Problem',
			difficulty: 1,
		},
		...overrides,
	}
}

describe('computeAnalysisFingerprint', () => {
	it('相同输入得到相同指纹', async () => {
		const submissions = [makeSubmission()]

		const first = await computeAnalysisFingerprint({ submissions, config })
		const second = await computeAnalysisFingerprint({ submissions, config })

		expect(first).toBe(second)
		expect(first).toMatch(/^[0-9a-f]{64}$/)
	})

	it('提交顺序不影响指纹', async () => {
		const a = makeSubmission({ submitId: 1 })
		const b = makeSubmission({ submitId: 2 })

		const forward = await computeAnalysisFingerprint({
			submissions: [a, b],
			config,
		})
		const backward = await computeAnalysisFingerprint({
			submissions: [b, a],
			config,
		})

		expect(forward).toBe(backward)
	})

	it('提交内容变化会改变指纹', async () => {
		const base = await computeAnalysisFingerprint({
			submissions: [makeSubmission()],
			config,
		})

		for (const changed of [
			makeSubmission({ submitStatus: 'WA' }),
			makeSubmission({ submitScore: 60 }),
			makeSubmission({ submitTime: new Date('2025-11-13T00:00:00.000Z') }),
			makeSubmission({ problem: { platform: 'Luogu', id: 'P1002', name: '过河卒', difficulty: 2 } }),
		]) {
			const next = await computeAnalysisFingerprint({
				submissions: [changed],
				config,
			})
			expect(next).not.toBe(base)
		}
	})

	it('新增提交会改变指纹', async () => {
		const one = await computeAnalysisFingerprint({
			submissions: [makeSubmission()],
			config,
		})
		const two = await computeAnalysisFingerprint({
			submissions: [makeSubmission(), makeSubmission({ submitId: 2 })],
			config,
		})

		expect(two).not.toBe(one)
	})

	it('模型、服务商、Base URL 变化会改变指纹', async () => {
		const base = await computeAnalysisFingerprint({
			submissions: [makeSubmission()],
			config,
		})

		for (const changed of [
			{ ...config, model: 'deepseek-reasoner' },
			{ ...config, providerId: 'zhipu' as const, model: 'glm-4-flash' },
			{ ...config, baseUrl: 'https://proxy.example.com' },
		]) {
			const next = await computeAnalysisFingerprint({
				submissions: [makeSubmission()],
				config: changed,
			})
			expect(next).not.toBe(base)
		}
	})

	it('仅更换 API Key 不影响指纹', async () => {
		const submissions = [makeSubmission()]

		const first = await computeAnalysisFingerprint({ submissions, config })
		const second = await computeAnalysisFingerprint({
			submissions,
			config: { ...config, apiKey: 'sk-another-key' },
		})

		expect(second).toBe(first)
	})
})

describe('buildFingerprintPayload', () => {
	it('按平台与提交 ID 排序输出', () => {
		const payload = buildFingerprintPayload({
			submissions: [
				makeSubmission({ submitId: 9 }),
				makeSubmission({ submitId: 2 }),
			],
			config,
		})
		const parsed = JSON.parse(payload) as { submissions: { submitId: number }[] }

		expect(parsed.submissions.map((item) => item.submitId)).toStrictEqual([2, 9])
	})
})
