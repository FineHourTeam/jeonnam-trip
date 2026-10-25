// 여행 시작(S09) → 편집기(S10)로 넘길 초안 조립 — 추천·직접 만들기·축제·크리에이터 코스 복사가 같은 모양의 초안을 만든다.
// 크리에이터 코스: 원본 장소·순서를 개인 편집본으로 가져오고, 기간이 짧으면 넘치는 일차는 미배치 후보로 보존한다 (기능명세 §5).
import { newTripDraft, visitFromFestival, visitFromPlace } from "@/features/trips";
import { sigunName } from "@/shared/domain";
import type {
  CreatorCourse,
  Festival,
  Place,
  SigunCode,
  TripDraft,
  TripOrigin,
  TripPace,
  VisitItem,
} from "@/shared/domain";
import { dayIndexOf } from "@/features/trips";
import { recommendTrip } from "./recommend";

export interface StartTripInput {
  title?: string;
  startDate: string;
  endDate: string;
  siguns: SigunCode[];
  pace: TripPace;
  startMode: "recommend" | "direct";
  dayStart: string;
  dayEnd: string;
  festival?: { festival: Festival; date: string; programId?: string };
  course?: { course: CreatorCourse; places: Place[] };
  /** 사용자가 고른 장소 (보관함·장소 목록에서) */
  picked: Place[];
  /** 추천에 쓸 지역 장소 (취향순) */
  suggestions: Place[];
}

function originOf(input: StartTripInput): TripOrigin {
  if (input.course) return { kind: "creator", courseId: input.course.course.id };
  if (input.festival) return { kind: "festival", festivalId: input.festival.festival.id };
  return input.startMode === "recommend" ? { kind: "recommend" } : { kind: "blank" };
}

export function buildStartDraft(input: StartTripInput): TripDraft {
  const draft = newTripDraft({
    title: input.title?.trim() ? input.title.trim() : defaultTitle(input),
    startDate: input.startDate,
    endDate: input.endDate,
    siguns: input.siguns,
    pace: input.pace,
    origin: originOf(input),
  });
  draft.days = draft.days.map((d) => ({ ...d, startTime: input.dayStart, endTime: input.dayEnd }));

  if (input.course) return copyCourse(draft, input.course.course, input.course.places);

  const festivalItem = input.festival
    ? visitFromFestival(input.festival.festival, input.festival.date, input.festival.programId)
    : null;
  const festivalDay = input.festival ? dayIndexOf(draft, input.festival.date) : -1;
  const picked = input.picked.map(visitFromPlace);

  if (input.startMode === "recommend") {
    const fixed =
      festivalItem?.fixedStart && input.festival
        ? [{ date: input.festival.date, item: festivalItem }]
        : [];
    const dated =
      festivalItem && !festivalItem.fixedStart && input.festival
        ? [{ date: input.festival.date, item: festivalItem }]
        : [];
    const r = recommendTrip({
      dates: draft.days.map((d) => d.date),
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      pace: input.pace,
      picked,
      suggestions: input.suggestions
        .filter((s) => !input.picked.some((p) => p.id === s.id))
        .map(visitFromPlace),
      fixed,
      dated,
    });
    draft.days = draft.days.map((d, i) => ({ ...d, items: r.days[i] ?? [] }));
    draft.unplaced = r.unplaced;
    return draft;
  }

  // 직접 만들기: 사용자의 순서를 그대로. 하루 여행이면 1일차에, 여러 날이면 넣을 일차를 직접 고르도록 미배치에 둔다
  if (festivalItem && festivalDay >= 0) {
    draft.days = draft.days.map((d, i) =>
      i === festivalDay ? { ...d, items: [festivalItem] } : d,
    );
  }
  if (draft.days.length === 1) {
    draft.days = draft.days.map((d) => ({ ...d, items: [...d.items, ...picked] }));
  } else {
    draft.unplaced = picked.map((p) => ({ ...p, reason: "넣을 일차를 골라 주세요." }));
  }
  return draft;
}

function copyCourse(draft: TripDraft, course: CreatorCourse, places: Place[]): TripDraft {
  const byId = new Map(places.map((p) => [p.id, p]));
  const unplaced: (VisitItem & { reason: string })[] = [];
  const days = draft.days.map((d) => ({ ...d, items: [] as VisitItem[] }));
  for (const cd of [...course.days].sort((a, b) => a.day - b.day)) {
    const items = cd.items.flatMap((it) => {
      const p = byId.get(it.placeId);
      return p ? [visitFromPlace(p)] : [];
    });
    const target = days[cd.day - 1];
    if (target) target.items.push(...items);
    else
      unplaced.push(
        ...items.map((x) => ({
          ...x,
          reason: `원본 ${String(cd.day)}일차예요. 여행 기간이 짧아 배치하지 않았어요.`,
        })),
      );
  }
  return { ...draft, days, unplaced };
}

function defaultTitle(input: StartTripInput): string {
  if (input.course) return input.course.course.title.replace(/^\[샘플\]\s*/, "") + " (내 코스)";
  if (input.festival) return `${input.festival.festival.name.replace(/^\[샘플\]\s*/, "")} 여행`;
  // 내 여행 목록에서 구분되도록 지역 이름으로 — "순천시 여행", "순천시·여수시 여행", "순천시 외 2곳 여행"
  const [first, second, ...rest] = input.siguns.map(sigunName);
  if (!first) return "새 여행";
  if (!second) return `${first} 여행`;
  return rest.length === 0
    ? `${first}·${second} 여행`
    : `${first} 외 ${String(rest.length + 1)}곳 여행`;
}
