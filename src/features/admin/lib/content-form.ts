// 관리자 편집 폼 값 ↔ 도메인 타입 변환과 검증(zod).
// 폼은 입력하기 쉬운 모양(문자열 좌표, 쉼표 태그, 영업 "미확인/휴무/영업" 모드)으로 받고, 저장 직전에 도메인 타입으로 바꾼다.
// 형식 검사는 사실 검증을 대신하지 않는다 — 확인 상태(checks)는 관리자가 따로 고른다 (기능명세 §9).
import { z } from "zod";
import {
  isSigunCode,
  type CreatorCourse,
  type Festival,
  type FieldCheck,
  type LatLng,
  type Place,
  type SigunCode,
  type SourceLink,
  type TimeRange,
} from "@/shared/domain";
import { dateRange } from "@/shared/lib/date";

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const time = z.string().regex(TIME_RE, "시각은 HH:mm(예: 09:30)으로 입력해 주세요.");
const date = z.string().regex(DATE_RE, "날짜를 골라 주세요.");
const optionalDate = z.union([date, z.literal("")]);
// 타입 가드를 그대로 넘기면 출력 타입이 SigunCode로 좁아져 빈 기본값("")과 어긋난다 — 검사만 한다
const sigun = z.string().refine((s): boolean => isSigunCode(s), "지역을 골라 주세요.");
/** 임시저장은 불완전 정보도 허용한다 (기능명세 §9) — 지역은 비워 둘 수 있고, 넣었다면 올바른 값이어야 한다 */
const draftSigun = z
  .string()
  .refine((s): boolean => s === "" || isSigunCode(s), "지역을 골라 주세요.");

/** publish = 공개(필수 항목 검사), draft = 초안 저장(형식만 검사) */
export type SaveMode = "publish" | "draft";
const name = z.string().trim().min(1, "이름을 입력해 주세요.").max(80, "80자까지 쓸 수 있어요.");

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
const optionalUrl = z
  .string()
  .trim()
  .refine((s) => s === "" || isHttpUrl(s), "http:// 또는 https://로 시작하는 주소를 넣어 주세요.");
const requiredUrl = z
  .string()
  .trim()
  .refine(isHttpUrl, "http:// 또는 https://로 시작하는 주소를 넣어 주세요.");

export const rangeSchema = z.object({
  open: time,
  close: time,
  lastOrder: z.union([time, z.literal("")]),
});
export type RangeValues = z.infer<typeof rangeSchema>;

/** 하루 영업 — unknown: 미확인(자동 배정 제외), closed: 휴무, open: 구간(여러 개면 사이가 브레이크타임) */
export const dayHoursSchema = z.object({
  mode: z.enum(["unknown", "closed", "open"]),
  ranges: z.array(rangeSchema),
});
export type DayHoursValues = z.infer<typeof dayHoursSchema>;

export const checkSchema = z.object({
  state: z.enum(["verified", "unverified", "conflict"]),
  source: z.string().trim().max(200, "200자까지 쓸 수 있어요."),
  checkedAt: optionalDate,
});
export type CheckValues = z.infer<typeof checkSchema>;

const coord = (s: string, min: number, max: number) => {
  const n = Number(s);
  return s !== "" && Number.isFinite(n) && n >= min && n <= max;
};
export const locationSchema = z
  .object({ lat: z.string().trim(), lng: z.string().trim() })
  .refine(
    (v) => (v.lat === "" && v.lng === "") || (coord(v.lat, 33, 36) && coord(v.lng, 125, 128)),
    {
      message: "위도·경도를 둘 다 넣거나 둘 다 비워 주세요 (전남: 위도 33~36, 경도 125~128).",
      path: ["lat"],
    },
  );
export type LocationValues = z.infer<typeof locationSchema>;

const triState = z.enum(["unknown", "yes", "no"]);

// ── 공통 변환 ──

export function toRanges(d: DayHoursValues | undefined): TimeRange[] | null {
  if (!d || d.mode === "unknown") return null;
  if (d.mode === "closed") return [];
  const ranges = d.ranges.map((r) => ({
    open: r.open,
    close: r.close,
    ...(r.lastOrder ? { lastOrder: r.lastOrder } : {}),
  }));
  return ranges.length > 0 ? ranges : null; // 구간 없는 "영업"은 미확인으로 둔다
}

export function fromRanges(r: TimeRange[] | null | undefined): DayHoursValues {
  if (r == null) return { mode: "unknown", ranges: [] };
  if (r.length === 0) return { mode: "closed", ranges: [] };
  return {
    mode: "open",
    ranges: r.map((x) => ({ open: x.open, close: x.close, lastOrder: x.lastOrder ?? "" })),
  };
}

export const toLocation = (v: LocationValues): LatLng | null =>
  v.lat === "" ? null : { lat: Number(v.lat), lng: Number(v.lng) };
export const fromLocation = (l: LatLng | null): LocationValues =>
  l ? { lat: String(l.lat), lng: String(l.lng) } : { lat: "", lng: "" };

export const toCheck = (c: CheckValues): FieldCheck => ({
  state: c.state,
  ...(c.source ? { source: c.source } : {}),
  ...(c.checkedAt ? { checkedAt: c.checkedAt } : {}),
});
export const fromCheck = (c: FieldCheck | undefined): CheckValues => ({
  state: c?.state ?? "unverified",
  source: c?.source ?? "",
  checkedAt: c?.checkedAt ?? "",
});

export const splitTags = (s: string) => [
  ...new Set(
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
export const joinTags = (a: string[]) => a.join(", ");

const opt = (s: string) => (s.trim() ? s.trim() : undefined);
const toTri = (v: z.infer<typeof triState>) => (v === "unknown" ? null : v === "yes");
const fromTri = (b: boolean | null): z.infer<typeof triState> =>
  b === null ? "unknown" : b ? "yes" : "no";

// ── 축제 (A04) ──

function makeFestivalSchema(mode: SaveMode) {
  return z
    .object({
      name,
      sigun: mode === "publish" ? sigun : draftSigun,
      summary: z.string().max(2000, "2000자까지 쓸 수 있어요."),
      startDate: date,
      endDate: date,
      /** 날짜별 운영 — 키는 YYYY-MM-DD. 기간 밖 날짜는 저장할 때 버린다 */
      // 화면에 마운트됐지만 아직 고르지 않은 날은 값이 undefined다 — 미확인으로 저장한다
      days: z.record(z.string(), dayHoursSchema.optional()),
      programs: z.array(
        z.object({
          id: z.string(),
          name: z.string().trim().min(1, "프로그램 이름을 입력해 주세요."),
          date,
          start: time,
          end: time,
          place: z.string(),
        }),
      ),
      address: z.string(),
      location: locationSchema,
      parking: z.string(),
      contact: z.string(),
      officialUrl: optionalUrl,
      photos: z.array(z.string()),
      state: z.enum(["scheduled", "changed", "cancelled"]),
      stateNote: z.string(),
      checks: z.object({ schedule: checkSchema, location: checkSchema, info: checkSchema }),
    })
    .refine((v) => v.endDate >= v.startDate, {
      path: ["endDate"],
      message: "종료일은 시작일과 같거나 그 뒤여야 해요.",
    })
    .refine((v) => v.programs.every((p) => p.date >= v.startDate && p.date <= v.endDate), {
      path: ["programs"],
      message: "프로그램 날짜는 개최 기간 안이어야 해요.",
    });
}
export const festivalSchema = makeFestivalSchema("publish");
export const festivalDraftSchema = makeFestivalSchema("draft");
export type FestivalValues = z.infer<typeof festivalSchema>;

export function festivalToValues(f: Festival): FestivalValues {
  return {
    name: f.name,
    sigun: f.sigun,
    summary: f.summary ?? "",
    startDate: f.startDate,
    endDate: f.endDate,
    days: Object.fromEntries(f.days.map((d) => [d.date, fromRanges(d.ranges)])),
    programs: f.programs.map((p) => ({ ...p, place: p.place ?? "" })),
    address: f.address ?? "",
    location: fromLocation(f.location),
    parking: f.parking ?? "",
    contact: f.contact ?? "",
    officialUrl: f.officialUrl ?? "",
    photos: f.photos,
    state: f.state,
    stateNote: f.stateNote ?? "",
    checks: {
      schedule: fromCheck(f.checks.schedule),
      location: fromCheck(f.checks.location),
      info: fromCheck(f.checks.info),
    },
  };
}

export function valuesToFestival(id: string, v: FestivalValues, base?: Festival): Festival {
  return {
    id,
    name: v.name.trim(),
    sigun: v.sigun as SigunCode,
    summary: opt(v.summary),
    startDate: v.startDate,
    endDate: v.endDate,
    days: dateRange(v.startDate, v.endDate).map((d) => ({ date: d, ranges: toRanges(v.days[d]) })),
    programs: v.programs.map((p) => ({ ...p, name: p.name.trim(), place: opt(p.place) })),
    address: opt(v.address),
    location: toLocation(v.location),
    parking: opt(v.parking),
    contact: opt(v.contact),
    officialUrl: opt(v.officialUrl),
    photos: v.photos,
    state: v.state,
    stateNote: opt(v.stateNote),
    checks: {
      schedule: toCheck(v.checks.schedule),
      location: toCheck(v.checks.location),
      info: toCheck(v.checks.info),
    },
    status: base?.status ?? "draft",
    updatedAt: base?.updatedAt ?? new Date().toISOString(),
  };
}

// ── 장소 (A05) ──

export const PLACE_CATEGORIES = ["attraction", "restaurant", "cafe", "shop", "lodging"] as const;
const SOURCE_PLATFORMS = ["official", "instagram", "youtube", "blog", "other"] as const;

function makePlaceSchema(mode: SaveMode) {
  return z.object({
    name,
    sigun: mode === "publish" ? sigun : draftSigun,
    area: z.string(),
    category: z.enum(PLACE_CATEGORIES),
    subcategory: z.string(),
    moods: z.string(),
    purposes: z.string(),
    address: z.string(),
    location: locationSchema,
    /** 요일 0=일 … 6=토 */
    weekly: z.array(dayHoursSchema).length(7),
    exceptions: z.array(
      z
        .object({ date, closed: z.boolean(), ranges: z.array(rangeSchema), note: z.string() })
        .refine((e) => e.closed || e.ranges.length > 0, {
          path: ["ranges"],
          message: "그날 휴무가 아니면 영업 구간을 하나 이상 넣어 주세요.",
        }),
    ),
    parking: triState,
    reservation: triState,
    pets: triState,
    phone: z.string(),
    summary: z.string().max(2000, "2000자까지 쓸 수 있어요."),
    sources: z.array(
      z.object({ platform: z.enum(SOURCE_PLATFORMS), url: requiredUrl, label: z.string() }),
    ),
    photos: z.array(z.string()),
    checks: z.object({ location: checkSchema, hours: checkSchema, info: checkSchema }),
  });
}
export const placeSchema = makePlaceSchema("publish");
export const placeDraftSchema = makePlaceSchema("draft");
export type PlaceValues = z.infer<typeof placeSchema>;

export function placeToValues(p: Place): PlaceValues {
  const w = p.hours.weekly;
  return {
    name: p.name,
    sigun: p.sigun,
    area: p.area ?? "",
    category: p.category,
    subcategory: p.subcategory ?? "",
    moods: joinTags(p.moods),
    purposes: joinTags(p.purposes),
    address: p.address ?? "",
    location: fromLocation(p.location),
    weekly: ([0, 1, 2, 3, 4, 5, 6] as const).map((d) => fromRanges(w[d])),
    exceptions: p.hours.exceptions.map((e) => ({
      date: e.date,
      closed: e.ranges.length === 0,
      ranges: fromRanges(e.ranges).ranges,
      note: e.note ?? "",
    })),
    parking: fromTri(p.facts.parking),
    reservation: fromTri(p.facts.reservation),
    pets: fromTri(p.facts.pets),
    phone: p.phone ?? "",
    summary: p.summary ?? "",
    sources: p.sources.map((s) => ({ platform: s.platform, url: s.url, label: s.label ?? "" })),
    photos: p.photos,
    checks: {
      location: fromCheck(p.checks.location),
      hours: fromCheck(p.checks.hours),
      info: fromCheck(p.checks.info),
    },
  };
}

export function valuesToPlace(id: string, v: PlaceValues, base?: Place): Place {
  const day = (i: number) => toRanges(v.weekly[i]);
  return {
    id,
    name: v.name.trim(),
    sigun: v.sigun as SigunCode,
    area: opt(v.area),
    category: v.category,
    subcategory: opt(v.subcategory),
    moods: splitTags(v.moods),
    purposes: splitTags(v.purposes),
    address: opt(v.address),
    location: toLocation(v.location),
    hours: {
      weekly: { 0: day(0), 1: day(1), 2: day(2), 3: day(3), 4: day(4), 5: day(5), 6: day(6) },
      exceptions: v.exceptions.map((e) => ({
        date: e.date,
        ranges: e.closed ? [] : (toRanges({ mode: "open", ranges: e.ranges }) ?? []),
        ...(e.note.trim() ? { note: e.note.trim() } : {}),
      })),
    },
    facts: { parking: toTri(v.parking), reservation: toTri(v.reservation), pets: toTri(v.pets) },
    phone: opt(v.phone),
    summary: opt(v.summary),
    photos: v.photos,
    sources: v.sources.map((s): SourceLink => ({
      platform: s.platform,
      url: s.url,
      ...(s.label.trim() ? { label: s.label.trim() } : {}),
    })),
    checks: {
      location: toCheck(v.checks.location),
      hours: toCheck(v.checks.hours),
      info: toCheck(v.checks.info),
    },
    status: base?.status ?? "draft",
    updatedAt: base?.updatedAt ?? new Date().toISOString(),
  };
}

// ── 크리에이터 코스 (A06) ──

function makeCourseSchema(mode: SaveMode) {
  const strict = mode === "publish";
  return z.object({
    title: name,
    creatorName: strict
      ? z.string().trim().min(1, "크리에이터 이름을 입력해 주세요.")
      : z.string().trim(),
    channelUrl: optionalUrl,
    sourceUrl: strict ? requiredUrl : optionalUrl,
    siguns: strict ? z.array(sigun).min(1, "지역을 하나 이상 골라 주세요.") : z.array(sigun),
    tags: z.string(),
    orderBasis: z.enum(["video_order", "verified_trip", "editor_suggested"]),
    reviewedAt: optionalDate,
    summary: z.string().max(2000, "2000자까지 쓸 수 있어요."),
    days: z
      .array(
        z.object({
          items: z.array(
            z.object({ placeId: z.string().min(1, "장소를 골라 주세요."), note: z.string() }),
          ),
        }),
      )
      .min(1, "일차를 하나 이상 만들어 주세요."),
  });
}
export const courseSchema = makeCourseSchema("publish");
export const courseDraftSchema = makeCourseSchema("draft");
export type CourseValues = z.infer<typeof courseSchema>;

export function courseToValues(c: CreatorCourse): CourseValues {
  return {
    title: c.title,
    creatorName: c.creator.name,
    channelUrl: c.creator.channelUrl ?? "",
    sourceUrl: c.sourceUrl,
    siguns: c.siguns,
    tags: joinTags(c.tags),
    orderBasis: c.orderBasis,
    reviewedAt: c.reviewedAt ?? "",
    summary: c.summary ?? "",
    days: [...c.days]
      .sort((a, b) => a.day - b.day)
      .map((d) => ({ items: d.items.map((x) => ({ placeId: x.placeId, note: x.note ?? "" })) })),
  };
}

export function valuesToCourse(id: string, v: CourseValues, base?: CreatorCourse): CreatorCourse {
  return {
    id,
    title: v.title.trim(),
    creator: {
      name: v.creatorName.trim(),
      ...(opt(v.channelUrl) ? { channelUrl: opt(v.channelUrl) } : {}),
    },
    sourceUrl: v.sourceUrl.trim(),
    siguns: v.siguns as SigunCode[],
    tags: splitTags(v.tags),
    orderBasis: v.orderBasis,
    reviewedAt: opt(v.reviewedAt),
    summary: opt(v.summary),
    days: v.days.map((d, i) => ({
      day: i + 1,
      items: d.items.map((x) => ({
        placeId: x.placeId,
        ...(x.note.trim() ? { note: x.note.trim() } : {}),
      })),
    })),
    status: base?.status ?? "draft",
    updatedAt: base?.updatedAt ?? new Date().toISOString(),
  };
}

// ── 새 콘텐츠 기본값 ──

const blankCheck: CheckValues = { state: "unverified", source: "", checkedAt: "" };

export function emptyFestivalValues(today: string): FestivalValues {
  return {
    name: "",
    sigun: "",
    summary: "",
    startDate: today,
    endDate: today,
    days: {},
    programs: [],
    address: "",
    location: { lat: "", lng: "" },
    parking: "",
    contact: "",
    officialUrl: "",
    photos: [],
    state: "scheduled",
    stateNote: "",
    checks: { schedule: blankCheck, location: blankCheck, info: blankCheck },
  };
}

export function emptyPlaceValues(): PlaceValues {
  return {
    name: "",
    sigun: "",
    area: "",
    category: "attraction",
    subcategory: "",
    moods: "",
    purposes: "",
    address: "",
    location: { lat: "", lng: "" },
    weekly: Array.from({ length: 7 }, () => ({ mode: "unknown" as const, ranges: [] })),
    exceptions: [],
    parking: "unknown",
    reservation: "unknown",
    pets: "unknown",
    phone: "",
    summary: "",
    sources: [],
    photos: [],
    checks: { location: blankCheck, hours: blankCheck, info: blankCheck },
  };
}

export function emptyCourseValues(): CourseValues {
  return {
    title: "",
    creatorName: "",
    channelUrl: "",
    sourceUrl: "",
    siguns: [],
    tags: "",
    orderBasis: "video_order",
    reviewedAt: "",
    summary: "",
    days: [{ items: [] }],
  };
}
