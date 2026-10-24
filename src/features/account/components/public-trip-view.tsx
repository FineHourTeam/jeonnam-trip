// 공개 코스 보기 — 공유 미리보기(작성자)와 받은 링크(누구나)가 같은 화면을 쓴다 (S12). 공유 시점 시각 사본을 보여준다.
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { CategoryIcon } from "@/components/content-meta";
import { CarIcon, LockIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { sigunName, type SharedTrip } from "@/shared/domain";
import { formatDateShort, formatPeriodKo } from "@/shared/lib/date";
import { formatDistance, formatDuration, tripLengthLabel } from "@/shared/lib/format";

export function PublicTripView({ share }: { share: Pick<SharedTrip, "title" | "startDate" | "endDate" | "siguns" | "days"> }) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{share.title}</h1>
        <p className="text-muted-foreground text-sm">
          {formatPeriodKo(share.startDate, share.endDate)} · {tripLengthLabel(share.days.length)} · 자동차
          {share.siguns.length > 0 ? ` · ${share.siguns.map(sigunName).join("·")}` : ""}
        </p>
      </header>
      {share.days.map((d, di) => (
        <section key={d.date} className="flex flex-col gap-3" aria-label={`${String(di + 1)}일차`}>
          <h2 className="text-lg font-bold">
            {di + 1}일차 <span className="text-muted-foreground text-sm font-normal">{formatDateShort(d.date)}</span>
          </h2>
          {d.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">이 일차에는 장소가 없어요.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {d.items.map((it, i) => {
                const href =
                  it.ref.kind === "place"
                    ? paths.placeDetail(it.ref.placeId)
                    : it.ref.kind === "festival"
                      ? paths.festivalDetail(it.ref.festivalId)
                      : null;
                const leg = it.times?.legBefore;
                return (
                  <li key={it.id} className="flex flex-col gap-2">
                    {leg ? (
                      <p className="text-muted-foreground flex items-center gap-2 pl-11 text-sm">
                        <CarIcon size="sm" />
                        자동차 {formatDuration(leg.durationMin)} · {formatDistance(leg.distanceM)}
                      </p>
                    ) : null}
                    <div className="flex items-start gap-3">
                      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                        {i + 1}
                      </span>
                      <div className="border-border flex min-w-0 flex-1 flex-col gap-1 rounded-xl border p-3">
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {it.times?.start && it.times.end ? `${it.times.start}~${it.times.end}` : "시각 미확정"} · 체류 {formatDuration(it.stayMin)}
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold">
                          <CategoryIcon category={it.snapshot.category} size="sm" className="text-muted-foreground" />
                          {href ? (
                            <Link to={href} className="truncate underline-offset-2 hover:underline">
                              {it.snapshot.name}
                            </Link>
                          ) : (
                            <span className="truncate">{it.snapshot.name}</span>
                          )}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {it.fixedStart ? (
                            <Badge variant="secondary">
                              <LockIcon size="sm" />
                              {it.fixedStart}
                              {it.fixedEnd ? `~${it.fixedEnd}` : ""} 고정
                            </Badge>
                          ) : null}
                          {it.ref.kind === "custom" ? <Badge variant="outline">작성자가 직접 등록한 장소</Badge> : null}
                          {it.snapshot.location === null ? <Badge variant="outline">위치 확인 필요</Badge> : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
      <p className="text-muted-foreground text-xs leading-relaxed">
        시각은 공유한 때 계산한 값이에요. 영업시간·축제 일정은 바뀔 수 있으니 방문 전에 장소 정보에서 확인해 주세요.
      </p>
    </div>
  );
}
