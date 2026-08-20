import { describe, expect, test, vi } from "vitest";
import { parseCsv, loadPostings } from "./load";

describe("parseCsv", () => {
  test("parses quoted fields and commas", () => {
    const rows = parseCsv('a,b\n"x,y",z\n');
    expect(rows[0]).toEqual(["a", "b"]);
    expect(rows[1]).toEqual(["x,y", "z"]);
  });
});

describe("loadPostings", () => {
  const csv =
    'Date,Company,Role,Craft,Level,Location,Modality,Currency,Low end,Mid,High end\n' +
    '1/24/2024,Flanks,Eng,Backend,IC-3,Barcelona,In Office,EUR,50,52.5,55\n';

  test("uses live data when fetch succeeds", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csv) });
    const res = await loadPostings(fakeFetch as unknown as typeof fetch);
    expect(res.source).toBe("live");
    expect(res.postings).toHaveLength(1);
    expect(res.postings[0].company).toBe("Flanks");
  });

  test("falls back to cache when fetch throws", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error("network"));
    const res = await loadPostings(fakeFetch as unknown as typeof fetch);
    expect(res.source).toBe("cache");
    expect(res.postings.length).toBeGreaterThan(0);
  });

  test("falls back to cache on non-ok response", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("") });
    const res = await loadPostings(fakeFetch as unknown as typeof fetch);
    expect(res.source).toBe("cache");
  });
});
