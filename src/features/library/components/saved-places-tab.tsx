// S06 저장한 장소 탭 — 필터, 카드 목록, 고른 장소를 코스·일차에 담는 막대.
// 고른 장소는 필터를 바꿔도 유지한다 (필터에 가려진 장소도 담긴다 — 막대에 수를 보여 준다).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { PlaceAddToTrip } from "@/features/places";
import { useLibraryViewStore } from "../hooks/use-library-view-store";
import {
  filterEntries,
  isFiltered,
  moodOptions,
  EMPTY_LIBRARY_FILTER,
  type LibraryEntry,
} from "../lib/library";
import { LibraryFilters } from "./library-filters";
import { RemoveSavedDialog } from "./remove-saved-dialog";
import { SavedPlaceCard } from "./saved-place-card";
import { SavedPlaceEditDialog } from "./saved-place-edit-dialog";

export function SavedPlacesTab({ entries }: { entries: LibraryEntry[] }) {
  const { t } = useTranslation("library");
  const filter = useLibraryViewStore((s) => s.filter);
  const setFilter = useLibraryViewStore((s) => s.setFilter);
  const selected = useLibraryViewStore((s) => s.selected);
  const toggle = useLibraryViewStore((s) => s.toggle);
  const clear = useLibraryViewStore((s) => s.clear);
  const [editing, setEditing] = useState<LibraryEntry | null>(null);
  const [removing, setRemoving] = useState<LibraryEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
        <p className="font-medium">{t("savedTab.emptyTitle")}</p>
        <p className="text-muted-foreground text-sm text-pretty">{t("savedTab.emptyBody")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to={paths.places}>{t("browsePlaces")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const moods = moodOptions(entries);
  // 태그를 지워 사라진 분위기는 조건에서도 뺀다 (보이지 않는 조건으로 목록이 비지 않게)
  const active = { ...filter, moods: filter.moods.filter((m) => moods.includes(m)) };
  const shown = filterEntries(entries, active);
  const picked = entries.filter(
    (e) => selected.includes(e.saved.id) && (e.place !== null || e.custom !== null),
  );
  const pickedIds = new Set(picked.map((e) => e.saved.id));

  return (
    <div className="flex flex-col gap-4">
      <LibraryFilters value={active} moods={moods} onChange={setFilter} />
      <p className="text-sm font-medium" aria-live="polite">
        {t("savedTab.count", { count: shown.length })}
      </p>
      {shown.length === 0 ? (
        <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
          <p className="font-medium">{t("savedTab.noMatchTitle")}</p>
          <p className="text-muted-foreground text-sm">{t("savedTab.noMatchBody")}</p>
          {isFiltered(active) && (
            <Button
              variant="outline"
              onClick={() => {
                setFilter(EMPTY_LIBRARY_FILTER);
              }}
            >
              {t("resetFilter")}
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((e) => (
            <li key={e.saved.id}>
              <SavedPlaceCard
                entry={e}
                selected={pickedIds.has(e.saved.id)}
                onToggle={() => {
                  toggle(e.saved.id);
                }}
                onEdit={() => {
                  setEditing(e);
                }}
                onRemove={() => {
                  setRemoving(e);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {picked.length > 0 && (
        <div className="border-border bg-background text-foreground sticky bottom-16 flex flex-col gap-3 rounded-lg border p-4 shadow-md md:bottom-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("savedTab.picked", { count: picked.length })}</p>
            <Button variant="ghost" size="sm" onClick={clear}>
              {t("savedTab.clearSelection")}
            </Button>
          </div>
          <PlaceAddToTrip
            places={picked.flatMap((e) => (e.place ? [e.place] : []))}
            customPlaces={picked.flatMap((e) => (e.custom ? [e.custom] : []))}
            onAdded={clear}
          />
        </div>
      )}

      <SavedPlaceEditDialog
        entry={editing}
        onClose={() => {
          setEditing(null);
        }}
      />
      <RemoveSavedDialog
        entry={removing}
        onClose={() => {
          setRemoving(null);
        }}
      />
    </div>
  );
}
