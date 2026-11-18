import Dexie, { type Table } from 'dexie';
import type { Submission } from '../../domain/submission';

class AppDatabase extends Dexie {
	submissions!: Table<Submission, number>;

	constructor() {
		super('AppDatabase');
		this.version(1).stores({
			submissions: "id",
		});
	}
}

export const db = new AppDatabase();