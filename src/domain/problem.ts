import type { Platform } from './platform';

export type Problem = {
	platform: Platform;
	id: string;
	name: string;
	difficulty: number | null;
}