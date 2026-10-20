// 사진 편집 — 올리기·삭제·대표 사진 지정(맨 앞으로). Storage content/{kind}/{id}/ (규칙: 관리자·이미지·10MB 미만)
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { AdminKind } from "@/app/paths";
import { DeleteIcon, LoadingIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { PhotoTooLargeError } from "../api/admin-api";
import { useUploadPhoto } from "../hooks/use-admin";

export function PhotosEditor({ kind, contentId }: { kind: AdminKind; contentId: string }) {
  const { control, getValues, setValue } = useFormContext();
  const upload = useUploadPhoto(kind, contentId);
  const inputId = useId();
  return (
    <Controller
      control={control}
      name="photos"
      render={({ field }) => {
        const photos = (field.value as string[] | undefined) ?? [];
        const onFiles = async (files: FileList | null) => {
          for (const file of Array.from(files ?? [])) {
            try {
              const url = await upload.mutateAsync(file);
              // 여러 장을 차례로 올릴 때 렌더 시점 값이 아니라 지금 값에 덧붙인다
              const latest = (getValues("photos") as string[] | undefined) ?? [];
              setValue("photos", [...latest, url], { shouldDirty: true });
            } catch (e) {
              toast.error(
                e instanceof PhotoTooLargeError
                  ? e.message
                  : "사진을 올리지 못했어요. 다시 시도해주세요.",
              );
            }
          }
        };
        return (
          <div className="flex flex-col gap-3">
            {photos.length === 0 ? (
              <p className="text-muted-foreground text-sm">아직 사진이 없어요.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((url, i) => (
                  <li
                    key={url}
                    className="border-border flex flex-col gap-1 overflow-hidden rounded-md border"
                  >
                    <img
                      src={url}
                      alt={`사진 ${String(i + 1)}`}
                      className="aspect-video w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-1 p-1">
                      {i === 0 ? (
                        <span className="text-muted-foreground px-1 text-xs">대표 사진</span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            field.onChange([url, ...photos.filter((p) => p !== url)]);
                          }}
                        >
                          대표로
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`사진 ${String(i + 1)} 삭제`}
                        onClick={() => {
                          field.onChange(photos.filter((p) => p !== url));
                        }}
                      >
                        <DeleteIcon size="sm" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <input
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                disabled={upload.isPending}
                className="sr-only"
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" asChild disabled={upload.isPending}>
                <label htmlFor={inputId} className="cursor-pointer">
                  {upload.isPending && <LoadingIcon size="sm" className="animate-spin" />}
                  사진 올리기
                </label>
              </Button>
              <span className="text-muted-foreground text-sm">
                10MB 미만 이미지 · 사진 출처는 정보 출처 칸에 적어 주세요
              </span>
            </div>
          </div>
        );
      }}
    />
  );
}
