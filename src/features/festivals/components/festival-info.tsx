// S03 정보 구역 — 날짜별 운영시간·프로그램·이용 정보·정보 확인 상태.
// "확인됨"은 확인 당시 상태라 확인일을 함께 적는다 (docs/DESIGN.md § 톤).
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { Festival, FieldCheck } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import { formatDotDate, safeHttpUrl, telHref } from "@/shared/lib/format";
import { placeText } from "@/shared/lib/content-text";
import { formatRanges } from "../lib/format";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function FestivalHours({ festival }: { festival: Festival }) {
  const { t, i18n } = useTranslation("festivals");
  const allUnknown = festival.days.every((d) => d.ranges === null);
  return (
    <Section title={t("info.hoursTitle")}>
      {allUnknown ? (
        <p className="text-muted-foreground text-sm">{t("info.hoursAllUnknown")}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y text-sm">
          {festival.days.map((d) => (
            <li key={d.date} className="flex justify-between gap-4 py-2">
              <span>{formatDay(d.date, i18n.language)}</span>
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
  const { t, i18n } = useTranslation("festivals");
  if (festival.programs.length === 0) return null;
  return (
    <Section title={t("info.programsTitle")}>
      <ul className="divide-border flex flex-col divide-y text-sm">
        {festival.programs.map((p) => (
          <li key={p.id} className="flex flex-col gap-0.5 py-2">
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground">
              {formatDay(p.date, i18n.language)} {p.start}~{p.end}
              {p.place ? ` · ${p.place}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FestivalBasics({ festival }: { festival: Festival }) {
  const { t, i18n } = useTranslation("festivals");
  const { address } = placeText(festival, i18n.language);
  const official = safeHttpUrl(festival.officialUrl);
  const tel = festival.contact ? telHref(festival.contact) : null;
  const rows: [string, ReactNode][] = [];
  if (address) rows.push([t("info.address"), address]);
  if (festival.parking) rows.push([t("info.parking"), festival.parking]);
  if (festival.contact) {
    rows.push([
      t("info.contact"),
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
      t("info.official"),
      <a
        href={official}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary break-all underline-offset-4 hover:underline"
      >
        {t("info.openSite", { host: new URL(official).hostname })}
      </a>,
    ]);
  }
  return (
    <Section title={t("info.basicsTitle")}>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("info.basicsEmpty")}</p>
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

const CHECK_ROWS = ["schedule", "location", "info"] as const;

function CheckBadge({ check }: { check: FieldCheck }) {
  const { t } = useTranslation("festivals");
  const variant =
    check.state === "verified" ? "secondary" : check.state === "conflict" ? "warning" : "outline";
  return <Badge variant={variant}>{t(`info.checkState.${check.state}`)}</Badge>;
}

export function FestivalChecks({ festival }: { festival: Festival }) {
  const { t, i18n } = useTranslation("festivals");
  const sources = [...new Set(CHECK_ROWS.map((k) => festival.checks[k].source).filter(Boolean))];
  return (
    <Section title={t("info.checksTitle")}>
      <ul className="flex flex-col gap-2 text-sm">
        {CHECK_ROWS.map((key) => {
          const check = festival.checks[key];
          return (
            <li key={key} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0">{t(`info.checkRow.${key}`)}</span>
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
      {sources.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("info.sources", { sources: sources.join(" / ") })}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{t("info.disclaimer")}</p>
    </Section>
  );
}
