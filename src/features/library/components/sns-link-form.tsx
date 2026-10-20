// S07 SNS 링크 폼 — 원문 주소(http/https·2,000자) → 장소 연결(선택, 여러 곳) → 지역·태그·메모(선택) → 저장.
// 미리보기를 가져오지 않고, 장소가 없어도 링크를 보관한다. 비회원은 저장할 때 로그인하고, 쓰던 내용은 돌아와서 이어 쓴다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { SIGUNS, type SnsLink } from "@/shared/domain";
import { SnsLinkExistsError } from "../api/library-api";
import { useSaveSnsLink, useSnsLinks } from "../hooks/use-library";
import { useLibraryViewStore } from "../hooks/use-library-view-store";
import { useSnsFormStore } from "../hooks/use-sns-form-store";
import {
  MAX_MEMO_LENGTH,
  MAX_TAGS,
  SNS_PLATFORM_LABEL,
  normalizeSnsUrl,
  snsPlatformOf,
} from "../lib/library";
import {
  EMPTY_SNS_FORM,
  NO_SIGUN,
  linkInputOf,
  mergeLinkInput,
  snsFormSchema,
  type SnsFormValues,
} from "../lib/sns-form";
import { DeleteLinkButton } from "./delete-link-button";
import { LinkedPlacesField } from "./linked-places-field";

interface SnsLinkFormProps {
  /** 고치는 링크 (없으면 새 링크) */
  link: SnsLink | null;
  initial: SnsFormValues;
  /** 로그인하러 가기 전에 쓰던 내용을 불러왔는지 */
  restored: boolean;
}

export function SnsLinkForm({ link, initial, restored }: SnsLinkFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const authState = useAuthState();
  const links = useSnsLinks();
  const save = useSaveSnsLink();
  const setPending = useSnsFormStore((s) => s.setPending);
  const clearPending = useSnsFormStore((s) => s.clear);
  const setTab = useLibraryViewStore((s) => s.setTab);
  const form = useForm<SnsFormValues>({
    resolver: zodResolver(snsFormSchema),
    defaultValues: initial,
  });
  const { errors } = form.formState;
  const [showRestored, setShowRestored] = useState(restored);
  const url = useWatch({ control: form.control, name: "url" });
  const [places, tags, memo] = useWatch({
    control: form.control,
    name: ["places", "tags", "memo"],
  });
  const hasExtra = places.length > 0 || tags.trim() !== "" || memo.trim() !== "";
  const normalized = normalizeSnsUrl(url);
  const duplicate = normalized
    ? links.data?.find((l) => l.url === normalized && l.id !== link?.id)
    : undefined;
  const guest = authState.status === "guest";

  const goToLibrary = (hasPlaces: boolean) => {
    setTab(hasPlaces ? "places" : "links");
    void navigate(paths.library);
  };

  const submit = form.handleSubmit((v) => {
    if (guest) {
      setPending(v);
      void navigate(paths.login, { state: { from: location.pathname + location.search } });
      return;
    }
    if (duplicate) return;
    save.mutate(
      { input: linkInputOf(v), linkId: link?.id ?? null },
      {
        onSuccess: () => {
          clearPending();
          const n = v.places.length;
          toast.success(
            link
              ? "링크를 고쳤어요."
              : n > 0
                ? `링크와 장소 ${String(n)}곳을 보관했어요.`
                : "링크를 장소 연결 전 링크에 보관했어요.",
          );
          goToLibrary(n > 0);
        },
        onError: (e) => {
          if (e instanceof SnsLinkExistsError) {
            toast("이미 보관한 링크예요. 보관한 링크에 장소를 더해 주세요.", {
              action: { label: "링크 열기", onClick: () => void navigate(paths.snsEdit(e.linkId)) },
            });
            return;
          }
          toast.error("링크를 보관하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
        },
      },
    );
  });

  // 이미 보관한 주소면 새로 쓴 장소·태그·메모를 그 링크에 더한다 (로그인하고 돌아온 폼을 다시 쓰지 않게)
  const merge = form.handleSubmit((v) => {
    if (!duplicate) return;
    const input = mergeLinkInput(duplicate, linkInputOf(v));
    if (!input) {
      toast.error("합치면 장소·태그·메모 한도를 넘어요. 보관한 링크를 열어 직접 고쳐 주세요.");
      return;
    }
    save.mutate(
      { input, linkId: duplicate.id },
      {
        onSuccess: () => {
          clearPending();
          toast.success("보관한 링크에 쓴 내용을 더했어요.");
          goToLibrary(input.targets.length > 0);
        },
        onError: () => {
          toast.error("링크를 보관하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
        },
      },
    );
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-8" noValidate>
      {showRestored && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            쓰던 내용을 그대로 불러왔어요. 확인하고 저장해 주세요.
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearPending();
                form.reset(EMPTY_SNS_FORM);
                setShowRestored(false);
              }}
            >
              새로 쓰기
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-url">원문 링크</Label>
        <Input
          id="sns-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          readOnly={link !== null}
          placeholder="https://www.instagram.com/p/…"
          aria-describedby="sns-url-hint"
          aria-invalid={errors.url !== undefined || duplicate !== undefined ? true : undefined}
          {...form.register("url")}
        />
        <p id="sns-url-hint" className="text-muted-foreground text-xs">
          {link
            ? "주소는 바꿀 수 없어요. 다른 주소는 새 링크로 보관해 주세요."
            : normalized
              ? `${SNS_PLATFORM_LABEL[snsPlatformOf(normalized)]} 링크로 보관해요. 미리보기는 가져오지 않아요.`
              : "인스타그램·유튜브·블로그 등 http:// 또는 https:// 주소를 붙여 넣어 주세요."}
        </p>
        {errors.url && <p className="text-destructive text-sm">{errors.url.message}</p>}
        {duplicate && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-destructive text-sm">
              이미 보관한 링크예요.{" "}
              <Link to={paths.snsEdit(duplicate.id)} className="underline underline-offset-4">
                보관한 링크 열기
              </Link>
            </p>
            {!link && !guest && hasExtra && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={save.isPending}
                onClick={() => void merge()}
              >
                쓴 내용을 보관한 링크에 더하기
              </Button>
            )}
          </div>
        )}
      </div>

      <Controller
        control={form.control}
        name="places"
        render={({ field, fieldState }) => (
          <LinkedPlacesField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-sigun">지역 (선택)</Label>
        <Controller
          control={form.control}
          name="sigun"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="sns-sigun" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SIGUN}>미분류</SelectItem>
                {SIGUNS.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-tags">태그 (선택)</Label>
        <Input
          id="sns-tags"
          placeholder="예: 오션뷰, 사진"
          aria-describedby="sns-tags-hint"
          aria-invalid={errors.tags ? true : undefined}
          {...form.register("tags")}
        />
        <p id="sns-tags-hint" className="text-muted-foreground text-xs">
          쉼표로 나눠 {MAX_TAGS}개까지 붙여요. 이번에 새로 담는 장소에도 같은 태그가 붙어요.
        </p>
        {errors.tags && <p className="text-destructive text-sm">{errors.tags.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sns-memo">메모 (선택)</Label>
        <Textarea
          id="sns-memo"
          rows={3}
          maxLength={MAX_MEMO_LENGTH}
          placeholder="예: 댓글에 적힌 주차 팁 확인하기"
          aria-invalid={errors.memo ? true : undefined}
          {...form.register("memo")}
        />
        {errors.memo && <p className="text-destructive text-sm">{errors.memo.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={authState.status === "loading" || save.isPending || duplicate !== undefined}
        >
          {save.isPending ? "보관하는 중…" : guest ? "로그인하고 저장하기" : "저장하기"}
        </Button>
        {guest && (
          <p className="text-muted-foreground text-center text-xs">
            링크는 계정에 보관해요. 로그인하고 돌아오면 쓰던 내용이 그대로 있어요.
          </p>
        )}
        {link && (
          <div className="flex justify-center">
            <DeleteLinkButton
              linkId={link.id}
              onDeleted={() => {
                goToLibrary(false);
              }}
            />
          </div>
        )}
      </div>
    </form>
  );
}
