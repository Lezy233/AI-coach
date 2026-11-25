import { describe, expect, it } from "vitest";
import type { Submission } from "./submission";
import { computeStats } from "./stats";

function makeSubmission(overrides: Partial<Submission>): Submission {
  return {
    platform: "luogu",
    id: 1,
    score: null,
    submitTime: new Date("2025-01-01T00:00:00.000Z"),
    contest: null,
    problem: "P1",
    verdict: "WA",
    ...overrides,
  };
}

describe("computeStats", () => {
  it("空提交记录返回全零统计", () => {
    expect(computeStats([])).toStrictEqual({
      total: 0,
      accepted: 0,
      acceptedRate: 0,
      byVerdict: {
        CE: 0,
        OLE: 0,
        MLE: 0,
        TLE: 0,
        WA: 0,
        RE: 0,
        UKE: 0,
        AC: 0,
        NAC: 0,
      },
      byDay: {},
    });
  });

  it("统计总数、AC 数、通过率和各判定次数", () => {
    const submissions = [
      makeSubmission({ id: 1, verdict: "AC" }),
      makeSubmission({ id: 2, verdict: "AC" }),
      makeSubmission({ id: 3, verdict: "NAC" }),
      makeSubmission({ id: 4, verdict: "WA" }),
      makeSubmission({ id: 5, verdict: "CE" }),
    ];

    expect(computeStats(submissions)).toStrictEqual({
      total: 5,
      accepted: 2,
      acceptedRate: 0.4,
      byVerdict: {
        CE: 1,
        OLE: 0,
        MLE: 0,
        TLE: 0,
        WA: 1,
        RE: 0,
        UKE: 0,
        AC: 2,
        NAC: 1,
      },
      byDay: {
        "2025-01-01": 5,
      },
    });
  });

  it("按 UTC 日期分组提交数", () => {
    const submissions = [
      makeSubmission({
        id: 1,
        submitTime: new Date("2025-11-12T23:30:00.000Z"),
      }),
      makeSubmission({
        id: 2,
        verdict: "AC",
        submitTime: new Date("2025-11-13T00:30:00.000Z"),
      }),
      makeSubmission({
        id: 3,
        verdict: "NAC",
        submitTime: new Date("2025-11-13T01:00:00.000Z"),
      }),
    ];

    expect(computeStats(submissions).byDay).toStrictEqual({
      "2025-11-12": 1,
      "2025-11-13": 2,
    });
  });

  it("不把部分通过的 NAC 计入通过数", () => {
    const submissions = [
      makeSubmission({ id: 1, verdict: "AC" }),
      makeSubmission({ id: 2, verdict: "NAC" }),
    ];

    expect(computeStats(submissions)).toMatchObject({
      total: 2,
      accepted: 1,
      acceptedRate: 0.5,
    });
  });
});
