import { describe, expect, test } from "vitest";
import { filterOptions } from "./useData";
import { Posting } from "../data/types";

function p(over: Partial<Posting>): Posting {
  return {
    date: null, year: null, month: null, company: "A", role: "R", craft: "Backend",
    level: "IC-3", levelFamily: "IC", levelRank: 3, location: "Barcelona",
    modality: "Remote", currency: "EUR", rsu: false, bonus: "", ...over,
  } as Posting;
}

describe("filterOptions", () => {
  test("returns sorted distinct values per field", () => {
    const opts = filterOptions([p({ company: "B" }), p({ company: "A" }), p({ craft: "Data" })]);
    expect(opts.companies).toEqual(["A", "B"]);
    expect(opts.crafts.sort()).toEqual(["Backend", "Data"]);
  });
});
