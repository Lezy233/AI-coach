import Dexie, { type Table } from 'dexie';
import type { Submission, SubmissionKey } from '../../domain/submission';

type LegacySubmission = Omit<Submission, 'platform'>;

class AppDatabase extends Dexie {
	submissionsByPlatform!: Table<Submission, SubmissionKey>;

	constructor() {
		super('AppDatabase');
		this.version(1).stores({
			submissions: 'id',
		});
		this.version(2).stores({
			submissions: 'id',
			submissionsByPlatform: '[platform+id]',
		}).upgrade(async (transaction) => {
			const legacySubmissions = await transaction
				.table<LegacySubmission, number>('submissions')
				.toArray();
			const migratedSubmissions: Submission[] = legacySubmissions.map((submission) => ({
				...submission,
				platform: 'luogu',
			}));

			await transaction
				.table<Submission, SubmissionKey>('submissionsByPlatform')
				.bulkPut(migratedSubmissions);
		});
	}
}

export const db = new AppDatabase();