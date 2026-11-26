import { describe, expect, it } from "vitest";
import type { Submission } from "../domain/submission";
import { createExportFilename, serializeSubmissions } from "./export";

const submission: Submission = {
  platform: "luogu",
  submitId: 246874350,
  submitTime: new Date("2025-11-12T12:16:19.000Z"),
  submitStatus: "AC",
  submitScore: 100,
  submitContest: null,
  problemId: "T684525",
  problemName: "隔墙花影旧相知",
  problemDifficulty: 1,
};

describe("submission export", () => {
  it("serializes dates and includes source metadata", () => {
    const json = serializeSubmissions(
      851600,
      [submission],
      new Date("2026-11-18T08:00:00.000Z"),
    );

    expect(JSON.parse(json)).toStrictEqual({
      source: "luogu",
      uid: 851600,
      exportedAt: "2026-11-18T08:00:00.000Z",
      submissions: [
        {
          ...submission,
          submitTime: "2025-11-12T12:16:19.000Z",
        },
      ],
    });
  });

  it("creates a filesystem-safe filename", () => {
    expect(
      createExportFilename(851600, new Date("2026-11-18T08:00:00.000Z")),
    ).toBe("luogu-851600-2026-11-18T08-00-00-000Z.json");
  });
});
