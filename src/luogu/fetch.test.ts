import { afterEach, describe, expect, it, vi } from "vitest";
import record1 from "../test/fixtures/1.json";
import record2 from "../test/fixtures/2.json";
import { fetchSubmissions } from "./fetch";

function envelope(
  result: unknown,
  count: number,
  perPage: number,
) {
  return {
    template: "record.list",
    status: 200,
    user: { uid: 851600 },
    data: {
      records: {
        count,
        perPage,
        result,
      },
    },
  };
}

function mockJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSubmissions page and collection validation", () => {
  it("accepts a complete page and verifies the final unique ID count", async () => {
    const response = mockJsonResponse(
      envelope([record1, record2], 2, 20),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    const submissions = await fetchSubmissions(851600, {
      baseUrl: "https://www.luogu.com.cn",
    });

    expect(submissions).toHaveLength(2);
  });

  it("rejects a page whose row count is smaller than the expected count", async () => {
    const response = mockJsonResponse(
      envelope([record1], 2, 20),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(
      fetchSubmissions(851600, {
        baseUrl: "https://www.luogu.com.cn",
      }),
    ).rejects.toThrow("第 1 页记录数不正确：期望 2 条，实际 1 条");
  });

  it("rejects duplicate IDs when the full result count is reached", async () => {
    const response = mockJsonResponse(
      envelope([record1, record1], 2, 20),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(
      fetchSubmissions(851600, {
        baseUrl: "https://www.luogu.com.cn",
      }),
    ).rejects.toThrow("提交记录唯一 ID 数量不正确：期望 2 个，实际 1 个");
  });
});
