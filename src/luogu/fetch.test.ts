import { afterEach, describe, expect, it, vi } from "vitest";
import record1 from "../test/fixtures/1.json";
import record2 from "../test/fixtures/2.json";
import record3 from "../test/fixtures/3.json";
import record4 from "../test/fixtures/4.json";
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

  it("fetches every page and reports record progress", async () => {
    const pages = [
      envelope([record1, record2], 4, 2),
      envelope([record3, record4], 4, 2),
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        return mockJsonResponse(pages[page - 1]);
      },
    );
    const onProgress = vi.fn();

    const submissions = await fetchSubmissions(851600, {
      baseUrl: "https://www.luogu.com.cn",
      onProgress,
    });

    expect(submissions.map((submission) => submission.id)).toStrictEqual([
      record1.id,
      record2.id,
      record3.id,
      record4.id,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { fetched: 2, total: 4 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { fetched: 4, total: 4 });
  });

  it("stops an incremental fetch at the known maximum ID", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse(envelope([record1, record2], 3, 2)),
    );
    const onProgress = vi.fn();

    const submissions = await fetchSubmissions(851600, {
      baseUrl: "https://www.luogu.com.cn",
      knownMaxId: record2.id,
      onProgress,
    });

    expect(submissions.map((submission) => submission.id)).toStrictEqual([
      record1.id,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({ fetched: 1, total: 3 });
  });

  it("stops before the next page when aborted", async () => {
    const controller = new AbortController();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => {
        controller.abort();
        return mockJsonResponse(envelope([record1], 2, 1));
      },
    );

    await expect(
      fetchSubmissions(851600, {
        baseUrl: "https://www.luogu.com.cn",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
