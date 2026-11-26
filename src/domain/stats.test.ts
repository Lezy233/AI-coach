import { describe, expect, it } from "vitest";
import type { Submission } from "./submission";
import { computeStats } from "./stats";

function makeSubmission(overrides: Partial<Submission>): Submission {
  return {
    platform: "luogu",
    submitId: 1,
    submitTime: new Date("2025-01-01T00:00:00.000Z"),
    submitStatus: "WA",
    submitScore: null,
    submitContest: null,
    problemId: "P1",
    problemName: "测试题目",
    problemDifficulty: null,
    ...overrides,
  };
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

describe("computeStats", () => {
  it("本地午夜两侧的记录归入不同日期", () => {
    const localMidnight = new Date(2025, 0, 15);
    const beforeMidnight = new Date(localMidnight.getTime() - 60_000);
    const afterMidnight = new Date(localMidnight.getTime() + 60_000);

    const submissions = [
      makeSubmission({ submitId: 1, submitTime: beforeMidnight }),
      makeSubmission({ submitId: 2, submitStatus: "AC", submitTime: afterMidnight }),
    ];

    expect(computeStats(submissions).byDay).toStrictEqual({
      [formatLocalDate(beforeMidnight)]: 1,
      [formatLocalDate(afterMidnight)]: 1,
    });
  });

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
      makeSubmission({ submitId: 1, submitStatus: "AC" }),
      makeSubmission({ submitId: 2, submitStatus: "AC" }),
      makeSubmission({ submitId: 3, submitStatus: "NAC" }),
      makeSubmission({ submitId: 4, submitStatus: "WA" }),
      makeSubmission({ submitId: 5, submitStatus: "CE" }),
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

  it("按本地日期分组提交数", () => {
    const submissions = [
      makeSubmission({
        submitId: 1,
        submitTime: new Date(2025, 10, 13, 8, 0),
      }),
      makeSubmission({
        submitId: 2,
        submitStatus: "AC",
        submitTime: new Date(2025, 10, 13, 9, 0),
      }),
      makeSubmission({
        submitId: 3,
        submitStatus: "NAC",
        submitTime: new Date(2025, 10, 13, 10, 0),
      }),
    ];

    expect(computeStats(submissions).byDay).toStrictEqual({
      "2025-11-13": 3,
    });
  });

  it("不把部分通过的 NAC 计入通过数", () => {
    const submissions = [
      makeSubmission({ submitId: 1, submitStatus: "AC" }),
      makeSubmission({ submitId: 2, submitStatus: "NAC" }),
    ];

    expect(computeStats(submissions)).toMatchObject({
      total: 2,
      accepted: 1,
      acceptedRate: 0.5,
    });
  });
});