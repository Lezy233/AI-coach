import Dexie, { type Table } from 'dexie';
import type { AnalysisResult } from '../../domain/analysis';
import type { Submission, SubmissionKey } from '../../domain/submission';

export type AnalysisLogEntry = {
	id?: number;
	createdAt: Date;
	result: AnalysisResult;
	inputSummary: string;
};

class AppDatabase extends Dexie {
	submissions!: Table<Submission, SubmissionKey>;
	analysisLog!: Table<AnalysisLogEntry, number>;

	constructor() { // 投入生产环境前每次修改无须考虑兼容性，直接弃库
		super('AppDatabase');
		this.version(1).stores({
			submissions: '[platform+submitId]',
			analysisLog: '++id, createdAt',
		});
	}
}

export const db = new AppDatabase();