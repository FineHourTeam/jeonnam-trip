// S03 정보 구역 — 날짜별 운영시간·프로그램·이용 정보·정보 확인 상태.
// "확인됨"은 확인 당시 상태라 확인일을 함께 적는다 (docs/DESIGN.md § 톤).
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Festival, FieldCheck, VerifyState } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import { formatDotDate, formatRanges, safeHttpUrl } from "../lib/format";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function FestivalHours({ festival }: { festival: Festival }) {
  const allUnknown = festival.days.every((d) => d.ranges === null);
  return (
    <Section title="날짜별 운영시간">
      {allUnknown ? (
        <p className="text-muted-foreground text-sm">
          운영시간 확인 필요 · 주최 측 안내에서 날짜별 시간을 확인해 주세요.
        </p>
      ) : (
        <ul className="divide-border flex flex-col divide-y text-sm">
          {festival.days.map((d) => (
            <li key={d.date} className="flex justify-between gap-4 py-2">
              <span>{formatDateKo(d.date)}</span>
              <span className={d.ranges === null ? "text-muted-foreground" : undefined}>
                {formatRanges(d.ranges)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function FestivalPrograms({ festival }: { festival: Festival }) {
  if (festival.programs.length === 0) return null;
  return (
    <Section title="프로그램">
      <ul className="divide-border flex flex-col divide-y text-sm">
        {festival.programs.map((p) => (
          <li key={p.id} className="flex flex-col gap-0.5 py-2">
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground">
              {formatDateKo(p.date)} {p.start}~{p.end}
              {p.place ? ` · ${p.place}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function telHref(contact: string): string | null {
  const digits = contact.replace(/[^\d]/g, "");
  return /^[\d\s()-]+$/.test(contact) && digits.length >= 8 ? `tel:${digits}` : null;
}

export function FestivalBasics({ festival }: { festival: Festival }) {
  const official = safeHttpUrl(festival.officialUrl);
  const tel = festival.contact ? telHref(festival.contact) : null;
  const rows: [string, ReactNode][] = [];
  if (festival.address) rows.push(["주소", festival.address]);
  if (festival.parking) rows.push(["주차", festival.parking]);
  if (festival.contact) {
    rows.push([
      "문의",
      tel ? (
        <a href={tel} className="text-primary underline-offset-4 hover:underline">
          {festival.contact}
        </a>
      ) : (
        festival.contact
      ),
    ]);
  }
  if (official) {
    rows.push([
      "공식 안내",
      <a
        href={official}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary break-all underline-offset-4 hover:underline"
      >
        {new URL(official).hostname} 열기
      </a>,
    ]);
  }
  return (
    <Section title="이용 정보">
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">주소·문의 정보가 아직 없어요.</p>
      ) : (
        <dl className="flex flex-col gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <dt className="text-muted-foreground w-16 shrink-0">{label}</dt>
              <dd className="min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}

const STATE_LABEL: Record<VerifyState, string> = {
  verified: "확인됨",
  unverified: "미확인",
  conflict: "정보 상충",
};

const CHECK_ROWS = [
  ["schedule", "기간·운영시간"],
  ["location", "위치"],
  ["info", "기본 정보"],
] as const;

function CheckBadge({ check }: { check: FieldCheck }) {
  const variant =
    check.state === "verified" ? "secondary" : check.state === "conflict" ? "warning" : "outline";
  return <Badge variant={variant}>{STATE_LABEL[check.state]}</Badge>;
}

export function FestivalChecks({ festival }: { festival: Festival }) {
  const sources = [...new Set(CHECK_ROWS.map(([k]) => festival.checks[k].source).filter(Boolean))];
  return (
    <Section title="정보 출처와 확인">
      <ul className="flex flex-col gap-2 text-sm">
        {CHECK_ROWS.map(([key, label]) => {
          const check = festival.checks[key];
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
      {sources.length > 0 && (
        <p className="text-muted-foreground text-xs">출처: {sources.join(" / ")}</p>
      )}
      <p className="text-muted-foreground text-xs">
        자동 수집했거나 확인 당시 기준인 정보예요. 방문 전에 주최 측 공식 안내를 한 번 더 확인해
        주세요.
      </p>
    </Section>
  );
}
