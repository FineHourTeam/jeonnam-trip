// S05 정보 구역 — 영업시간·이용 정보·원문·정보 확인 상태.
// 확정된 사실(주차·예약·반려동물)만 적고, 모르는 값은 "확인 필요"로 남긴다 (기능명세 §3).
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { FieldCheck, Place, VerifyState } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import { formatDotDate, safeHttpUrl, telHref } from "@/shared/lib/format";
import { formatPlaceRanges, hoursUnknown, weeklyRows } from "../lib/hours";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function PlaceHours({ place }: { place: Place }) {
  return (
    <Section title="영업시간">
      {hoursUnknown(place.hours) ? (
        <p className="text-muted-foreground text-sm">
          영업시간 확인 필요 · 방문 전에 운영처에 문의해 주세요. 일정에 담으면 시간을 직접 정해야
          해요.
        </p>
      ) : (
        <ul className="divide-border flex flex-col divide-y text-sm">
          {weeklyRows(place.hours).map((r) => (
            <li key={r.day} className="flex justify-between gap-4 py-2">
              <span>{r.day}요일</span>
              <span className={r.known ? undefined : "text-muted-foreground"}>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
      {place.hours.exceptions.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {place.hours.exceptions.map((x) => (
            <li key={x.date}>
              {formatDateKo(x.date)} {formatPlaceRanges(x.ranges)}
              {x.note ? ` · ${x.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function factText(v: boolean | null, yes: string, no: string): string {
  if (v === null) return "확인 필요";
  return v ? yes : no;
}

export function PlaceBasics({ place }: { place: Place }) {
  const tel = place.phone ? telHref(place.phone) : null;
  const rows: [string, ReactNode][] = [];
  if (place.address) rows.push(["주소", place.address]);
  if (place.phone) {
    rows.push([
      "전화",
      tel ? (
        <a href={tel} className="text-primary underline-offset-4 hover:underline">
          {place.phone}
        </a>
      ) : (
        place.phone
      ),
    ]);
  }
  rows.push(["주차", factText(place.facts.parking, "가능", "불가")]);
  if (place.facts.reservation !== null) {
    rows.push(["예약", factText(place.facts.reservation, "가능", "받지 않음")]);
  }
  if (place.facts.pets !== null) {
    rows.push(["반려동물", factText(place.facts.pets, "동반 가능", "동반 불가")]);
  }
  return (
    <Section title="이용 정보">
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4">
            <dt className="text-muted-foreground w-16 shrink-0">{label}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

const STATE_LABEL: Record<VerifyState, string> = {
  verified: "확인됨",
  unverified: "미확인",
  conflict: "정보 상충",
};

const CHECK_ROWS = [
  ["location", "위치"],
  ["hours", "영업시간"],
  ["info", "기본 정보"],
] as const;

function CheckBadge({ check }: { check: FieldCheck }) {
  const variant =
    check.state === "verified" ? "secondary" : check.state === "conflict" ? "warning" : "outline";
  return <Badge variant={variant}>{STATE_LABEL[check.state]}</Badge>;
}

export function PlaceChecks({ place }: { place: Place }) {
  const sources = [...new Set(CHECK_ROWS.map(([k]) => place.checks[k].source).filter(Boolean))];
  const links = place.sources.flatMap((s) => {
    const url = safeHttpUrl(s.url);
    return url ? [{ url, label: s.label ?? new URL(url).hostname }] : [];
  });
  return (
    <Section title="정보 출처와 확인">
      <ul className="flex flex-col gap-2 text-sm">
        {CHECK_ROWS.map(([key, label]) => {
          const check = place.checks[key];
          return (
            <li key={key} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0">{label}</span>
              <CheckBadge check={check} />
              {check.checkedAt && (
                <span className="text-muted-foreground">
                  {formatDotDate(check.checkedAt)} {check.state === "unverified" ? "수집" : "확인"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {l.label} 원문 보기
              </a>
            </li>
          ))}
        </ul>
      )}
      {sources.length > 0 && (
        <p className="text-muted-foreground text-xs">출처: {sources.join(" / ")}</p>
      )}
      <p className="text-muted-foreground text-xs">
        자동 수집했거나 확인 당시 기준인 정보예요. 방문 전에 운영처 안내를 한 번 더 확인해 주세요.
      </p>
    </Section>
  );
}
