import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "../../domain/submission";
import useSubmissions from "./useSubmissions";

const { bulkGet, bulkPut, put, setSubs, toArray } = vi.hoisted(() => ({
  bulkGet: vi.fn(),
  bulkPut: vi.fn(),
  put: vi.fn(),
  setSubs: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: vi.fn(),
  useState: vi.fn(() => [[], setSubs]),
}));

vi.mock("../storage/db", () => ({
  db: {
    submissions: {
      bulkGet,
      bulkPut,
      put,
      toArray,
    },
  },
}));

const batch: Submission[] = [
  {
    platform: "Luogu",
    submitId: 246901955,
    submitTime: new Date("2025-11-12T13:39:38.000Z"),
    submitStatus: "NAC",
    submitScore: 70,
    submitContest: null,
    problem: {
      platform: "Luogu",
      id: "T684526",
      name: "伊波恩·弗塔根的抄本",
      difficulty: 3,
    },
  },
  {
    platform: "Luogu",
    submitId: 246874350,
    submitTime: new Date("2025-11-12T12:16:19.000Z"),
    submitStatus: "AC",
    submitScore: 100,
    submitContest: null,
    problem: {
      platform: "Luogu",
      id: "T684525",
      name: "隔墙花影旧相知",
      difficulty: 1,
    },
  },
];

describe("useSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bulk-puts compound keys and replaces state with database rows", async () => {
    const storedRows = [batch[1], batch[0]];
    bulkGet.mockResolvedValue([undefined, undefined]);
    bulkPut.mockResolvedValue(undefined);
    toArray.mockResolvedValue(storedRows);

    const { importSubmissions } = useSubmissions();
    const result = await importSubmissions(batch);

    expect(bulkGet).toHaveBeenCalledWith([
      ["Luogu", 246901955],
      ["Luogu", 246874350],
    ]);
    expect(bulkPut).toHaveBeenCalledWith(batch);
    expect(put).not.toHaveBeenCalled();
    expect(toArray).toHaveBeenCalledTimes(1);
    expect(setSubs).toHaveBeenCalledWith(storedRows);
    expect(result).toStrictEqual({ imported: 2, overwritten: 0 });
  });

  it("counts existing compound keys as overwritten", async () => {
    bulkGet.mockResolvedValue([batch[0], undefined]);
    bulkPut.mockResolvedValue(undefined);
    toArray.mockResolvedValue(batch);

    const { importSubmissions } = useSubmissions();
    const result = await importSubmissions(batch);

    expect(result).toStrictEqual({ imported: 1, overwritten: 1 });
  });

  it("treats equal IDs from different platforms as distinct submissions", async () => {
    const otherPlatformSubmission: Submission = { ...batch[0], platform: "Codeforces" };
    bulkGet.mockResolvedValue([undefined, undefined]);
    bulkPut.mockResolvedValue(undefined);
    toArray.mockResolvedValue([batch[0], otherPlatformSubmission]);

    const { importSubmissions } = useSubmissions();
    const result = await importSubmissions([batch[0], otherPlatformSubmission]);

    expect(bulkGet).toHaveBeenCalledWith([
      ["Luogu", 246901955],
      ["Codeforces", 246901955],
    ]);
    expect(result).toStrictEqual({ imported: 2, overwritten: 0 });
  });
});
