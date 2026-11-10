// 보관함 순수 로직 — 저장 항목 조립·필터, SNS 원문 주소 정리·플랫폼 판별, 태그·좌표 입력 해석.
// 필터는 지역·종류·분위기 서로 AND, 같은 묶음 안 복수 선택은 OR (기능명세 §3).
import i18n from "@/lib/i18n";
import { safeHttpUrl } from "@/shared/lib/format";
import { placeText } from "@/shared/lib/content-text";
import type {
  CustomPlace,
  LatLng,
  Place,
  PlaceCategory,
  SavedPlace,
  SigunCode,
  SnsLink,
} from "@/shared/domain";

export type SnsPlatform = SnsLink["platform"];

export const MAX_URL_LENGTH = 2000;
export const MAX_LINKED_PLACES = 20;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 20;
export const MAX_MEMO_LENGTH = 500;

type PlaceRef = SavedPlace["ref"];

export function refKey(ref: PlaceRef): string {
  return ref.kind === "place" ? `place:${ref.placeId}` : `custom:${ref.customPlaceId}`;
}

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** 정리한 원문 주소(normalizeSnsUrl 결과)의 플랫폼 */
export function snsPlatformOf(url: string): SnsPlatform {
  const host = new URL(url).hostname;
  if (hostIs(host, "instagram.com") || hostIs(host, "instagr.am")) return "instagram";
  if (hostIs(host, "youtube.com") || hostIs(host, "youtu.be")) return "youtube";
  const blogs = ["blog.naver.com", "post.naver.com", "tistory.com", "brunch.co.kr", "velog.io"];
  if (blogs.some((d) => hostIs(host, d))) return "blog";
  return "other";
}

// 공유할 때마다 값이 바뀌는 추적 파라미터 — 지워야 같은 게시물이 같은 주소가 된다
const TRACKING_ANY = /^(utm_.+|fbclid|gclid)$/;
const TRACKING_BY_PLATFORM: Partial<Record<SnsPlatform, RegExp>> = {
  instagram: /^igsh(id)?$/,
  youtube: /^(si|feature)$/,
};

/** http(s) 원문 주소를 저장 형식으로 정리한다. 형식이 아니면 null (javascript: 등 차단) */
export function normalizeSnsUrl(input: string): string | null {
  const value = input.trim();
  if (value.length > MAX_URL_LENGTH) return null;
  const href = safeHttpUrl(value);
  if (!href) return null;
  const url = new URL(href);
  const extra = TRACKING_BY_PLATFORM[snsPlatformOf(href)];
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_ANY.test(key) || extra?.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}

/** "오션뷰, #사진" → ["오션뷰", "사진"] (쉼표·# 구분, 중복 제거) */
export function parseTags(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,#\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}

export function formatTags(tags: string[]): string {
  return tags.join(", ");
}

/** "34.81, 126.39" → 좌표. 비었거나 형식이 아니면 null — 범위는 국내(위도 33~39, 경도 124~132)만 */
export function parseLatLng(text: string): LatLng | null {
  const m = /^\s*(\d{2}(?:\.\d+)?)\s*,\s*(\d{3}(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return { lat, lng };
}

/** 보관함 한 줄 — 저장 항목 + 원본(등록 장소 또는 개인 장소) + 이 장소를 연결한 SNS 링크 */
export interface LibraryEntry {
  saved: SavedPlace;
  /** 등록 장소. 공개가 끝났거나 지워졌으면 null */
  place: Place | null;
  custom: CustomPlace | null;
  sigun: SigunCode | null;
  category: PlaceCategory | null;
  /** 분위기 필터 대상 — 개인 태그 + 등록 장소의 분위기 태그 */
  moods: string[];
  links: SnsLink[];
}

export function libraryEntries(
  saved: SavedPlace[],
  places: Place[],
  customs: CustomPlace[],
  links: SnsLink[],
): LibraryEntry[] {
  const placeById = new Map(places.map((p) => [p.id, p]));
  const customById = new Map(customs.map((c) => [c.id, c]));
  return saved.map((s) => {
    const place = s.ref.kind === "place" ? (placeById.get(s.ref.placeId) ?? null) : null;
    const custom = s.ref.kind === "custom" ? (customById.get(s.ref.customPlaceId) ?? null) : null;
    const key = refKey(s.ref);
    return {
      saved: s,
      place,
      custom,
      sigun: place?.sigun ?? custom?.sigun ?? null,
      category: place?.category ?? custom?.category ?? null,
      moods: [...new Set([...s.tags, ...(place?.moods ?? [])])],
      links: links.filter((l) => l.linked.some((r) => refKey(r) === key)),
    };
  });
}

/**
 * '장소 연결 전 링크' 탭에 둘 링크 — 연결한 장소가 보관함에 한 곳도 없는 링크.
 * 장소를 아직 연결하지 않은 링크와, 연결한 장소를 모두 저장 해제한 링크(다른 곳에서는 안 보인다)를 함께 담는다.
 */
export function linksWithoutSavedPlace(links: SnsLink[], saved: SavedPlace[]): SnsLink[] {
  const savedKeys = new Set(saved.map((s) => refKey(s.ref)));
  return links.filter((l) => !l.linked.some((r) => savedKeys.has(refKey(r))));
}

/** 보관한 장소 이름 — 공통 장소는 화면 언어 번역(있으면), 개인 장소는 입력한 그대로 */
export function entryName(entry: LibraryEntry, lng: string): string {
  return (
    (entry.place && placeText(entry.place, lng).name) ??
    entry.custom?.name ??
    i18n.t("unknownPlace", { ns: "library" })
  );
}

export interface LibraryFilter {
  sigun: SigunCode | null;
  categories: PlaceCategory[];
  moods: string[];
}

export const EMPTY_LIBRARY_FILTER: LibraryFilter = { sigun: null, categories: [], moods: [] };

export function isFiltered(f: LibraryFilter): boolean {
  return f.sigun !== null || f.categories.length > 0 || f.moods.length > 0;
}

/** 지역·종류를 모르는 장소는 그 조건을 고르면 빠진다 */
export function filterEntries(entries: LibraryEntry[], f: LibraryFilter): LibraryEntry[] {
  return entries.filter(
    (e) =>
      (f.sigun === null || e.sigun === f.sigun) &&
      (f.categories.length === 0 || (e.category !== null && f.categories.includes(e.category))) &&
      (f.moods.length === 0 || f.moods.some((m) => e.moods.includes(m))),
  );
}

export function moodOptions(entries: LibraryEntry[]): string[] {
  return [...new Set(entries.flatMap((e) => e.moods))].sort((a, b) => a.localeCompare(b, "ko"));
}
