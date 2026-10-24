// 관리자 폼 공용 조각 — 항목 머리글·묶음·시군 고르기.
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SIGUNS, type SigunCode } from "@/shared/domain";

/**
 * 항목 하나. 입력칸이 하나면 label로 감싸 항목 이름이 입력칸 이름이 된다 (스크린리더·getByLabel).
 * 버튼 묶음·여러 입력칸(group)은 감싸지 않고 묶음 이름으로만 단다 — 첫 버튼 이름이 엉키지 않게.
 */
export function Field({
  label,
  children,
  hint,
  group = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  group?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {group ? (
        <div role="group" aria-label={label} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{label}</span>
          {children}
        </div>
      ) : (
        <Label className="flex flex-col items-stretch gap-1.5 text-sm font-medium">
          {label}
          {children}
        </Label>
      )}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function SigunSelect({ value, onChange }: { value: SigunCode; onChange: (v: SigunCode) => void }) {
  return (
    <Select value={value} onValueChange={(v) => { onChange(v as SigunCode); }}>
      <SelectTrigger className="w-full" aria-label="시군">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SIGUNS.map((s) => (
          <SelectItem key={s.code} value={s.code}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
