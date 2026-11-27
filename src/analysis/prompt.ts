import type { AnalysisResult } from '../domain/analysis';
import type { SubmissionStats } from '../domain/stats';
import type { Submission } from '../domain/submission';
import type { ChatMessage } from './client';

export type BuildAnalysisMessagesInput = {
	submissions: readonly Submission[];
	stats: SubmissionStats;
	previousResult?: AnalysisResult | null;
};

const SYSTEM_PROMPT = [
	'你是一位算法竞赛教练，负责根据用户的完整提交记录给出下一阶段的训练建议。',
	'',
	'只输出一个 JSON 对象，不要输出 Markdown 代码块、说明文字或任何 JSON 之外的字符。',
	'',
	'输出结构：',
	'{',
	'  "summary": "对当前水平的简要总结",',
	'  "suggestions": [',
	'    {',
	'      "category": "巩固旧知识点 | 接触新知识点 | 提高难度 | 同水平变体 | 重做旧题 | other",',
	'      "title": "一句话建议",',
	'      "detail": "可选的展开说明",',
	'      "relatedProblems": [',
	'        { "platform": "Luogu", "id": "P1001", "name": "题目名", "difficulty": 1 }',
	'      ],',
	'      "basis": "这条建议依据的统计数字或提交记录"',
	'    }',
	'  ],',
	'  "masteryProfile": "可选的知识点掌握情况",',
	'  "followUp": [',
	'    {',
	'      "suggestionRef": "上一轮建议的 title",',
	'      "status": "not-done | in-progress | done",',
	'      "comments": "对完成情况的点评"',
	'    }',
	'  ]',
	'}',
	'',
	'规则：',
	'- category 只能使用上面列出的值；无法归类时使用 "other"。',
	'- suggestions 按优先级从高到低排列，数量根据数据决定，不要为了凑数而编造。',
	'- relatedProblems 可以为空数组；其中的 platform 必须是合法平台，difficulty 可以是 null。',
	'- basis 必须引用输入中的具体事实，例如某类 verdict 的次数、AC 率、某段时间的提交数或具体题目，不要空泛描述。',
	'- 如果输入包含上一轮分析结果，它会在前一条 assistant 消息中；请为上一轮每条 suggestion 输出一条 followUp，suggestionRef 使用对应的 title。',
	'- 如果没有上一轮分析结果，省略 followUp 字段。',
	'- 不要编造输入中不存在的提交记录或题目；信息不足时给出更少但更可靠的建议。',
].join('\n');

function buildUserContent(
	submissions: readonly Submission[],
	stats: SubmissionStats,
	hasPreviousResult: boolean,
): string {
	const parts = [
		'## 统计数据',
		'```json',
		JSON.stringify(stats, null, 2),
		'```',
		'',
		`## 全量提交记录（${submissions.length} 条）`,
		'```json',
		JSON.stringify(submissions),
		'```',
		'',
	];

	parts.push(
		hasPreviousResult
			? '上一条 assistant 消息是上一轮分析结果，请结合它生成新一轮结果并填写 followUp。'
			: '本次没有上一轮分析结果，请省略 followUp 字段。',
		'请只输出符合要求的 JSON。',
	);

	return parts.join('\n');
}

export function buildAnalysisMessages({
	submissions,
	stats,
	previousResult,
}: BuildAnalysisMessagesInput): ChatMessage[] {
	const hasPreviousResult = previousResult !== undefined && previousResult !== null;
	const messages: ChatMessage[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
	];

	if (hasPreviousResult) {
		messages.push({
			role: 'assistant',
			content: JSON.stringify(previousResult, null, 2),
		});
	}

	messages.push({
		role: 'user',
		content: buildUserContent(submissions, stats, hasPreviousResult),
	});

	return messages;
}
