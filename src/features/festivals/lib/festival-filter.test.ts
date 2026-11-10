import { describe, expect, it } from "vitest";
import type { Festival } from "@/shared/domain";
import { festivalDates, filterFestivals, phaseOf, visitableDates } from "./festival-filter";

const f = (id: string, startDate: string, endDate: string) =>
  ({ id, startDate, endDate, days: [] }) as unknown as Festival;

const TODAY = "2026-10-19";
const list = [f("a", "2026-10-17", "2026-10-19"), f("b", "2026-10-20", "2026-10-21")];

describe("festival-filter", () => {
  it("진행 중·예정·종료를 KST 날짜로 판정한다", () => {
    expect(phaseOf(list[0]!, TODAY)).toBe("ongoing");
    expect(phaseOf(list[1]!, TODAY)).toBe("upcoming");
    expect(phaseOf(f("c", "2026-10-01", "2026-10-18"), TODAY)).toBe("ended");
  });

  it("상태·날짜 조건을 함께 건다 (날짜는 양 끝 포함)", () => {
    expect(filterFestivals(list, { phase: "ongoing", date: null }, TODAY).map((x) => x.id)).toEqual(
      ["a"],
    );
    expect(
      filterFestivals(list, { phase: null, date: "2026-10-21" }, TODAY).map((x) => x.id),
    ).toEqual(["b"]);
    expect(filterFestivals(list, { phase: "ongoing", date: "2026-10-21" }, TODAY)).toEqual([]);
  });

  it("축제가 열리는 날짜를 모은다", () => {
    expect([...festivalDates(list)]).toEqual([
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
    ]);
  });

  it("지난 날은 방문일 후보에서 뺀다", () => {
    const days = [
      { date: "2026-10-18", ranges: null },
      { date: "2026-10-19", ranges: null },
    ];
    expect(visitableDates({ days }, TODAY)).toEqual(["2026-10-19"]);
  });
});
