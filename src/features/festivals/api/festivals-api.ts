// 축제(festivals) repository — Firestore 호출은 여기서만 (rules.md § Repository).
// 규칙이 status == "published" 조건 없는 목록 쿼리를 거부하므로 목록에는 항상 그 조건을 넣는다.
import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import i18n from "@/lib/i18n";
import { COL, type Festival, type SigunCode } from "@/shared/domain";

export class FestivalNotFoundError extends Error {
  constructor() {
    super(i18n.t("error.notFound", { ns: "festivals" }));
    this.name = "FestivalNotFoundError";
  }
}

// ponytail: 전남 축제는 연간 100여 건이라 한 번에 받는다 — 진행·예정분이 이 수를 넘으면 커서 페이지네이션으로
const LIST_LIMIT = 300;

type FestivalDoc = Omit<Festival, "id">;

function fromDoc(id: string, data: FestivalDoc): Festival {
  return { ...data, id };
}

export interface FestivalListQuery {
  sigun: SigunCode | null;
  /** 조회 기간 시작 (KST "YYYY-MM-DD") */
  from: string;
  /** 조회 기간 끝 — 없으면 from 이후 전부 */
  to?: string;
}

/** 조회 기간과 개최 기간이 하루라도 겹치는 공개 축제 (시작일 순) */
export async function listFestivals(q: FestivalListQuery): Promise<Festival[]> {
  const constraints: QueryConstraint[] = [where("status", "==", "published")];
  if (q.sigun) constraints.push(where("sigun", "==", q.sigun));
  constraints.push(where("endDate", ">=", q.from), orderBy("endDate"), limit(LIST_LIMIT));
  const snap = await getDocs(query(collection(db, COL.festivals), ...constraints));
  const { to } = q;
  return snap.docs
    .map((d) => fromDoc(d.id, d.data() as FestivalDoc))
    .filter((f) => to === undefined || f.startDate <= to)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name, "ko"));
}

export async function getFestival(id: string): Promise<Festival> {
  try {
    const snap = await getDoc(doc(db, COL.festivals, id));
    if (!snap.exists()) throw new FestivalNotFoundError();
    const data = snap.data() as FestivalDoc;
    if (data.status !== "published") throw new FestivalNotFoundError();
    return fromDoc(snap.id, data);
  } catch (e) {
    // 없는 문서·비공개 문서는 규칙이 permission-denied로 거부한다 → 사용자에게는 같은 "없음"
    if (e instanceof FirebaseError && e.code === "permission-denied") {
      throw new FestivalNotFoundError();
    }
    throw e;
  }
}
