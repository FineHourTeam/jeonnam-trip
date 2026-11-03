// 공개 코스의 일차별 방문 순서 — 공유 미리보기(S12)와 받는 사람 화면이 같은 모양을 쓴다.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import type { PublicVisitItem } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";

interface SharedDaysProps {
  days: { date: string; startTime: string; endTime: string; items: PublicVisitItem[] }[];
}

/** 등록된 장소·축제는 원문 출처가 있는 상세로 잇는다. 직접 입력한 장소는 링크 없음 */
function sourceHref(ref: PublicVisitItem["ref"]): string | null {
  if (ref.kind === "place") return paths.placeDetail(ref.placeId);
  if (ref.kind === "festival") return paths.festivalDetail(ref.festivalId);
  return null;
}

export function SharedDays({ days }: SharedDaysProps) {
  const { t, i18n } = useTranslation("account");
  const categoryLabel = (c: PublicVisitItem["snapshot"]["category"]) =>
    c === "festival" ? t("days.festival") : t(`placeCategory.${c}`, { ns: "common" });
  return (
    <ol className="flex flex-col gap-4">
      {days.map((d, i) => (
        <li key={d.date} className="border-border flex flex-col gap-2 rounded-lg border p-4">
          <p className="font-semibold">
            {t("days.title", { n: i + 1, date: formatDay(d.date, i18n.language) })}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {d.startTime}~{d.endTime}
            </span>
          </p>
          {d.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("days.empty")}</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {d.items.map((item, n) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-muted-foreground w-5 text-right tabular-nums">{n + 1}</span>
                  {sourceHref(item.ref) ? (
                    <Link
                      to={sourceHref(item.ref) ?? ""}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {item.snapshot.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{item.snapshot.name}</span>
                  )}
                  <span className="text-muted-foreground">
                    {categoryLabel(item.snapshot.category)}
                    {" · "}
                    {item.fixedStart
                      ? t("days.fixed", {
                          time: `${item.fixedStart}${item.fixedEnd ? `~${item.fixedEnd}` : ""}`,
                        })
                      : t("days.stay", { min: item.stayMin })}
                    {item.snapshot.location ? "" : ` · ${t("days.noLocation")}`}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  );
}
