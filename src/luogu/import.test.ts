import { describe, expect, it } from "vitest";
import luogu10086 from "../test/fixtures/luogu-10086.json";
import luogu10087 from "../test/fixtures/luogu-10087.json";
import luogu10088 from "../test/fixtures/luogu-10088.json";
// luogu10089 检查 input.status，但是 status 不是导出文件的字段
// import luogu10089 from "../test/fixtures/luogu-10089.json";
import {
  parseImportedSubmissions,
  parseImportedSubmissionsJson,
} from "./import";

describe("parseImportedSubmissions", () => {
  it("解析浏览器拓展导出的完整 JSON", () => {
    const submissions = parseImportedSubmissions(luogu10086);

    expect(submissions).toHaveLength(luogu10086.submissions.length);
    expect(submissions[0]).toStrictEqual({
      id: 246901955,
      score: 70,
      submitTime: new Date("2025-11-12T13:39:38.000Z"),
      contest: null,
      problem: "T684526",
      verdict: "NAC",
    });
    expect(submissions.at(-1)).toStrictEqual({
      id: 183860401,
      score: 80,
      submitTime: new Date("2024-10-21T13:02:53.000Z"),
      contest: null,
      problem: "P1121",
      verdict: "NAC",
    });
    expect(submissions.every(({ submitTime }) => submitTime instanceof Date))
      .toBe(true);
  });

  it("也可以直接解析 JSON 文本", () => {
    expect(parseImportedSubmissionsJson(JSON.stringify(luogu10086)))
      .toStrictEqual(parseImportedSubmissions(luogu10086));
  });

  it("拒绝缺少字段的导出记录", () => {
    expect(() => parseImportedSubmissions(luogu10087))
      .toThrow(/字段不符合预期/);
  });

  it("拒绝时间格式非法的导出记录", () => {
    expect(() => parseImportedSubmissions(luogu10088))
      .toThrow(/字段不符合预期/);
  });

  it("拒绝 source 不是 luogu 的信封", () => {
    expect(() => parseImportedSubmissions({
      ...luogu10086,
      source: "other",
    })).toThrow("导入文件的 source 必须为 luogu");
  });

  it("拒绝 submissions 不是数组的信封", () => {
    expect(() => parseImportedSubmissions({
      ...luogu10086,
      submissions: {},
    })).toThrow("导入文件的 submissions 必须是数组");
  });

  it("拒绝非法 JSON 文本", () => {
    expect(() => parseImportedSubmissionsJson("{"))
      .toThrow("导入文件不是有效的 JSON");
  });

  /*
  it("拒绝 status/verdict 非法的导出记录", () => {
    expect(() => parseImportedSubmissions(luogu10089))
      .toThrow(/字段不符合预期/);
  });
   */
});
