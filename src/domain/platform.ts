export const PLATFORMS = [
	"Luogu", 			// www.luogu.com.cn
	"Codeforces", // codeforces.com
	"AtCoder", 		// atcoder.jp
	"LeetCode", 	// leetcode.com
	"LeetCodeCN", // leetcode.cn
	"HDU", 				// hdu.edu.cn
	"POJ", 				// poj.org
	"UVA", 				// uva.onlinejudge.org
	"CFGym", 			// codeforces.com/gym
	"Other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

const platformSet: ReadonlySet<string> = new Set(PLATFORMS);

export function isPlatform(value: unknown): value is Platform {
	return typeof value === "string" && platformSet.has(value);
}
