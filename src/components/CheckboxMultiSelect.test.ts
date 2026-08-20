import { expect, test } from "vitest";
import { toggleValue, filterOptions } from "./CheckboxMultiSelect";

test("toggleValue adds a value not yet selected", () => {
  expect(toggleValue(["A", "B"], "C")).toEqual(["A", "B", "C"]);
});

test("toggleValue removes a value already selected", () => {
  expect(toggleValue(["A", "B", "C"], "B")).toEqual(["A", "C"]);
});

test("toggleValue does not mutate the original array", () => {
  const original = ["A", "B"];
  const result = toggleValue(original, "C");
  expect(original).toEqual(["A", "B"]);
  expect(result).not.toBe(original);
});

test("filterOptions returns full list when query is empty", () => {
  expect(filterOptions(["Acme", "Bexar"], "")).toEqual(["Acme", "Bexar"]);
});

test("filterOptions matches case-insensitive substrings", () => {
  expect(filterOptions(["Acme Corp", "Beta Inc", "acmeSub"], "ACME")).toEqual(["Acme Corp", "acmeSub"]);
});

test("filterOptions returns empty array when nothing matches", () => {
  expect(filterOptions(["Acme", "Beta"], "zzz")).toEqual([]);
});
