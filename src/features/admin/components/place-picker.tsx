// 코스에 넣을 등록 장소 고르기 — 이름 검색 후 목록에서 선택 (관리자 장소 목록 캐시를 쓴다).
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sigunName, type Place } from "@/shared/domain";

interface PlacePickerProps {
  places: Place[];
  onPick: (place: Place) => void;
}

export function PlacePicker({ places, onPick }: PlacePickerProps) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const k = q.trim();
    if (!k) return [];
    return places.filter((p) => p.name.includes(k) || p.address?.includes(k)).slice(0, 20);
  }, [places, q]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
        }}
        placeholder="장소 이름이나 주소로 찾기"
        aria-label="장소 찾기"
      />
      {q.trim() && matches.length === 0 && (
        <p className="text-muted-foreground text-sm">
          찾는 장소가 없어요. 장소 관리에서 먼저 등록해 주세요.
        </p>
      )}
      {matches.length > 0 && (
        <ul className="border-border flex max-h-64 flex-col overflow-y-auto rounded-md border">
          {matches.map((p) => (
            <li
              key={p.id}
              className="border-border flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <span className="min-w-0 flex-1 text-sm">
                {p.name || "이름 없음"}
                <span className="text-muted-foreground"> · {sigunName(p.sigun)}</span>
                {p.status !== "published" && (
                  <span className="text-muted-foreground"> · 비공개</span>
                )}
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  onPick(p);
                  setQ("");
                }}
              >
                넣기
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
