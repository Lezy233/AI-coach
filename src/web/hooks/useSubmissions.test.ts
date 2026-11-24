import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "../../domain/submission";
import useSubmissions from "./useSubmissions";

const { bulkPut, put, setSubs, toArray } = vi.hoisted(() => ({
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
    bulkPut.mockResolvedValue(undefined);
    toArray.mockResolvedValue(storedRows);

    const { addSubmission } = useSubmissions();
    await addSubmission(batch);

    expect(bulkPut).toHaveBeenCalledWith(batch);
    expect(put).not.toHaveBeenCalled();
    expect(toArray).toHaveBeenCalledTimes(1);
    expect(setSubs).toHaveBeenCalledWith(storedRows);
  });
});
