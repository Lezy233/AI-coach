import Dexie, { type Table } from 'dexie';
import type { Submission, SubmissionKey } from '../../domain/submission';

class AppDatabase extends Dexie {
	submissions!: Table<Submission, SubmissionKey>;

	constructor() {
		super('AppDatabase');
		this.version(1).stores({
			submissions: '[platform+id]',
		});
	}
}

export const db = new AppDatabase();