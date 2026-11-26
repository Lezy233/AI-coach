import { describe, expect, it } from "vitest";
import type { Submission } from "../domain/submission";
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
    name: "1.json：部分分映射为 NAC，保留 submitContest: null",
    record: record1,
    expected: {
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
  },
  {
    name: "2.json：通过记录映射为 AC",
    record: record2,
    expected: {
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
  },
  {
    name: "3.json：PyPy 记录也使用相同的 Submission 结构",
    record: record3,
    expected: {
      platform: "Luogu",
      submitId: 205384591,
      submitTime: new Date("2025-03-01T09:59:30.000Z"),
      submitStatus: "AC",
      submitScore: 100,
      submitContest: null,
      problem: {
        platform: "Luogu",
        id: "P5738",
        name: "【深基7.例4】歌唱比赛",
        difficulty: 2,
      },
    },
  },
  {
    name: "4.json：编译错误保留 submitScore: null 和 submitContest: null",
    record: record4,
    expected: {
      platform: "Luogu",
      submitId: 191524634,
      submitTime: new Date("2024-11-27T13:24:04.000Z"),
      submitStatus: "CE",
      submitScore: null,
      submitContest: null,
      problem: {
        platform: "Luogu",
        id: "P8435",
        name: "【模板】点双连通分量",
        difficulty: 4,
      },
    },
  },
  {
    name: "5.json：另一条编译错误同样保留两个 null",
    record: record5,
    expected: {
      platform: "Luogu",
      submitId: 191524566,
      submitTime: new Date("2024-11-27T13:23:54.000Z"),
      submitStatus: "CE",
      submitScore: null,
      submitContest: null,
      problem: {
        platform: "Luogu",
        id: "P8435",
        name: "【模板】点双连通分量",
        difficulty: 4,
      },
    },
  },
  {
    name: "6.json：重复内容的 fixture 得到相同的字段值",
    record: record6,
    expected: {
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
  },
  {
    name: "7.json：题目曾通过不代表这次提交通过，submitStatus 取决于 status",
    record: record7,
    expected: {
      platform: "Luogu",
      submitId: 246874063,
      submitTime: new Date("2025-11-12T12:15:42.000Z"),
      submitStatus: "NAC",
      submitScore: 95,
      submitContest: null,
      problem: {
        platform: "Luogu",
        id: "T684525",
        name: "隔墙花影旧相知",
        difficulty: 1,
      },
    },
  },
  {
    name: "9.json：完整保留非空 submitContest 对象",
    record: record9,
    expected: {
      platform: "Luogu",
      submitId: 188644580,
      submitTime: new Date("2024-11-14T04:34:25.000Z"),
      submitStatus: "AC",
      submitScore: 100,
      submitContest: {
        id: 212015,
        startTime: 1730883049,
        endTime: 1736780400,
        name: "NOV13",
      },
      problem: {
        platform: "Luogu",
        id: "U501270",
        name: "喜欢的字符串",
        difficulty: 1,
      },
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

  it("8.json 的 UKE 记录缺少 score，解析为 null", () => {
    expect(parseSubmissionsPage(envelope([record8]))).toStrictEqual([
      {
        platform: "Luogu",
        submitId: 171279336,
        submitTime: new Date("2024-08-07T16:46:20.000Z"),
        submitStatus: "UKE",
        submitScore: null,
        submitContest: null,
        problem: {
          platform: "Luogu",
          id: "CF660E",
          name: "Different Subsets For All Tuples",
          difficulty: 5,
        },
      },
    ]);
  });

  it("映射表外的状态码会抛错，并在错误信息中包含状态值", () => {
    const unknownStatusRecord = { ...record1, status: 15 };

    expect(() =>
      parseSubmissionsPage(envelope([unknownStatusRecord])),
    ).toThrow("未知的提交状态码: 15");
  });
});