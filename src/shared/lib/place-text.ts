// 장소 이름·소개·주소의 화면 언어 표기 — 번역 당시 원문(i18n.ko)과 지금 원문이 같은 필드만 번역을 쓴다.
// 관리자가 원문을 고치면 그 필드는 다시 번역할 때까지 한국어로 보인다 (옛 번역이 새 내용을 가리지 않게).
import type { Place, PlaceText } from "@/shared/domain";

type PlaceSource = Pick<Place, "name" | "summary" | "address" | "i18n">;

export function placeText(
  place: PlaceSource,
  lng: string,
): Required<Pick<PlaceText, "name">> & PlaceText {
  const t = lng === "en" || lng === "ja" ? place.i18n?.[lng] : undefined;
  const src = place.i18n?.ko;
  const pick = (k: keyof PlaceText) => (t?.[k] && src?.[k] === place[k] ? t[k] : place[k]);
  return { name: pick("name") ?? place.name, summary: pick("summary"), address: pick("address") };
}
