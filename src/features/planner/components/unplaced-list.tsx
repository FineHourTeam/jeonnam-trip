// 미배치 후보 — 선택한 장소를 설명 없이 누락하지 않는다: 이유와 함께 남기고, 원하는 일차에 넣을 수 있게 (PLN-08, PLC-04).
import { CategoryIcon } from "@/components/content-meta";
import { DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { VisitItem } from "@/shared/domain";

export function UnplacedList({
  items,
  onPlace,
  onRemove,
}: {
  items: (VisitItem & { reason?: string })[];
  onPlace: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="unplaced-title">
      <div className="flex flex-col gap-0.5">
        <h2 id="unplaced-title" className="text-lg font-bold">
          미배치 후보 {items.length}곳
        </h2>
        <p className="text-muted-foreground text-sm">시간을 정하지 못했거나 직접 뺀 장소예요. 원하는 일차에 넣을 수 있어요.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => (
          <li key={it.id} className="border-border flex items-start gap-3 rounded-xl border border-dashed p-3">
            <CategoryIcon category={it.snapshot.category} size="sm" className="text-muted-foreground mt-1 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-semibold">{it.snapshot.name}</span>
              {it.reason ? <span className="text-muted-foreground text-sm">{it.reason}</span> : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => { onPlace(i); }}>
                일차에 넣기
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label={`${it.snapshot.name} 후보에서 지우기`} onClick={() => { onRemove(i); }}>
                <DeleteIcon size="sm" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
