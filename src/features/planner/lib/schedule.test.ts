// 기능명세 §6 검수 예시(가상 입력)를 그대로 옮긴 테스트. 날짜 2026-10-17은 토요일.
import { describe, expect, it } from "vitest";
import type { OpeningHours, TimeRange, TripDay, VisitItem } from "@/shared/domain";
import { fromMinutes } from "@/shared/lib/date";
import { computeDaySchedule, type LegInput } from "./schedule";

const DATE = "2026-10-17";
const loc = { lat: 34.8, lng: 126.4 };

function everyDay(ranges: TimeRange[]): OpeningHours {
  return {
    weekly: { 0: ranges, 1: ranges, 2: ranges, 3: ranges, 4: ranges, 5: ranges, 6: ranges },
    exceptions: [],
  };
}

function place(
  id: string,
  category: "restaurant" | "cafe",
  hours: OpeningHours | undefined,
  stayMin: number,
  extra: Partial<VisitItem> = {},
): VisitItem {
  return {
    id,
    ref: { kind: "place", placeId: id },
    snapshot: { name: id, category, location: loc, hours, capturedAt: "" },
    stayMin,
    stayLocked: false,
    ...extra,
  };
}

const festival: VisitItem = {
  id: "fes",
  ref: { kind: "festival", festivalId: "f1", programId: "p1" },
  snapshot: { name: "축제", category: "festival", location: loc, dayRanges: [], capturedAt: "" },
  stayMin: 150,
  stayLocked: false,
  fixedStart: "14:00",
  fixedEnd: "15:00",
};

const ok = (durationMin: number): LegInput => ({ status: "ok", durationMin, distanceM: 1000 });

function day(items: VisitItem[], startTime = "09:00"): TripDay {
  return { date: DATE, startTime, endTime: "21:00", items };
}

const hhmm = (n: number | null) => (n === null ? null : fromMinutes(n));
const kinds = (s: { issues: { kind: string }[] }) => s.issues.map((i) => i.kind);

describe("computeDaySchedule — 연쇄 역산", () => {
  it("식당 → 축제(14:00, 준비 10분, 이동 20분): 출발 한도 13:30, 이용 시작 한도 12:30", () => {
    const r = computeDaySchedule({
      day: day([
        place("식당", "restaurant", everyDay([{ open: "11:00", close: "21:00" }]), 60),
        festival,
      ]),
      legs: [ok(20)],
      prepMin: 10,
    });
    expect(hhmm(r.items[0]?.latestDepart ?? null)).toBe("13:30");
    expect(hhmm(r.items[0]?.latestStart ?? null)).toBe("12:30");
  });

  it("같은 구간이 50분이면 출발 한도 13:00, 이용 시작 한도 12:00", () => {
    const r = computeDaySchedule({
      day: day([
        place("식당", "restaurant", everyDay([{ open: "11:00", close: "21:00" }]), 60),
        festival,
      ]),
      legs: [ok(50)],
      prepMin: 10,
    });
    expect(hhmm(r.items[0]?.latestDepart ?? null)).toBe("13:00");
    expect(hhmm(r.items[0]?.latestStart ?? null)).toBe("12:00");
  });

  it("식당이 13:00 개점하고 최소 식사 60분이면 다음 프로그램 지각 충돌", () => {
    const r = computeDaySchedule({
      day: day([
        place("식당", "restaurant", everyDay([{ open: "13:00", close: "21:00" }]), 60),
        festival,
      ]),
      legs: [ok(20)],
      prepMin: 10,
    });
    expect(r.items[0]?.issues).toContainEqual({ kind: "late_for_next", blockedBy: "fes" });
    expect(r.status).toBe("conflict");
  });

  it("라스트오더 12:00인데 12:30에 도착하면 충돌", () => {
    const r = computeDaySchedule({
      day: day(
        [
          place(
            "식당",
            "restaurant",
            everyDay([{ open: "11:00", close: "21:00", lastOrder: "12:00" }]),
            60,
          ),
          festival,
        ],
        "12:30",
      ),
      legs: [ok(20)],
      prepMin: 10,
    });
    expect(kinds(r.items[0] as never)).toContain("last_order_passed");
  });

  it("앞에 카페를 추가하면 카페→식당 이동과 식당 영업조건까지 역산한다", () => {
    const r = computeDaySchedule({
      day: day([
        place("카페", "cafe", everyDay([{ open: "09:00", close: "18:00" }]), 45),
        place("식당", "restaurant", everyDay([{ open: "11:00", close: "21:00" }]), 60),
        festival,
      ]),
      legs: [ok(15), ok(20)],
      accessMin: 10,
      prepMin: 10,
    });
    // 식당 이용 시작 한도 12:30 → 카페 출발 한도 = 12:30 − 15 − 접근 10 = 12:05
    expect(hhmm(r.items[1]?.latestStart ?? null)).toBe("12:30");
    expect(hhmm(r.items[0]?.latestDepart ?? null)).toBe("12:05");
    // 카페 최소 체류 30분 → 이용 시작 한도 11:35
    expect(hhmm(r.items[0]?.latestStart ?? null)).toBe("11:35");
    expect(r.status).toBe("ok");
  });
});

describe("computeDaySchedule — 순방향·영업조건", () => {
  it("브레이크타임을 가로질러 체류하지 않고 다음 구간 시작까지 대기한다", () => {
    const hours = everyDay([
      { open: "11:00", close: "15:00" },
      { open: "17:00", close: "21:00" },
    ]);
    const r = computeDaySchedule({
      day: day([place("식당", "restaurant", hours, 60)], "14:30"),
      legs: [],
    });
    const s = r.items[0];
    expect(hhmm(s?.start ?? null)).toBe("17:00");
    expect(s?.waitMin).toBe(150);
    expect(s?.issues).toEqual([]);
  });

  it("예외일 휴무는 휴무 충돌", () => {
    const hours: OpeningHours = {
      ...everyDay([{ open: "11:00", close: "21:00" }]),
      exceptions: [{ date: DATE, ranges: [] }],
    };
    const r = computeDaySchedule({ day: day([place("식당", "restaurant", hours, 60)]), legs: [] });
    expect(kinds(r.items[0] as never)).toEqual(["closed"]);
  });

  it("영업시간 미확인은 계산하되 확인 필요로 남긴다", () => {
    const r = computeDaySchedule({
      day: day([place("식당", "restaurant", undefined, 60)]),
      legs: [],
    });
    expect(kinds(r.items[0] as never)).toEqual(["hours_unknown"]);
    expect(r.status).toBe("unconfirmed");
  });

  it("사용자가 고정한 체류는 줄이지 않고 충돌로 알린다", () => {
    const r = computeDaySchedule({
      day: day(
        [
          place("식당", "restaurant", everyDay([{ open: "11:00", close: "21:00" }]), 120, {
            stayLocked: true,
          }),
          festival,
        ],
        "12:00",
      ),
      legs: [ok(20)],
      prepMin: 10,
    });
    expect(r.items[0]?.stayMin).toBe(120);
    expect(r.items[0]?.issues).toContainEqual({ kind: "late_for_next", blockedBy: "fes" });
  });

  it("자동 배정 체류는 한도까지 줄이되 최소 체류는 지킨다", () => {
    const r = computeDaySchedule({
      day: day(
        [place("카페", "cafe", everyDay([{ open: "09:00", close: "21:00" }]), 45), festival],
        "13:00",
      ),
      legs: [ok(10)],
      accessMin: 0,
      prepMin: 10,
    });
    // 출발 한도 13:40 → 13:00 시작이면 40분 체류 (기본 45분보다 짧고 최소 30분보다 길다)
    expect(r.items[0]?.stayMin).toBe(40);
    expect(r.items[0]?.issues).toEqual([]);
  });
});

describe("computeDaySchedule — 경로 조회 상태", () => {
  it("경로 실패 뒤 장소는 도착시각을 확정하지 않고, 고정 프로그램에서 다시 계산을 이어간다", () => {
    const hours = everyDay([{ open: "09:00", close: "21:00" }]);
    const r = computeDaySchedule({
      day: day([
        place("카페", "cafe", hours, 45),
        place("식당", "restaurant", hours, 60),
        festival,
        place("카페2", "cafe", hours, 45),
      ]),
      legs: [{ status: "failed" }, ok(20), ok(10)],
    });
    expect(r.items[1]?.arrive).toBeNull();
    expect(kinds(r.items[1] as never)).toContain("route_failed");
    expect(hhmm(r.items[2]?.start ?? null)).toBe("14:00");
    expect(hhmm(r.items[3]?.arrive ?? null)).toBe("15:20"); // 15:00 + 10 + 접근 10
    expect(r.routesComplete).toBe(false);
    expect(r.driveMin).toBe(30);
    expect(r.status).toBe("unconfirmed");
  });

  it("조회 중인 구간이 있으면 계산 중", () => {
    const hours = everyDay([{ open: "09:00", close: "21:00" }]);
    const r = computeDaySchedule({
      day: day([place("카페", "cafe", hours, 45), place("식당", "restaurant", hours, 60)]),
      legs: [{ status: "pending" }],
    });
    expect(r.status).toBe("calculating");
  });

  it("좌표 미확인 장소는 경로 실패가 아니라 위치 확인 필요로 알린다", () => {
    const hours = everyDay([{ open: "09:00", close: "21:00" }]);
    const noLoc = place("전망대", "cafe", hours, 45);
    noLoc.snapshot = { ...noLoc.snapshot, location: null };
    const r = computeDaySchedule({
      day: day([place("카페", "cafe", hours, 45), noLoc]),
      legs: [{ status: "skipped" }],
    });
    expect(kinds(r.items[1] as never)).toEqual(["no_location"]);
    expect(r.items[1]?.arrive).toBeNull();
  });
});

describe("computeDaySchedule — 카드에서 고정한 도착", () => {
  const cafe = place("카페", "cafe", everyDay([{ open: "09:00", close: "21:00" }]), 30, {
    stayLocked: true,
  });

  it("영업 전으로 고정하면 그 시각에 도착하고 개점까지 대기한다", () => {
    const r = computeDaySchedule({
      day: day([
        cafe,
        place("식당", "restaurant", everyDay([{ open: "11:00", close: "21:00" }]), 60, {
          fixedStart: "10:40",
        }),
      ]),
      legs: [ok(20)],
    });
    expect(hhmm(r.items[1]?.arrive ?? null)).toBe("10:40");
    expect(hhmm(r.items[1]?.start ?? null)).toBe("11:00");
    expect(r.items[1]?.waitMin).toBe(20);
    expect(r.status).toBe("ok");
  });

  it("휴무일에 고정해도 휴무 충돌이 남는다", () => {
    const closed: OpeningHours = { ...everyDay([]), exceptions: [{ date: DATE, ranges: [] }] };
    const r = computeDaySchedule({
      day: day([cafe, place("식당", "restaurant", closed, 60, { fixedStart: "11:00" })]),
      legs: [ok(20)],
    });
    expect(kinds(r.items[1] as never)).toContain("closed");
    expect(r.status).toBe("conflict");
  });

  it("이동시간보다 이르게 당기면 고정 도착 충돌이고, 앞 장소의 출발 한도도 그 시각에서 역산한다", () => {
    const r = computeDaySchedule({
      day: day([
        cafe,
        place("식당", "restaurant", everyDay([{ open: "09:00", close: "21:00" }]), 60, {
          fixedStart: "09:30",
        }),
      ]),
      legs: [ok(20)],
    });
    // 카페 09:00~09:30 → 이동 20 + 접근 10 = 10:00 도착인데 09:30으로 고정
    expect(kinds(r.items[1] as never)).toContain("late_for_pinned");
    expect(r.items[0]?.issues).toContainEqual({ kind: "late_for_next", blockedBy: "식당" });
    expect(hhmm(r.items[1]?.arrive ?? null)).toBe("09:30");
  });

  it("저장된 하루 종료(17:00)는 계산에 쓰지 않아 저녁 일정이 충돌하지 않는다", () => {
    const dinner = place("식당", "restaurant", everyDay([{ open: "17:00", close: "23:00" }]), 90);
    const r = computeDaySchedule({
      day: { date: DATE, startTime: "20:00", endTime: "17:00", items: [dinner] },
      legs: [],
    });
    expect(r.items[0]?.issues).toEqual([]);
    expect(hhmm(r.items[0]?.depart ?? null)).toBe("21:30");
  });
});
