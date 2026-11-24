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
    id: 246901955,
    score: 70,
    submitTime: new Date("2025-11-12T13:39:38.000Z"),
    contest: null,
    problem: "T684526",
    verdict: "NAC",
  },
  {
    id: 246874350,
    score: 100,
    submitTime: new Date("2025-11-12T12:16:19.000Z"),
    contest: null,
    problem: "T684525",
    verdict: "AC",
  },
];

describe("useSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bulk-puts source IDs and replaces state with database rows", async () => {
    const storedRows = [batch[1], batch[0]];
    bulkGet.mockResolvedValue([undefined, undefined]);
    bulkPut.mockResolvedValue(undefined);
    toArray.mockResolvedValue(storedRows);

    const { importSubmissions } = useSubmissions();
    const result = await importSubmissions(batch);

    expect(bulkGet).toHaveBeenCalledWith(batch.map(({ id }) => id));
    expect(bulkPut).toHaveBeenCalledWith(batch);
    expect(put).not.toHaveBeenCalled();
    expect(toArray).toHaveBeenCalledTimes(1);
    expect(setSubs).toHaveBeenCalledWith(storedRows);
    expect(result).toStrictEqual({ imported: 2, overwritten: 0 });
  });

  it("counts existing IDs as overwritten", async () => {
    bulkGet.mockResolvedValue([batch[0], undefined]);
    bulkPut.mockResolvedValue(undefined);
    toArray.mockResolvedValue(batch);

    const { importSubmissions } = useSubmissions();
    const result = await importSubmissions(batch);

    expect(result).toStrictEqual({ imported: 1, overwritten: 1 });
  });
});
