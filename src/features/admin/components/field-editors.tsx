// 관리자 입력 조각 — 영업 구간(미확인/휴무/운영)·요일표·예외일, 항목별 확인 상태, 사진(저작자 표시), 좌표.
// 영업시간 null(미확인)과 [](휴무)를 반드시 구분해 저장한다 (기능명세 §1).
import { useState } from "react";
import { AddIcon, DeleteIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/features/map";
import type { FieldCheck, LatLng, OpeningHours, PhotoAsset, TimeRange } from "@/shared/domain";

type RangesMode = "unknown" | "closed" | "open";

export function RangesEditor({
  value,
  onChange,
  label,
  closedLabel = "휴무",
}: {
  value: TimeRange[] | null;
  onChange: (v: TimeRange[] | null) => void;
  label: string;
  closedLabel?: string;
}) {
  const mode: RangesMode = value === null ? "unknown" : value.length === 0 ? "closed" : "open";
  const set = (i: number, patch: Partial<TimeRange>) => {
    onChange((value ?? []).map((r, k) => (k === i ? { ...r, ...patch } : r)));
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm font-medium">{label}</span>
        <Select
          value={mode}
          onValueChange={(m) => {
            onChange(
              m === "unknown" ? null : m === "closed" ? [] : [{ open: "10:00", close: "18:00" }],
            );
          }}
        >
          <SelectTrigger className="w-32" aria-label={`${label} 상태`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">미확인</SelectItem>
            <SelectItem value="closed">{closedLabel}</SelectItem>
            <SelectItem value="open">운영</SelectItem>
          </SelectContent>
        </Select>
        {mode === "open" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange([...(value ?? []), { open: "17:00", close: "21:00" }]);
            }}
          >
            <AddIcon size="sm" />
            구간
          </Button>
        ) : null}
      </div>
      {(value ?? []).map((r, i) => (
        <div key={i} className="ml-18 flex flex-wrap items-center gap-2 text-sm">
          <Input
            type="time"
            className="w-28"
            value={r.open}
            aria-label={`${label} 시작`}
            onChange={(e) => {
              set(i, { open: e.target.value });
            }}
          />
          ~
          <Input
            type="time"
            className="w-28"
            value={r.close}
            aria-label={`${label} 종료`}
            onChange={(e) => {
              set(i, { close: e.target.value });
            }}
          />
          <span className="text-muted-foreground">마감</span>
          <Input
            type="time"
            className="w-28"
            value={r.lastOrder ?? ""}
            aria-label={`${label} 주문·입장 마감`}
            onChange={(e) => {
              const { lastOrder: _l, ...rest } = r;
              onChange(
                (value ?? []).map((x, k) =>
                  k === i ? (e.target.value ? { ...rest, lastOrder: e.target.value } : rest) : x,
                ),
              );
            }}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="구간 지우기"
            onClick={() => {
              onChange((value ?? []).filter((_, k) => k !== i));
            }}
          >
            <DeleteIcon size="sm" />
          </Button>
        </div>
      ))}
    </div>
  );
}

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export function WeeklyHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHours;
  onChange: (v: OpeningHours) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {DOW_ORDER.map((d) => (
          <RangesEditor
            key={d}
            label={`${DOW[d] ?? ""}요일`}
            closedLabel="정기휴무"
            value={value.weekly[d]}
            onChange={(r) => {
              onChange({ ...value, weekly: { ...value.weekly, [d]: r } });
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            const mon = value.weekly[1];
            onChange({
              ...value,
              weekly: { 0: mon, 1: mon, 2: mon, 3: mon, 4: mon, 5: mon, 6: mon },
            });
          }}
        >
          월요일 값을 모든 요일에 적용
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold">예외일 (임시 휴무·단축 영업)</span>
        {value.exceptions.map((ex, i) => (
          <div key={i} className="border-border flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="w-40"
                value={ex.date}
                aria-label="예외 날짜"
                onChange={(e) => {
                  onChange({
                    ...value,
                    exceptions: value.exceptions.map((x, k) =>
                      k === i ? { ...x, date: e.target.value } : x,
                    ),
                  });
                }}
              />
              <Input
                className="min-w-40 flex-1"
                placeholder="메모 (예: 임시 휴무)"
                value={ex.note ?? ""}
                aria-label="예외 메모"
                onChange={(e) => {
                  onChange({
                    ...value,
                    exceptions: value.exceptions.map((x, k) =>
                      k === i ? { ...x, note: e.target.value } : x,
                    ),
                  });
                }}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="예외일 지우기"
                onClick={() => {
                  onChange({ ...value, exceptions: value.exceptions.filter((_, k) => k !== i) });
                }}
              >
                <DeleteIcon size="sm" />
              </Button>
            </div>
            <RangesEditor
              label="그날"
              value={ex.ranges}
              onChange={(r) => {
                onChange({
                  ...value,
                  exceptions: value.exceptions.map((x, k) =>
                    k === i ? { ...x, ranges: r ?? [] } : x,
                  ),
                });
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            onChange({ ...value, exceptions: [...value.exceptions, { date: "", ranges: [] }] });
          }}
        >
          <AddIcon size="sm" />
          예외일 추가
        </Button>
      </div>
    </div>
  );
}

const STATE_LABEL = { verified: "확인됨", unverified: "미확인", conflict: "정보 상충" } as const;

export function ChecksEditor<T extends Record<string, FieldCheck>>({
  value,
  labels,
  onChange,
}: {
  value: T;
  labels: Record<keyof T & string, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(labels) as (keyof T & string)[]).map((k) => {
        const c: FieldCheck = value[k] ?? { state: "unverified" };
        const set = (patch: Partial<FieldCheck>) => {
          onChange({ ...value, [k]: { ...c, ...patch } });
        };
        return (
          <div
            key={k}
            className="border-border grid gap-2 rounded-lg border p-3 sm:grid-cols-[6rem_8rem_1fr_10rem] sm:items-center"
          >
            <span className="text-sm font-medium">{labels[k]}</span>
            <Select
              value={c.state}
              onValueChange={(s) => {
                set({ state: s as FieldCheck["state"] });
              }}
            >
              <SelectTrigger aria-label={`${labels[k]} 확인 상태`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATE_LABEL) as FieldCheck["state"][]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="출처 (공식 홈페이지·전화 확인 등)"
              value={c.source ?? ""}
              aria-label={`${labels[k]} 출처`}
              onChange={(e) => {
                set({ source: e.target.value });
              }}
            />
            <Input
              type="date"
              value={c.checkedAt ?? ""}
              aria-label={`${labels[k]} 확인일`}
              onChange={(e) => {
                set({ checkedAt: e.target.value });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function PhotosEditor({
  value,
  onChange,
  onUpload,
}: {
  value: PhotoAsset[];
  onChange: (v: PhotoAsset[]) => void;
  /** null이면 아직 저장 전이라 업로드할 수 없다 */
  onUpload: ((file: File) => Promise<string>) | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (i: number, patch: Partial<PhotoAsset>) => {
    onChange(value.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  };
  return (
    <div className="flex flex-col gap-3">
      {value.map((p, i) => (
        <div
          key={`${p.url}-${String(i)}`}
          className="border-border flex gap-3 rounded-lg border p-3"
        >
          <img
            src={p.url}
            alt=""
            className="bg-background-subtle size-20 shrink-0 rounded-md object-cover"
          />
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <Input
              value={p.credit ?? ""}
              placeholder="저작자"
              aria-label="저작자"
              onChange={(e) => {
                set(i, { credit: e.target.value });
              }}
            />
            <Input
              value={p.license ?? ""}
              placeholder="라이선스 (예: CC BY-SA 4.0)"
              aria-label="라이선스"
              onChange={(e) => {
                set(i, { license: e.target.value });
              }}
            />
            <Input
              className="sm:col-span-2"
              value={p.sourceUrl ?? ""}
              placeholder="원본 출처 주소"
              aria-label="출처 주소"
              onChange={(e) => {
                set(i, { sourceUrl: e.target.value });
              }}
            />
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="사진 빼기"
            onClick={() => {
              onChange(value.filter((_, k) => k !== i));
            }}
          >
            <DeleteIcon size="sm" />
          </Button>
        </div>
      ))}
      {onUpload ? (
        <Label className="border-border hover:bg-background-subtle flex h-11 w-fit cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm">
          <UploadIcon size="sm" />
          {uploading ? "올리는 중..." : "사진 올리기 (10MB 미만)"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size >= 10 * 1024 * 1024) {
                setError("10MB 미만 사진만 올릴 수 있어요.");
                return;
              }
              setUploading(true);
              setError(null);
              onUpload(file)
                .then((url) => {
                  onChange([...value, { url }]);
                })
                .catch(() => {
                  setError("사진을 올리지 못했어요. 관리자 권한과 네트워크를 확인해 주세요.");
                })
                .finally(() => {
                  setUploading(false);
                });
            }}
          />
        </Label>
      ) : (
        <p className="text-muted-foreground text-sm">처음 저장한 뒤 사진을 올릴 수 있어요.</p>
      )}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

export function LocationEditor({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
}) {
  const [map, setMap] = useState(false);
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-36"
          inputMode="decimal"
          placeholder="위도"
          aria-label="위도"
          value={value?.lat ?? ""}
          onChange={(e) => {
            const lat = num(e.target.value);
            onChange(lat === null ? null : { lat, lng: value?.lng ?? 127 });
          }}
        />
        <Input
          className="w-36"
          inputMode="decimal"
          placeholder="경도"
          aria-label="경도"
          value={value?.lng ?? ""}
          onChange={(e) => {
            const lng = num(e.target.value);
            onChange(lng === null ? null : { lat: value?.lat ?? 34.8, lng });
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setMap((v) => !v);
          }}
        >
          {map ? "지도 닫기" : "지도에서 고르기"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(null);
          }}
        >
          미확인으로
        </Button>
      </div>
      {map ? (
        <LocationPicker
          value={value}
          onChange={onChange}
          className="aspect-video w-full max-w-xl"
        />
      ) : null}
    </div>
  );
}
