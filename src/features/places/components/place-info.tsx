// S05 정보 구역 — 영업시간·이용 정보·원문·정보 확인 상태.
// 확정된 사실(주차·예약·반려동물)만 적고, 모르는 값은 "확인 필요"로 남긴다 (기능명세 §3).
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { FieldCheck, Place } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
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
  const { t, i18n } = useTranslation("places");
  return (
    <Section title={t("info.hoursTitle")}>
      {hoursUnknown(place.hours) ? (
        <p className="text-muted-foreground text-sm">{t("info.hoursUnknown")}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y text-sm">
          {weeklyRows(place.hours).map((r) => (
            <li key={r.day} className="flex justify-between gap-4 py-2">
              <span>{t("hours.weekday", { day: r.day })}</span>
              <span className={r.known ? undefined : "text-muted-foreground"}>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
      {place.hours.exceptions.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {place.hours.exceptions.map((x) => (
            <li key={x.date}>
              {formatDay(x.date, i18n.language)} {formatPlaceRanges(x.ranges)}
              {x.note ? ` · ${x.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function PlaceBasics({ place }: { place: Place }) {
  const { t } = useTranslation("places");
  const factText = (v: boolean | null, yes: string, no: string): string => {
    if (v === null) return t("needsCheck");
    return v ? yes : no;
  };
  const tel = place.phone ? telHref(place.phone) : null;
  const rows: [string, ReactNode][] = [];
  if (place.address) rows.push([t("info.address"), place.address]);
  if (place.phone) {
    rows.push([
      t("info.phone"),
      tel ? (
        <a href={tel} className="text-primary underline-offset-4 hover:underline">
          {place.phone}
        </a>
      ) : (
        place.phone
      ),
    ]);
  }
  rows.push([
    t("info.parking"),
    factText(place.facts.parking, t("info.available"), t("info.unavailable")),
  ]);
  if (place.facts.reservation !== null) {
    rows.push([
      t("info.reservation"),
      factText(place.facts.reservation, t("info.available"), t("info.noReservation")),
    ]);
  }
  if (place.facts.pets !== null) {
    rows.push([
      t("info.pets"),
      factText(place.facts.pets, t("info.petsAllowed"), t("info.petsNotAllowed")),
    ]);
  }
  return (
    <Section title={t("info.basicsTitle")}>
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

const CHECK_ROWS = ["location", "hours", "info"] as const;

function CheckBadge({ check }: { check: FieldCheck }) {
  const { t } = useTranslation("places");
  const variant =
    check.state === "verified" ? "secondary" : check.state === "conflict" ? "warning" : "outline";
  return <Badge variant={variant}>{t(`info.state.${check.state}`)}</Badge>;
}

export function PlaceChecks({ place }: { place: Place }) {
  const { t, i18n } = useTranslation("places");
  const sources = [...new Set(CHECK_ROWS.map((k) => place.checks[k].source).filter(Boolean))];
  const links = place.sources.flatMap((s) => {
    const url = safeHttpUrl(s.url);
    return url ? [{ url, label: s.label ?? new URL(url).hostname }] : [];
  });
  return (
    <Section title={t("info.checksTitle")}>
      <ul className="flex flex-col gap-2 text-sm">
        {CHECK_ROWS.map((key) => {
          const check = place.checks[key];
          return (
            <li key={key} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0">{t(`info.check.${key}`)}</span>
              <CheckBadge check={check} />
              {check.checkedAt && (
                <span className="text-muted-foreground">
                  {t(check.state === "unverified" ? "info.collectedOn" : "info.checkedOn", {
                    date: formatDotDate(check.checkedAt, i18n.language),
                  })}
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
                {t("info.viewSource", { label: l.label })}
              </a>
            </li>
          ))}
        </ul>
      )}
      {sources.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("info.sources", { sources: sources.join(" / ") })}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{t("info.disclaimer")}</p>
    </Section>
  );
}
