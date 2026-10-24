// 담은 뒤 바뀐 운영 정보 안내 — 저장 코스를 다시 열면 최신 정보와 담을 당시 사본을 비교한다 (FES-06, ADM-03).
// 사용자가 고르기 전에는 일정을 바꾸지 않는다: "최신 정보로 바꾸기" 또는 "그대로 두기".
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Notice } from "@/components/detail-parts";
import { Button } from "@/components/ui/button";
import { useFestivalsByIds, usePlacesByIds } from "@/features/content";
import { visitFromFestival, visitFromPlace } from "@/features/trips";
import type { Festival, Place, VisitItem } from "@/shared/domain";
import { updateItem, type EditableTrip } from "../lib/edit-ops";

export interface ContentChange {
  item: VisitItem;
  dayIndex: number | null;
  kind: "updated" | "cancelled" | "unpublished";
  notes: string[];
  latest: Place | Festival | null;
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function useContentChanges(trip: EditableTrip): ContentChange[] {
  const located = [
    ...trip.days.flatMap((d, dayIndex) => d.items.map((item) => ({ item, dayIndex, date: d.date }))),
    ...trip.unplaced.map((item) => ({ item, dayIndex: null, date: null })),
  ];
  const placeIds = located.flatMap((x) => (x.item.ref.kind === "place" ? [x.item.ref.placeId] : []));
  const festIds = located.flatMap((x) => (x.item.ref.kind === "festival" ? [x.item.ref.festivalId] : []));
  const places = usePlacesByIds(placeIds);
  const fests = useFestivalsByIds(festIds);
  const out: ContentChange[] = [];
  for (const { item, dayIndex, date } of located) {
    const snap = item.snapshot;
    if (item.ref.kind === "place") {
      if (!places.isSuccess) continue;
      const placeId = item.ref.placeId;
      const latest = places.data.find((p) => p.id === placeId);
      if (!latest) {
        out.push({ item, dayIndex, kind: "unpublished", notes: ["더 이상 공개되지 않는 장소예요. 방문 전에 운영 여부를 확인해 주세요."], latest: null });
        continue;
      }
      if (latest.updatedAt === snap.sourceUpdatedAt || latest.updatedAt === snap.ackUpdatedAt) continue;
      const notes: string[] = [];
      if (!same(latest.hours, snap.hours)) notes.push("영업시간·휴무 정보가 바뀌었어요.");
      if (!same(latest.location, snap.location)) notes.push("위치 정보가 바뀌었어요.");
      if (latest.name !== snap.name) notes.push(`이름이 "${latest.name}"(으)로 바뀌었어요.`);
      if (notes.length > 0) out.push({ item, dayIndex, kind: "updated", notes, latest });
    } else if (item.ref.kind === "festival") {
      if (!fests.isSuccess) continue;
      const { festivalId, programId } = item.ref;
      const latest = fests.data.find((f) => f.id === festivalId);
      if (!latest) {
        out.push({ item, dayIndex, kind: "unpublished", notes: ["더 이상 공개되지 않는 축제예요."], latest: null });
        continue;
      }
      if (latest.updatedAt === snap.sourceUpdatedAt || latest.updatedAt === snap.ackUpdatedAt) continue;
      if (latest.state === "cancelled" && snap.festivalState !== "cancelled") {
        out.push({ item, dayIndex, kind: "cancelled", notes: [latest.stateNote ? `축제가 취소됐어요. ${latest.stateNote}` : "축제가 취소됐어요."], latest });
        continue;
      }
      const notes: string[] = [];
      if (latest.state !== snap.festivalState) notes.push(latest.stateNote ? `일정이 바뀌었어요. ${latest.stateNote}` : "축제 일정 상태가 바뀌었어요.");
      const day = date ? latest.days.find((d) => d.date === date) : undefined;
      if (date && !same(day?.ranges ?? null, snap.dayRanges ?? null)) notes.push("방문일 운영시간이 바뀌었어요.");
      const prog = programId ? latest.programs.find((p) => p.id === programId) : undefined;
      if (programId && (!prog || prog.start !== item.fixedStart || prog.end !== item.fixedEnd)) {
        notes.push(prog ? `프로그램 시간이 ${prog.start}~${prog.end}(으)로 바뀌었어요.` : "고른 프로그램이 없어졌어요.");
      }
      if (notes.length > 0) out.push({ item, dayIndex, kind: "updated", notes, latest });
    }
  }
  return out;
}

/** 최신 정보 반영 — 항목 id·체류·메모는 유지하고 사본(과 축제 프로그램 시각)만 갈아 끼운다 */
export function applyLatest<T extends EditableTrip>(trip: T, c: ContentChange): T {
  if (c.dayIndex === null || !c.latest) return trip;
  if (c.item.ref.kind === "place" && "category" in c.latest) {
    return updateItem(trip, c.dayIndex, c.item.id, { snapshot: visitFromPlace(c.latest).snapshot });
  }
  if (c.item.ref.kind === "festival" && "programs" in c.latest) {
    const date = trip.days[c.dayIndex]?.date ?? "";
    const fresh = visitFromFestival(c.latest, date, c.item.ref.programId);
    return updateItem(trip, c.dayIndex, c.item.id, {
      snapshot: fresh.snapshot,
      fixedStart: fresh.fixedStart,
      fixedEnd: fresh.fixedEnd,
    });
  }
  return trip;
}

export function acknowledge<T extends EditableTrip>(trip: T, c: ContentChange): T {
  if (c.dayIndex === null || !c.latest) return trip;
  return updateItem(trip, c.dayIndex, c.item.id, { snapshot: { ...c.item.snapshot, ackUpdatedAt: c.latest.updatedAt } });
}

export function ContentChangesBanner({
  changes,
  onApply,
  onAck,
}: {
  changes: ContentChange[];
  onApply: (c: ContentChange) => void;
  onAck: (c: ContentChange) => void;
}) {
  const [open, setOpen] = useState(false);
  if (changes.length === 0) return null;
  const cancelled = changes.some((c) => c.kind === "cancelled");
  return (
    <>
      <Notice tone={cancelled ? "destructive" : "warning"} title={`담은 뒤 정보가 바뀐 곳이 ${String(changes.length)}곳 있어요`}>
        <p>일정은 그대로 두었어요. 확인하고 반영할지 골라 주세요.</p>
        <Button size="sm" variant="outline" className="bg-background mt-2" onClick={() => { setOpen(true); }}>
          바뀐 정보 확인하기
        </Button>
      </Notice>
      <BottomSheet open={open} onOpenChange={setOpen} title="바뀐 정보" description="반영하면 시간을 다시 계산해요. 그대로 두면 담을 당시 정보로 계산해요.">
        <ul className="flex flex-col gap-3 pb-4">
          {changes.map((c) => (
            <li key={c.item.id} className="border-border flex flex-col gap-2 rounded-xl border p-3">
              <p className="font-semibold">
                {c.item.snapshot.name}
                <span className="text-muted-foreground text-sm font-normal">
                  {c.dayIndex !== null ? ` · ${String(c.dayIndex + 1)}일차` : " · 미배치 후보"}
                </span>
              </p>
              <ul className="text-muted-foreground flex flex-col gap-0.5 text-sm">
                {c.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              {c.latest && c.dayIndex !== null ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { onApply(c); }}>
                    최신 정보로 바꾸기
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { onAck(c); }}>
                    그대로 두기
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
