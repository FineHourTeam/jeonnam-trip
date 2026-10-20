// 공개 코스의 일차별 방문 순서 — 공유 미리보기(S12)와 받는 사람 화면이 같은 모양을 쓴다.
import { PLACE_CATEGORY_LABEL, type PublicVisitItem } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";

interface SharedDaysProps {
  days: { date: string; startTime: string; endTime: string; items: PublicVisitItem[] }[];
}

const categoryLabel = (c: PublicVisitItem["snapshot"]["category"]) =>
  c === "festival" ? "축제" : PLACE_CATEGORY_LABEL[c];

export function SharedDays({ days }: SharedDaysProps) {
  return (
    <ol className="flex flex-col gap-4">
      {days.map((d, i) => (
        <li key={d.date} className="border-border flex flex-col gap-2 rounded-lg border p-4">
          <p className="font-semibold">
            {i + 1}일차 · {formatDateKo(d.date)}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {d.startTime}~{d.endTime}
            </span>
          </p>
          {d.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">이 날은 담은 장소가 없어요.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {d.items.map((item, n) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-muted-foreground w-5 text-right tabular-nums">{n + 1}</span>
                  <span className="font-medium">{item.snapshot.name}</span>
                  <span className="text-muted-foreground">
                    {categoryLabel(item.snapshot.category)}
                    {item.fixedStart
                      ? ` · ${item.fixedStart}${item.fixedEnd ? `~${item.fixedEnd}` : ""} 고정`
                      : ` · ${String(item.stayMin)}분 머물기`}
                    {item.snapshot.location ? "" : " · 위치 미확인"}
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
