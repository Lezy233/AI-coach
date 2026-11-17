import { describe, expect, it } from "vitest";
import type { Submission } from "../toSubmission";
import record1 from "../test/fixtures/1.json";
import record2 from "../test/fixtures/2.json";
import record3 from "../test/fixtures/3.json";
import record4 from "../test/fixtures/4.json";
import record5 from "../test/fixtures/5.json";
import record6 from "../test/fixtures/6.json";
import record7 from "../test/fixtures/7.json";
import record8 from "../test/fixtures/8.json";
import record9 from "../test/fixtures/9.json";
import { parseSubmissionsPage } from "./parse";

// Fixtures 保存的是单条记录，解析入口接收的是包含 result 的信封。
function envelope(result: unknown) {
  return { data: { records: { result } } };
}

// 预期值独立写出，不调用生产映射表或重复生产转换逻辑。
const cases: { name: string; record: unknown; expected: Submission }[] = [
  {
    name: "1.json：部分分映射为 NAC，保留 contest: null",
    record: record1,
    expected: {
      id: 246901955,
      score: 70,
      submitTime: new Date("2025-11-12T13:39:38.000Z"),
      contest: null,
      problem: "T684526",
      verdict: "NAC",
    },
  },
  {
    name: "2.json：通过记录映射为 AC",
    record: record2,
    expected: {
      id: 246874350,
      score: 100,
      submitTime: new Date("2025-11-12T12:16:19.000Z"),
      contest: null,
      problem: "T684525",
      verdict: "AC",
    },
  },
  {
    name: "3.json：PyPy 记录也使用相同的 Submission 结构",
    record: record3,
    expected: {
      id: 205384591,
      score: 100,
      submitTime: new Date("2025-03-01T09:59:30.000Z"),
      contest: null,
      problem: "P5738",
      verdict: "AC",
    },
  },
  {
    name: "4.json：编译错误保留 score: null 和 contest: null",
    record: record4,
    expected: {
      id: 191524634,
      score: null,
      submitTime: new Date("2024-11-27T13:24:04.000Z"),
      contest: null,
      problem: "P8435",
      verdict: "CE",
    },
  },
  {
    name: "5.json：另一条编译错误同样保留两个 null",
    record: record5,
    expected: {
      id: 191524566,
      score: null,
      submitTime: new Date("2024-11-27T13:23:54.000Z"),
      contest: null,
      problem: "P8435",
      verdict: "CE",
    },
  },
  {
    name: "6.json：重复内容的 fixture 得到相同的字段值",
    record: record6,
    expected: {
      id: 246901955,
      score: 70,
      submitTime: new Date("2025-11-12T13:39:38.000Z"),
      contest: null,
      problem: "T684526",
      verdict: "NAC",
    },
  },
  {
    name: "7.json：题目曾通过不代表这次提交通过，verdict 取决于 status",
    record: record7,
    expected: {
      id: 246874063,
      score: 95,
      submitTime: new Date("2025-11-12T12:15:42.000Z"),
      contest: null,
      problem: "T684525",
      verdict: "NAC",
    },
  },
  {
    name: "9.json：完整保留非空 contest 对象",
    record: record9,
    expected: {
      id: 188644580,
      score: 100,
      submitTime: new Date("2024-11-14T04:34:25.000Z"),
      contest: {
        id: 212015,
        startTime: 1730883049,
        endTime: 1736780400,
        name: "NOV13",
      },
      problem: "U501270",
      verdict: "AC",
    },
  },
];

describe("parseSubmissionsPage", () => {
  it.each(cases)("$name", ({ record, expected }) => {
    const submissions = parseSubmissionsPage(envelope([record]));

    // 严格比较所有字段，也能发现多余字段、缺失字段或 undefined 代替 null。
    expect(submissions).toStrictEqual([expected]);
  });

  it("一页多条记录保持原始顺序", () => {
    const records = cases.map(({ record }) => record);
    const expected = cases.map(({ expected }) => expected);

    expect(parseSubmissionsPage(envelope(records))).toStrictEqual(expected);
  });

  it("兼容数字索引对象，并按数值索引排序", () => {
    const result = { "10": record9, "2": record4, "0": record1 };

    const submissions = parseSubmissionsPage(envelope(result));

    expect(submissions).toStrictEqual([
      cases[0].expected,
      cases[3].expected,
      cases[7].expected,
    ]);
  });

  it.each([[], {}])("空 result %j 返回空数组", (result) => {
    expect(parseSubmissionsPage(envelope(result))).toStrictEqual([]);
  });

  it("8.json 缺少 score，按当前契约拒绝解析，不把缺失字段当成 null", () => {
    expect(() => parseSubmissionsPage(envelope([record8]))).toThrow(
      "提交记录字段不符合预期",
    );
  });
});
