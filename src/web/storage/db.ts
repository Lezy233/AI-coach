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

	constructor() {
		super('AppDatabase');
		this.version(1).stores({
			submissions: '[platform+submitId]',
			analysisLog: '++id, createdAt',
		});
	}
}

export const db = new AppDatabase();