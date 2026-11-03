// 장소·축제·크리에이터 코스 콘텐츠의 화면 언어 표기 — 번역 당시 원문(i18n.ko)과 지금 원문이 같은 필드만 번역을 쓴다.
// 관리자가 원문을 고치면 그 필드는 다시 번역할 때까지 한국어로 보인다 (옛 번역이 새 내용을 가리지 않게).
import type { CreatorCourse, Place, PlaceText, Translations } from "@/shared/domain";

const translated = <T>(i18n: Translations<T> | undefined, lng: string): T | undefined =>
  lng === "en" || lng === "ja" ? i18n?.[lng] : undefined;

const pick = (now: string | undefined, src: string | undefined, t: string | undefined) =>
  t && src === now ? t : now;

/** 장소·축제 이름·소개·주소 (축제도 같은 필드를 쓴다) */
export function placeText(
  place: Pick<Place, "name" | "summary" | "address" | "i18n">,
  lng: string,
): Required<Pick<PlaceText, "name">> & PlaceText {
  const t = translated(place.i18n, lng);
  const src = place.i18n?.ko;
  const at = (k: keyof PlaceText) => pick(place[k], src?.[k], t?.[k]);
  return { name: at("name") ?? place.name, summary: at("summary"), address: at("address") };
}

/** 코스 제목·소개와 장소별 메모 (note(일차, 순서)) */
export function courseText(
  course: Pick<CreatorCourse, "title" | "summary" | "days" | "i18n">,
  lng: string,
) {
  const t = translated(course.i18n, lng);
  const src = course.i18n?.ko;
  return {
    title: pick(course.title, src?.title, t?.title) ?? course.title,
    summary: pick(course.summary, src?.summary, t?.summary),
    note(day: number, index: number): string | undefined {
      const key = `d${String(day)}-${String(index)}`;
      const now = course.days.find((d) => d.day === day)?.items[index]?.note;
      return pick(now, src?.notes?.[key], t?.notes?.[key]);
    },
  };
}
