import { describe, expect, test } from "vitest";
import { emptyInput, reviewForPublish } from "./admin-content";

describe("reviewForPublish", () => {
  test("필수 항목이 없으면 공개를 막고, 미확인은 경고로만 남긴다", () => {
    const place = emptyInput("places");
    const r = reviewForPublish("places", place);
    expect(r.errors).toContain("이름을 넣어 주세요.");
    expect(r.warnings.some((w) => w.includes("좌표"))).toBe(true);
    const ok = reviewForPublish("places", { ...place, name: "정원" });
    expect(ok.errors).toEqual([]);
  });

  test("확인됨인데 확인일이 없으면 막는다", () => {
    const place = { ...emptyInput("places"), name: "정원" };
    place.checks.hours = { state: "verified" };
    expect(reviewForPublish("places", place).errors.length).toBe(1);
  });

  test("축제는 개최 기간과 기간 안 프로그램이 필요하다", () => {
    const f = {
      ...emptyInput("festivals"),
      name: "축제",
      startDate: "2026-10-23",
      endDate: "2026-10-25",
    };
    f.programs = [{ id: "p", name: "공연", date: "2026-10-30", start: "10:00", end: "11:00" }];
    expect(reviewForPublish("festivals", f).errors).toContain("개최 기간 밖의 프로그램이 있어요.");
  });

  test("크리에이터 코스는 원문·지역·장소가 필요하다", () => {
    const c = emptyInput("creators");
    expect(reviewForPublish("creators", c).errors.length).toBeGreaterThanOrEqual(4);
  });
});
