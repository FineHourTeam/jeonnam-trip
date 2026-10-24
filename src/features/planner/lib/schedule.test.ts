// 기능명세 §6 검수 예시를 그대로 옮긴 테스트 — 수치는 계산 검수용 가상 입력이다.
import { describe, expect, test } from "vitest";
import type { OpeningHours, TimeRange, TripDay, VisitItem } from "@/shared/domain";
import {
  computeDaySchedule,
  DEFAULT_SCHEDULE_CONFIG,
  hoursForDate,
  type DayLegs,
  type LegInput,
  type ScheduleConfig,
} from "./schedule";

const DATE = "2026-10-23"; // 금요일
const LOC = { lat: 34.9, lng: 127.5 };

// 예시 검수용 설정: 접근 여유 10분·준비 여유 10분(중복 합산 없음), 식당 최소 식사 60분
const CONFIG: ScheduleConfig = {
  ...DEFAULT_SCHEDULE_CONFIG,
  accessBufferMin: 10,
  prepBufferMin: 10,
  minStay: { ...DEFAULT_SCHEDULE_CONFIG.minStay, restaurant: 60, cafe: 20 },
};

const allWeek = (ranges: TimeRange[] | null): OpeningHours => ({
  weekly: { 0: ranges, 1: ranges, 2: ranges, 3: ranges, 4: ranges, 5: ranges, 6: ranges },
  exceptions: [],
});

function place(
  id: string,
  category: "restaurant" | "cafe" | "attraction",
  hours: OpeningHours | undefined,
  stayMin: number,
  extra: Partial<VisitItem> = {},
): VisitItem {
  return {
    id,
    ref: { kind: "place", placeId: id },
    snapshot: { name: id, category, location: LOC, hours, capturedAt: "2026-10-16T00:00:00Z" },
    stayMin,
    stayLocked: false,
    ...extra,
  };
}

function festival(id: string, fixedStart: string, fixedEnd: string): VisitItem {
  return {
    id,
    ref: { kind: "festival", festivalId: id, programId: "p" },
    snapshot: {
      name: "강변 가을축제",
      category: "festival",
      location: LOC,
      dayRanges: [{ open: "10:00", close: "21:00" }],
      festivalState: "scheduled",
      capturedAt: "2026-10-16T00:00:00Z",
    },
    stayMin: 60,
    stayLocked: false,
    fixedStart,
    fixedEnd,
  };
}

const ok = (durationMin: number): LegInput => ({ status: "ok", durationMin, distanceM: durationMin * 700 });

function day(items: VisitItem[], startTime = "09:00", endTime = "21:00"): TripDay {
  return { date: DATE, startTime, endTime, items };
}

function legs(...between: LegInput[]): DayLegs {
  return { legsBefore: [null, ...between], legToEnd: null };
}

const at = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

describe("역방향 출발 한도 (기능명세 §6 검수 예시)", () => {
  test("축제 14:00·준비 10분·자동차 20분·식사 60분 → 식당 출발 한도 13:30, 이용 시작 한도 12:30", () => {
    const restaurant = place("식당", "restaurant", allWeek([{ open: "11:00", close: "21:00" }]), 60);
    const s = computeDaySchedule(day([restaurant, festival("축제", "14:00", "15:00")]), legs(ok(20)), CONFIG);
    expect(s.items[0]?.latestDepart).toBe(at("13:30"));
    expect(s.items[0]?.latestStart).toBe(at("12:30"));
    expect(s.items[0]?.limitBy).toMatchObject({ kind: "fixed", at: at("14:00") });
  });

  test("식당이 13:00에 열고 최소 식사 60분이면 충돌 — 식당과 축제 모두에 이유를 남긴다", () => {
    const restaurant = place("식당", "restaurant", allWeek([{ open: "13:00", close: "21:00" }]), 60);
    const s = computeDaySchedule(day([restaurant, festival("축제", "14:00", "15:00")]), legs(ok(20)), CONFIG);
    const r = s.items[0];
    expect(r?.start).toBe(at("13:00"));
    expect(r?.waitMin).toBe(at("13:00") - at("09:00"));
    expect(r?.issues.map((i) => i.code)).toContain("late-for-next");
    expect(s.items[1]?.issues.map((i) => i.code)).toContain("late-for-fixed");
    expect(s.status).toBe("conflict");
  });

  test("라스트오더 12:00인데 12:30에 도착하면 충돌", () => {
    const restaurant = place(
      "식당",
      "restaurant",
      allWeek([{ open: "11:00", close: "15:00", lastOrder: "12:00" }]),
      60,
    );
    const s = computeDaySchedule(day([restaurant], "12:30"), legs(), CONFIG);
    expect(s.items[0]?.issues.map((i) => i.code)).toContain("arrive-after-close");
  });

  test("같은 구간이 50분이면 출발 한도 13:00, 이용 시작 한도 12:00으로 바뀐다", () => {
    const restaurant = place("식당", "restaurant", allWeek([{ open: "11:00", close: "21:00" }]), 60);
    const s = computeDaySchedule(day([restaurant, festival("축제", "14:00", "15:00")]), legs(ok(50)), CONFIG);
    expect(s.items[0]?.latestDepart).toBe(at("13:00"));
    expect(s.items[0]?.latestStart).toBe(at("12:00"));
  });

  test("앞에 카페를 추가하면 카페→식당 이동과 식당 영업조건까지 연쇄 역산한다", () => {
    const cafe = place("카페", "cafe", allWeek([{ open: "10:00", close: "20:00" }]), 45);
    const restaurant = place("식당", "restaurant", allWeek([{ open: "11:00", close: "21:00" }]), 60);
    const s = computeDaySchedule(
      day([cafe, restaurant, festival("축제", "14:00", "15:00")]),
      legs(ok(15), ok(20)),
      CONFIG,
    );
    // 식당 시작 한도 12:30 → 카페 출발 한도 12:30 − 15 − 접근 10 = 12:05 → 카페 시작 한도 12:05 − 최소 20 = 11:45
    expect(s.items[0]?.latestDepart).toBe(at("12:05"));
    expect(s.items[0]?.latestStart).toBe(at("11:45"));
    expect(s.items[0]?.limitBy).toMatchObject({ kind: "fixed", name: "강변 가을축제" });
  });

  test("식당이 늦게 열면 그 앞 카페의 한도도 함께 당겨진다 (영업조건 연쇄)", () => {
    const cafe = place("카페", "cafe", allWeek([{ open: "10:00", close: "20:00" }]), 45);
    // 식당 13:00 개점 → 13:00 시작도 축제(12:30 한도)에 못 맞춤 → 영업 구간 안에 한도가 없다
    const restaurant = place("식당", "restaurant", allWeek([{ open: "13:00", close: "21:00" }]), 60);
    const s = computeDaySchedule(
      day([cafe, restaurant, festival("축제", "14:00", "15:00")]),
      legs(ok(15), ok(20)),
      CONFIG,
    );
    expect(s.items[1]?.latestStart).toBeNull();
    expect(s.items[1]?.issues.map((i) => i.code)).toContain("late-for-next");
  });

  test("경로 조회 실패는 이전 시간을 확정값으로 쓰지 않는다 — 뒤 도착 미확정, 앞 한도 미확정", () => {
    const cafe = place("카페", "cafe", allWeek([{ open: "10:00", close: "20:00" }]), 45);
    const restaurant = place("식당", "restaurant", allWeek([{ open: "11:00", close: "21:00" }]), 60);
    const s = computeDaySchedule(
      day([cafe, restaurant, festival("축제", "14:00", "15:00")]),
      legs({ status: "failed", reason: "x" }, ok(20)),
      CONFIG,
    );
    expect(s.items[1]?.arrive).toBeNull();
    expect(s.items[1]?.issues.map((i) => i.code)).toContain("route-failed");
    expect(s.items[0]?.latestStart).toBeNull();
    expect(s.missingLegs).toBe(1);
    // 고정 프로그램은 시각이 정해져 있어 다시 기준이 된다
    expect(s.items[2]?.start).toBe(at("14:00"));
  });
});

describe("순방향 도착·영업조건", () => {
  test("도착 = 이전 출발 + 경로 + 접근 여유, 영업 전 도착은 대기로 따로 센다", () => {
    const a = place("관광지", "attraction", allWeek([{ open: "09:00", close: "18:00" }]), 90);
    const cafe = place("카페", "cafe", allWeek([{ open: "11:00", close: "20:00" }]), 45);
    const s = computeDaySchedule(day([a, cafe]), legs(ok(30)), CONFIG);
    expect(s.items[0]?.start).toBe(at("09:00"));
    expect(s.items[0]?.end).toBe(at("10:30"));
    expect(s.items[1]?.arrive).toBe(at("11:10"));
    expect(s.items[1]?.start).toBe(at("11:10"));
    expect(s.totalDriveMin).toBe(30);
    expect(s.status).toBe("ok");
  });

  test("브레이크타임을 가로질러 체류를 배정하지 않는다 — 다음 영업 구간을 쓴다", () => {
    const restaurant = place(
      "식당",
      "restaurant",
      allWeek([
        { open: "11:00", close: "15:00", lastOrder: "14:20" },
        { open: "17:00", close: "21:00", lastOrder: "20:20" },
      ]),
      60,
    );
    const s = computeDaySchedule(day([restaurant], "14:50"), legs(), CONFIG);
    expect(s.items[0]?.start).toBe(at("17:00"));
    expect(s.items[0]?.waitMin).toBe(130);
    expect(s.items[0]?.window?.open).toBe(at("17:00"));
  });

  test("고정하지 않은 체류는 영업 종료에 맞춰 줄이고 표시한다", () => {
    const cafe = place("카페", "cafe", allWeek([{ open: "10:00", close: "20:00" }]), 45);
    const s = computeDaySchedule(day([cafe], "19:30"), legs(), CONFIG);
    expect(s.items[0]?.stayMin).toBe(30);
    expect(s.items[0]?.stayReduced).toBe(true);
    expect(s.items[0]?.issues).toEqual([]);
  });

  test("줄인 체류가 최소 체류보다 짧으면 확정하지 않는다", () => {
    const cafe = place("카페", "cafe", allWeek([{ open: "10:00", close: "20:00" }]), 45);
    const s = computeDaySchedule(day([cafe], "19:50"), legs(), CONFIG);
    expect(s.items[0]?.issues.map((i) => i.code)).toContain("short-stay");
  });

  test("사용자가 고정한 체류는 줄이지 않고 충돌로 알린다", () => {
    const a = place("관광지", "attraction", allWeek([{ open: "09:00", close: "18:00" }]), 90, {
      stayLocked: true,
    });
    const s = computeDaySchedule(day([a], "17:00"), legs(), CONFIG);
    expect(s.items[0]?.stayMin).toBe(90);
    expect(s.items[0]?.issues.map((i) => i.code)).toContain("stay-over-close");
  });

  test("휴무일·영업시간 미확인·취소 축제·위치 미확인을 구분해 표시한다", () => {
    const closed = place("휴무", "restaurant", allWeek([]), 60);
    const unknown = place("미확인", "cafe", allWeek(null), 45);
    const noLoc = place("위치없음", "attraction", allWeek([{ open: "09:00", close: "18:00" }]), 60);
    noLoc.snapshot.location = null;
    const cancelled = festival("축제", "15:00", "16:00");
    cancelled.snapshot.festivalState = "cancelled";
    const s = computeDaySchedule(
      day([closed, unknown, noLoc, cancelled]),
      legs(ok(10), { status: "skipped" }, { status: "skipped" }),
      CONFIG,
    );
    expect(s.items[0]?.issues.map((i) => i.code)).toContain("closed");
    expect(s.items[1]?.issues.map((i) => i.code)).toContain("hours-unknown");
    expect(s.items[2]?.issues.map((i) => i.code)).toContain("location-unknown");
    expect(s.items[3]?.issues.map((i) => i.code)).toContain("festival-cancelled");
    expect(s.missingLegs).toBe(2);
  });

  test("예외일(임시 휴무)이 요일표보다 우선한다", () => {
    const item = place("카페", "cafe", {
      ...allWeek([{ open: "10:00", close: "20:00" }]),
      exceptions: [{ date: DATE, ranges: [], note: "임시 휴무" }],
    }, 45);
    expect(hoursForDate(item, DATE)).toMatchObject({ state: "closed", note: "임시 휴무" });
    expect(hoursForDate(item, "2026-10-24").state).toBe("known");
  });

  test("자정을 넘는 영업 구간을 다음 날 시각으로 다룬다", () => {
    const bar = place("심야 식당", "restaurant", allWeek([{ open: "18:00", close: "02:00" }]), 60);
    const s = computeDaySchedule(day([bar], "23:30", "23:59"), legs(), CONFIG);
    expect(s.items[0]?.end).toBe(at("23:30") + 60);
    expect(s.items[0]?.issues.map((i) => i.code)).toContain("over-day-end");
  });

  test("조회 중인 구간이 있으면 계산 중 상태로 둔다", () => {
    const a = place("관광지", "attraction", allWeek([{ open: "09:00", close: "18:00" }]), 90);
    const b = place("카페", "cafe", allWeek([{ open: "10:00", close: "20:00" }]), 45);
    const s = computeDaySchedule(day([a, b]), legs({ status: "pending" }), CONFIG);
    expect(s.status).toBe("calculating");
    expect(s.items[1]?.arrive).toBeNull();
  });
});
