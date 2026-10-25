// 관리자 입력 기본값·공개 전 검수 — 순수 함수.
// 임시저장은 불완전 정보도 허용하고, 공개는 필수 항목만 막는다. 입력 형식 검사는 사실 검증을 대신하지 않는다 (기능명세 §9).
import type { AdminKind } from "@/app/paths";
import type { ContentStatus, FieldCheck, WeeklyHours } from "@/shared/domain";
import type { AnyContent, ContentInput } from "../api/admin-api";

export const KIND_LABEL: Record<AdminKind, string> = {
  festivals: "축제",
  places: "장소",
  creators: "크리에이터 코스",
};
export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "임시저장",
  published: "공개",
  hidden: "비공개",
};

export function isAdminKind(v: string | undefined): v is AdminKind {
  return v === "festivals" || v === "places" || v === "creators";
}

const CHECK_LABEL: Record<string, string> = {
  location: "위치",
  hours: "영업시간",
  info: "이용 정보",
  schedule: "일정·운영시간",
};

const unverified = (): FieldCheck => ({ state: "unverified" });
export const unknownWeek = (): WeeklyHours => ({
  0: null,
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
});

export function emptyInput<K extends AdminKind>(kind: K): ContentInput<K> {
  const byKind: { [P in AdminKind]: ContentInput<P> } = {
    places: {
      name: "",
      sigun: "suncheon",
      category: "attraction",
      moods: [],
      purposes: [],
      location: null,
      hours: { weekly: unknownWeek(), exceptions: [] },
      facts: { parking: null, reservation: null, pets: null },
      photos: [],
      sources: [],
      checks: { location: unverified(), hours: unverified(), info: unverified() },
    },
    festivals: {
      name: "",
      sigun: "suncheon",
      startDate: "",
      endDate: "",
      days: [],
      programs: [],
      location: null,
      photos: [],
      state: "scheduled",
      checks: { schedule: unverified(), location: unverified(), info: unverified() },
    },
    creators: {
      title: "",
      creator: { name: "" },
      sourceUrl: "",
      siguns: [],
      tags: [],
      orderBasis: "video_order",
      days: [{ day: 1, items: [] }],
    },
  };
  return byKind[kind];
}

/** 저장된 콘텐츠 → 폼 값 (id·status·updatedAt 제외) */
export function toInput<K extends AdminKind>(c: AnyContent): ContentInput<K> {
  const { id: _id, status: _s, updatedAt: _u, ...rest } = c;
  return rest as unknown as ContentInput<K>;
}

/** 공개 전 필수 검사 — 막는 문제(errors)와 공개는 되지만 확인할 것(warnings) */
export function reviewForPublish(
  kind: AdminKind,
  v: ContentInput<AdminKind>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: [string, FieldCheck][] = "checks" in v ? Object.entries<FieldCheck>(v.checks) : [];
  for (const [k, c] of checks) {
    const name = CHECK_LABEL[k] ?? k;
    if (c.state === "verified" && !c.checkedAt)
      errors.push(`확인됨으로 표시한 "${name}"에 확인일을 넣어 주세요.`);
    if (c.state !== "verified")
      warnings.push(`"${name}" 정보가 아직 확인되지 않았어요. 사용자 화면에 "확인 필요"로 보여요.`);
  }
  if (kind === "creators" && "title" in v) {
    if (!v.title.trim()) errors.push("코스 제목을 넣어 주세요.");
    if (!v.creator.name.trim()) errors.push("크리에이터 이름을 넣어 주세요.");
    if (!/^https?:\/\//.test(v.sourceUrl)) errors.push("원문 링크(https://…)를 넣어 주세요.");
    if (v.siguns.length === 0) errors.push("지역을 하나 이상 골라 주세요.");
    if (v.days.every((d) => d.items.length === 0))
      errors.push("일차에 장소를 하나 이상 넣어 주세요.");
    if (!v.reviewedAt) warnings.push("검수일이 비어 있어요.");
    return { errors, warnings };
  }
  if ("name" in v && !v.name.trim()) errors.push("이름을 넣어 주세요.");
  if ("location" in v && v.location === null) warnings.push("좌표가 없어 경로 계산에서 빠져요.");
  if (kind === "festivals" && "startDate" in v) {
    if (!v.startDate || !v.endDate) errors.push("개최 기간을 넣어 주세요.");
    else if (v.endDate < v.startDate) errors.push("개최 종료일이 시작일보다 빨라요.");
    if (v.days.some((d) => d.ranges === null))
      warnings.push("운영시간이 미확인인 날이 있어요. 그날은 수동 후보로만 담겨요.");
    if (v.programs.some((p) => p.date < v.startDate || p.date > v.endDate))
      errors.push("개최 기간 밖의 프로그램이 있어요.");
  }
  if (kind === "places" && "hours" in v) {
    if (Object.values(v.hours.weekly).every((r) => r === null))
      warnings.push("영업시간이 비어 있어 자동 시간 배정에서 빠져요.");
  }
  if ("photos" in v && v.photos.some((p) => !p.credit && !p.license))
    warnings.push("저작자·라이선스가 없는 사진이 있어요.");
  return { errors, warnings };
}
