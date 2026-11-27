import type { Submission } from '../domain/submission'
import type { AIConfig } from './ai-providers'
import { resolveBaseUrl } from './ai-providers'

export type AnalysisFingerprintInput = {
	submissions: readonly Submission[]
	config: AIConfig
}

function canonicalSubmission(submission: Submission): Record<string, unknown> {
	return {
		platform: submission.platform,
		submitId: submission.submitId,
		submitTime: submission.submitTime.toISOString(),
		submitStatus: submission.submitStatus,
		submitScore: submission.submitScore,
		submitContest: submission.submitContest,
		problem: {
			platform: submission.problem.platform,
			id: submission.problem.id,
			name: submission.problem.name,
			difficulty: submission.problem.difficulty,
		},
	}
}

/**
 * 指纹只覆盖「会进入 prompt 的输入」：提交记录快照 + 当前模型配置。
 * 与时间戳无关，因此提交顺序变化不会影响结果。
 */
export function buildFingerprintPayload({
	submissions,
	config,
}: AnalysisFingerprintInput): string {
	const ordered = [...submissions]
		.sort((a, b) => (
			a.platform === b.platform
				? a.submitId - b.submitId
				: a.platform.localeCompare(b.platform)
		))
		.map(canonicalSubmission)

	return JSON.stringify({
		version: 1,
		model: {
			providerId: config.providerId,
			model: config.model,
			baseUrl: resolveBaseUrl(config),
		},
		submissions: ordered,
	})
}

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

/** 非安全上下文（http + 非 localhost）没有 crypto.subtle 时的兜底 */
function fallbackHash(payload: string): string {
	let hash = 0xcbf29ce484222325n

	for (let index = 0; index < payload.length; index += 1) {
		hash ^= BigInt(payload.charCodeAt(index))
		hash = BigInt.asUintN(64, hash * 0x100000001b3n)
	}

	return hash.toString(16)
}

/**
 * 计算输入指纹，用于「相同输入不重复调用模型」的判定。
 */
export async function computeAnalysisFingerprint(
	input: AnalysisFingerprintInput,
): Promise<string> {
	const payload = buildFingerprintPayload(input)
	const subtle = globalThis.crypto?.subtle

	if (subtle === undefined) {
		return `fnv1a-${fallbackHash(payload)}`
	}

	const digest = await subtle.digest(
		'SHA-256',
		new TextEncoder().encode(payload),
	)

	return toHex(digest)
}
