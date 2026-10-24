// 운영 콘텐츠(장소·축제·크리에이터 코스) 읽기 repository — 사용자 화면 전용. Firestore 호출은 여기서만.
// 규칙: 목록 쿼리는 반드시 where("status", "==", "published")를 포함한다 (firestore.rules가 그 조건 없이는 거부).
// 쓰기(등록·수정·공개)는 관리자 기능(features/admin/api)이 소유한다.
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  COL,
  type CreatorCourse,
  type Festival,
  type PhotoAsset,
  type Place,
  type PlaceCategory,
  type SigunCode,
} from "@/shared/domain";

export class ContentNotFoundError extends Error {
  constructor() {
    super("공개 중인 정보를 찾을 수 없어요.");
    this.name = "ContentNotFoundError";
  }
}

/** 예전 형식(문자열 URL 배열)도 받아 준다 */
export function normalizePhotos(raw: unknown): PhotoAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p: unknown): PhotoAsset[] => {
    if (typeof p === "string") return p ? [{ url: p }] : [];
    if (p && typeof p === "object" && typeof (p as PhotoAsset).url === "string") return [p as PhotoAsset];
    return [];
  });
}

/** Firestore 문서는 오래된 형식일 수 있다 — 배열·영업정보는 빠져 있어도 기본값으로 */
type Loose<T, K extends keyof T> = Omit<T, K | "id"> & Partial<Pick<T, K>>;

export function placeFromDoc(id: string, data: Record<string, unknown>): Place {
  const p = data as unknown as Loose<Place, "moods" | "purposes" | "sources" | "hours">;
  return {
    ...p,
    id,
    moods: p.moods ?? [],
    purposes: p.purposes ?? [],
    sources: p.sources ?? [],
    photos: normalizePhotos(data.photos),
    hours: p.hours ?? { weekly: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }, exceptions: [] },
  };
}

export function festivalFromDoc(id: string, data: Record<string, unknown>): Festival {
  const f = data as unknown as Loose<Festival, "days" | "programs">;
  return { ...f, id, days: f.days ?? [], programs: f.programs ?? [], photos: normalizePhotos(data.photos) };
}

export function courseFromDoc(id: string, data: Record<string, unknown>): CreatorCourse {
  const c = data as unknown as Loose<CreatorCourse, "tags" | "siguns" | "days">;
  return { ...c, id, tags: c.tags ?? [], siguns: c.siguns ?? [], days: c.days ?? [] };
}

const published = where("status", "==", "published");

// ── 장소 ──

export interface PlacePage {
  items: Place[];
  /** 다음 페이지 커서 (없으면 마지막) */
  cursor: QueryDocumentSnapshot | null;
}

export const PLACE_PAGE_SIZE = 60;

export async function listPlaces(
  filter: { sigun?: SigunCode | null; category?: PlaceCategory | null },
  cursor: QueryDocumentSnapshot | null = null,
): Promise<PlacePage> {
  const cons: QueryConstraint[] = [published];
  if (filter.sigun) cons.push(where("sigun", "==", filter.sigun));
  if (filter.category) cons.push(where("category", "==", filter.category));
  cons.push(orderBy("name"), limit(PLACE_PAGE_SIZE));
  if (cursor) cons.push(startAfter(cursor));
  const snap = await getDocs(query(collection(db, COL.places), ...cons));
  return {
    items: snap.docs.map((d) => placeFromDoc(d.id, d.data())),
    cursor: snap.docs.length === PLACE_PAGE_SIZE ? (snap.docs.at(-1) ?? null) : null,
  };
}

export async function getPlace(id: string): Promise<Place> {
  try {
    const snap = await getDoc(doc(db, COL.places, id));
    if (!snap.exists()) throw new ContentNotFoundError();
    return placeFromDoc(snap.id, snap.data());
  } catch (e) {
    // 비공개 문서는 규칙이 permission-denied로 막는다 — 사용자에겐 "찾을 수 없음"과 같다
    if ((e as { code?: string }).code === "permission-denied") throw new ContentNotFoundError();
    throw e;
  }
}

async function getByIds<T>(
  col: string,
  ids: string[],
  map: (id: string, data: Record<string, unknown>) => T,
): Promise<T[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, col), published, where(documentId(), "in", chunk))),
    ),
  );
  return results.flatMap((snap) => snap.docs.map((d) => map(d.id, d.data())));
}

/** 공개 중인 것만 돌려준다 — 빠진 id는 비공개·삭제된 콘텐츠 */
export function getPlacesByIds(ids: string[]): Promise<Place[]> {
  return getByIds(COL.places, ids, placeFromDoc);
}

// ── 축제 ──

/** 조회 기간과 개최 기간이 하루라도 겹치는 공개 축제 (기간 판정은 KST 달력 날짜) */
export async function listFestivals(filter: {
  from: string;
  to: string;
  sigun?: SigunCode | null;
}): Promise<Festival[]> {
  const cons: QueryConstraint[] = [published];
  if (filter.sigun) cons.push(where("sigun", "==", filter.sigun));
  cons.push(where("endDate", ">=", filter.from), orderBy("endDate"), limit(100));
  const snap = await getDocs(query(collection(db, COL.festivals), ...cons));
  return snap.docs
    .map((d) => festivalFromDoc(d.id, d.data()))
    .filter((f) => f.startDate <= filter.to)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name, "ko"));
}

export async function getFestival(id: string): Promise<Festival> {
  try {
    const snap = await getDoc(doc(db, COL.festivals, id));
    if (!snap.exists()) throw new ContentNotFoundError();
    return festivalFromDoc(snap.id, snap.data());
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") throw new ContentNotFoundError();
    throw e;
  }
}

export function getFestivalsByIds(ids: string[]): Promise<Festival[]> {
  return getByIds(COL.festivals, ids, festivalFromDoc);
}

// ── 크리에이터 코스 ──

export async function listCreatorCourses(): Promise<CreatorCourse[]> {
  const snap = await getDocs(
    query(collection(db, COL.creatorCourses), published, orderBy("updatedAt", "desc"), limit(50)),
  );
  return snap.docs.map((d) => courseFromDoc(d.id, d.data()));
}

export async function getCreatorCourse(id: string): Promise<CreatorCourse> {
  try {
    const snap = await getDoc(doc(db, COL.creatorCourses, id));
    if (!snap.exists()) throw new ContentNotFoundError();
    return courseFromDoc(snap.id, snap.data());
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") throw new ContentNotFoundError();
    throw e;
  }
}
