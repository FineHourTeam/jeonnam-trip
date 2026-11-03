// 크리에이터 코스(creatorCourses) repository — Firestore 호출은 여기서만 (rules.md § Repository).
// 규칙이 status == "published" 조건 없는 목록 쿼리를 거부하므로 목록에는 항상 그 조건을 넣는다.
// 코스에 든 장소도 여기서 읽는다 (places 기능 공개 API가 생기기 전까지, 다른 기능 내부 import 금지).
import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import i18n from "@/lib/i18n";
import { COL, type CreatorCourse, type Place } from "@/shared/domain";

export class CourseNotFoundError extends Error {
  constructor() {
    super(i18n.t("error.notFound", { ns: "creators" }));
    this.name = "CourseNotFoundError";
  }
}

// ponytail: 공개 코스가 100여 개라 한 번에 받아 지역·일수·태그는 화면에서 거른다 — 수천 개가 되면 서버 필터·페이지네이션으로
const LIST_LIMIT = 300;

type CourseDoc = Omit<CreatorCourse, "id">;

function isDenied(e: unknown): boolean {
  return e instanceof FirebaseError && e.code === "permission-denied";
}

/** 공개 코스 전체 (최근 수정 순) */
export async function listCreatorCourses(): Promise<CreatorCourse[]> {
  const snap = await getDocs(
    query(
      collection(db, COL.creatorCourses),
      where("status", "==", "published"),
      orderBy("updatedAt", "desc"),
      limit(LIST_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as CourseDoc), id: d.id }));
}

export async function getCreatorCourse(id: string): Promise<CreatorCourse> {
  try {
    const snap = await getDoc(doc(db, COL.creatorCourses, id));
    const data = snap.data() as CourseDoc | undefined;
    if (data?.status !== "published") throw new CourseNotFoundError();
    return { ...data, id: snap.id };
  } catch (e) {
    // 없는 문서·비공개 문서는 규칙이 permission-denied로 거부한다 → 사용자에게는 같은 "없음"
    if (isDenied(e)) throw new CourseNotFoundError();
    throw e;
  }
}

/** 코스에 든 공개 장소. 비공개·삭제된 장소는 결과에서 빠진다 (화면이 "볼 수 없는 장소"로 안내) */
export async function getCoursePlaces(placeIds: string[]): Promise<Record<string, Place>> {
  const places = await Promise.all(
    [...new Set(placeIds)].map(async (id): Promise<Place | null> => {
      try {
        const snap = await getDoc(doc(db, COL.places, id));
        const data = snap.data() as Omit<Place, "id"> | undefined;
        return data?.status === "published" ? { ...data, id: snap.id } : null;
      } catch (e) {
        if (isDenied(e)) return null;
        throw e;
      }
    }),
  );
  return Object.fromEntries(places.flatMap((p) => (p ? [[p.id, p]] : [])));
}
