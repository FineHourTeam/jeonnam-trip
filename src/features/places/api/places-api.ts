// 장소(places) repository — Firestore 호출은 여기서만 (rules.md § Repository).
// 규칙이 status == "published" 조건 없는 목록 쿼리를 거부하므로 목록·개수에는 항상 그 조건을 넣는다.
// 쿼리 모양은 firestore.indexes.json의 places 인덱스(status[+sigun][+category]+name)와 맞춘다.
import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getCountFromServer,
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
import i18n from "@/lib/i18n";
import { COL, type Place, type PlaceCategory, type SigunCode } from "@/shared/domain";

export class PlaceNotFoundError extends Error {
  constructor() {
    super(i18n.t("error.notFound", { ns: "places" }));
    this.name = "PlaceNotFoundError";
  }
}

export const PLACE_PAGE_SIZE = 24;

type PlaceDoc = Omit<Place, "id">;

function fromDoc(id: string, data: PlaceDoc): Place {
  return { ...data, id };
}

export interface PlaceListQuery {
  sigun: SigunCode | null;
  /** 비면 전체, 여러 개면 OR (기능명세 §3 — 같은 묶음 안 복수 선택) */
  categories: PlaceCategory[];
  /** 고른 종류에 속한 세부 종류만 — 비면 전체, 여러 개면 OR */
  subcategories: string[];
  /** 이름 앞부분 ("" = 전체) */
  q: string;
}

/** 다음 페이지 시작점 — 화면은 값을 들고 있기만 한다 */
export type PlaceCursor = QueryDocumentSnapshot;

export interface PlacePage {
  places: Place[];
  next: PlaceCursor | null;
}

function filtersOf(q: PlaceListQuery): QueryConstraint[] {
  const c: QueryConstraint[] = [where("status", "==", "published")];
  if (q.sigun) c.push(where("sigun", "==", q.sigun));
  // 세부 종류는 한 종류에만 속하므로, 고르면 종류 조건을 대신한다 (in 두 개를 겹치지 않는다)
  if (q.subcategories.length > 0) c.push(where("subcategory", "in", q.subcategories));
  else if (q.categories.length > 0) c.push(where("category", "in", q.categories));
  // ponytail: Firestore는 부분 일치 검색이 없어 이름 앞부분 일치만 — "미황사"로 "달마산 미황사"를 찾으려면 검색 토큰 필드(array-contains)를 수집 단계에서 만들 것
  if (q.q) c.push(where("name", ">=", q.q), where("name", "<=", `${q.q}\uf8ff`));
  return c;
}

/** 이름순 한 페이지 (cursor 다음부터) */
export async function listPlaces(
  q: PlaceListQuery,
  cursor: PlaceCursor | null,
): Promise<PlacePage> {
  const constraints = [...filtersOf(q), orderBy("name")];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(PLACE_PAGE_SIZE));
  const snap = await getDocs(query(collection(db, COL.places), ...constraints));
  const last = snap.docs.at(-1);
  return {
    places: snap.docs.map((d) => fromDoc(d.id, d.data() as PlaceDoc)),
    next: snap.docs.length === PLACE_PAGE_SIZE && last ? last : null,
  };
}

/** 조건에 맞는 전체 개수 — 문서를 받지 않고 서버에서 센다 */
export async function countPlaces(q: PlaceListQuery): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, COL.places), ...filtersOf(q)));
  return snap.data().count;
}

export async function getPlace(id: string): Promise<Place> {
  try {
    const snap = await getDoc(doc(db, COL.places, id));
    if (!snap.exists()) throw new PlaceNotFoundError();
    const data = snap.data() as PlaceDoc;
    if (data.status !== "published") throw new PlaceNotFoundError();
    return fromDoc(snap.id, data);
  } catch (e) {
    // 없는 문서·비공개 문서는 규칙이 permission-denied로 거부한다 → 사용자에게는 같은 "없음"
    if (e instanceof FirebaseError && e.code === "permission-denied") {
      throw new PlaceNotFoundError();
    }
    throw e;
  }
}

/** 고른 장소 여러 곳 (요청 순서 유지). 공개가 끝났거나 없는 곳은 빼고 돌려준다 */
export async function getPlacesByIds(ids: string[]): Promise<Place[]> {
  const results = await Promise.allSettled(ids.map(getPlace));
  return results.flatMap((r) => {
    if (r.status === "fulfilled") return [r.value];
    if (r.reason instanceof PlaceNotFoundError) return [];
    throw r.reason;
  });
}
