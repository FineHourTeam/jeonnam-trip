// S07 SNS 링크 저장 — 링크 → (선택) 등록 장소 검색·직접 등록(여러 곳) → 지역·태그·메모 → 저장.
// 미리보기 여부와 관계없이 링크를 보관하고, 장소를 몰라도 저장할 수 있다. 원문 내용·위치를 자동으로 가져오지 않는다 (SNS-01~03).
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { paths } from "@/app/paths";
import { Notice } from "@/components/detail-parts";
import { AddIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { PageBody, PageTopBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EMPTY_PLACE_FILTER, matchesPlace, usePlaces, usePlacesByIds } from "@/features/content";
import { useCurrentUid } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { detectSnsPlatform, SNS_PLATFORM_LABEL, validateSnsUrl } from "@/lib/url";
import { PERSONAL_TAGS, SIGUNS, sigunName, type CustomPlace, type SigunCode, type SnsLink } from "@/shared/domain";
import { CustomPlaceForm } from "../components/custom-place-form";
import { useCustomPlaces, useSaveSnsLink, useSnsLink } from "../hooks/use-library";
import { useSnsDraftStore, type SnsDraft } from "../hooks/use-sns-draft-store";

const schema = z.object({
  url: z.string().superRefine((v, ctx) => {
    const r = validateSnsUrl(v);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.message });
  }),
  title: z.string().max(60, "제목은 60자까지 쓸 수 있어요."),
  sigun: z.string(),
  tags: z.array(z.string()),
  memo: z.string().max(1000, "메모는 1,000자까지 쓸 수 있어요."),
});
type Values = z.infer<typeof schema>;

function PlaceSearch({ exclude, onPick }: { exclude: string[]; onPick: (id: string, name: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const q = usePlaces({});
  const list = keyword.trim()
    ? (q.data?.pages.flatMap((p) => p.items) ?? [])
        .filter((p) => !exclude.includes(p.id) && matchesPlace(p, { ...EMPTY_PLACE_FILTER, keyword }))
        .slice(0, 8)
    : [];
  return (
    <div className="flex flex-col gap-2">
      <InputGroup className="h-11 rounded-xl">
        <InputGroupAddon>
          <SearchIcon size="sm" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="등록된 장소 이름으로 찾기"
          aria-label="등록 장소 검색"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); }}
        />
      </InputGroup>
      {keyword.trim() && !q.isPending && list.length === 0 ? (
        <p className="text-muted-foreground text-sm">등록된 장소에 없어요. 아래에서 직접 등록할 수 있어요.</p>
      ) : null}
      {list.length > 0 ? (
        <ul className="border-border divide-border divide-y rounded-xl border">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="hover:bg-background-subtle flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm"
                onClick={() => {
                  onPick(p.id, p.name);
                  setKeyword("");
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-xs">{sigunName(p.sigun)}</span>
                </span>
                <AddIcon size="sm" className="text-primary shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SnsForm({ initial, initialCustomIds, editId }: { initial: SnsDraft; initialCustomIds: string[]; editId: string | null }) {
  const uid = useCurrentUid();
  const navigate = useNavigate();
  const location = useLocation();
  const save = useSaveSnsLink();
  const draftStore = useSnsDraftStore();
  const [placeIds, setPlaceIds] = useState<string[]>(initial.placeIds);
  const [customs, setCustoms] = useState<Omit<CustomPlace, "id" | "createdAt">[]>(initial.customs);
  const [existingCustomIds, setExistingCustomIds] = useState<string[]>(initialCustomIds);
  const myCustoms = useCustomPlaces();
  const [adding, setAdding] = useState(false);
  const known = usePlacesByIds(placeIds);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { url: initial.url, title: initial.title, sigun: initial.sigun ?? "unknown", tags: initial.tags, memo: initial.memo },
  });
  const e = form.formState.errors;
  const url = form.watch("url");
  const check = validateSnsUrl(url);
  const linkedCount = placeIds.length + customs.length + existingCustomIds.length;

  const submit = form.handleSubmit((v) => {
    const href = validateSnsUrl(v.url);
    if (!href.ok) return;
    const sigun = v.sigun === "unknown" ? null : (v.sigun as SigunCode);
    if (!uid) {
      draftStore.set({ url: v.url, title: v.title, sigun, tags: v.tags, memo: v.memo, placeIds, customs });
      toast.info("로그인하면 이어서 저장해요. 입력한 내용은 이 기기에 남겨 뒀어요.");
      void navigate(paths.login, { state: { from: location.pathname + location.search } });
      return;
    }
    save.mutate(
      {
        id: editId ?? undefined,
        url: href.href,
        platform: detectSnsPlatform(href.href),
        title: v.title.trim() || undefined,
        sigun,
        tags: v.tags,
        memo: v.memo.trim(),
        linkedPlaceIds: placeIds,
        existingCustomIds,
        newCustomPlaces: customs,
      },
      {
        onSuccess: () => {
          draftStore.clear();
          toast.success(linkedCount > 0 ? `링크와 장소 ${String(linkedCount)}곳을 보관함에 저장했어요.` : "링크를 저장했어요. 장소는 나중에 연결할 수 있어요.");
          void navigate(`${paths.library}?tab=links`, { replace: true });
        },
        onError: (err) => toast.error(`저장하지 못했어요. ${errorMessage(err)}`),
      },
    );
  });

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        void submit();
      }}
    >
      <section className="flex flex-col gap-2">
        <Label htmlFor="sns-url" className="text-lg font-bold">
          링크
        </Label>
        <Input id="sns-url" inputSize="touch" inputMode="url" placeholder="https://www.instagram.com/p/…" aria-invalid={Boolean(e.url)} {...form.register("url")} />
        {e.url?.message ? (
          <p className="text-destructive text-sm" role="alert">
            {e.url.message}
          </p>
        ) : check.ok ? (
          <p className="text-muted-foreground text-sm">{SNS_PLATFORM_LABEL[detectSnsPlatform(check.href)]} 링크예요. 내용은 가져오지 않고 링크만 보관해요.</p>
        ) : null}
        <Input inputSize="touch" placeholder="알아보기 쉬운 제목 (선택)" aria-label="제목" {...form.register("title")} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">
            장소 연결 <span className="text-muted-foreground text-sm font-normal">(선택 · 여러 곳)</span>
          </h2>
          <p className="text-muted-foreground text-sm">원문에 나온 곳을 찾아 연결해요. 몰라도 링크만 저장하고 나중에 연결할 수 있어요.</p>
        </div>
        {linkedCount > 0 ? (
          <div className="flex flex-wrap gap-2">
            {placeIds.map((id) => (
              <Badge key={id} variant="secondary" className="h-8 gap-1 pr-1 text-sm">
                {known.data?.find((p) => p.id === id)?.name ?? "등록 장소"}
                <Button type="button" variant="ghost" size="icon-xs" aria-label="연결 해제" onClick={() => { setPlaceIds((l) => l.filter((x) => x !== id)); }}>
                  <CloseIcon size="sm" />
                </Button>
              </Badge>
            ))}
            {existingCustomIds.map((id) => (
              <Badge key={id} variant="outline" className="h-8 gap-1 pr-1 text-sm">
                {myCustoms.data?.find((c) => c.id === id)?.name ?? "내가 등록한 장소"}
                <Button type="button" variant="ghost" size="icon-xs" aria-label="연결 해제" onClick={() => { setExistingCustomIds((l) => l.filter((x) => x !== id)); }}>
                  <CloseIcon size="sm" />
                </Button>
              </Badge>
            ))}
            {customs.map((c, i) => (
              <Badge key={`${c.name}-${String(i)}`} variant="outline" className="h-8 gap-1 pr-1 text-sm">
                {c.name} · 직접 등록{c.location ? "" : " · 위치 미확인"}
                <Button type="button" variant="ghost" size="icon-xs" aria-label="연결 해제" onClick={() => { setCustoms((l) => l.filter((_, k) => k !== i)); }}>
                  <CloseIcon size="sm" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : null}
        <PlaceSearch exclude={placeIds} onPick={(id) => { setPlaceIds((l) => [...l, id]); }} />
        {adding ? (
          <CustomPlaceForm
            onAdd={(p) => {
              setCustoms((l) => [...l, p]);
              setAdding(false);
            }}
            onCancel={() => { setAdding(false); }}
          />
        ) : (
          <Button type="button" variant="outline" size="touch" className="self-start" onClick={() => { setAdding(true); }}>
            <AddIcon size="sm" />
            직접 등록하기
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">정리 (선택)</h2>
        <div className="flex flex-col gap-1.5">
          <Label>지역</Label>
          <Controller
            control={form.control}
            name="sigun"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-11 w-full" aria-label="지역">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">모름 (미분류로 보관)</SelectItem>
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
          <span className="text-sm font-medium" id="sns-tags">
            개인 태그
          </span>
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <ToggleGroup type="multiple" variant="chip" size="chip" className="w-full flex-wrap" value={field.value} onValueChange={field.onChange} aria-labelledby="sns-tags">
                {PERSONAL_TAGS.map((t) => (
                  <ToggleGroupItem key={t} value={t}>
                    {t}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sns-memo">메모</Label>
          <Textarea id="sns-memo" rows={3} placeholder="예: 댓글에 상호가 있었어요" aria-invalid={Boolean(e.memo)} {...form.register("memo")} />
          {e.memo?.message ? <p className="text-destructive text-sm">{e.memo.message}</p> : null}
        </div>
      </section>

      {linkedCount === 0 ? (
        <Notice tone="info">장소를 연결하지 않은 링크는 보관함의 "장소 연결 전"에 모이고, 일정 자동 배치에서는 빠져요.</Notice>
      ) : null}
      <Button type="submit" size="xl" disabled={save.isPending}>
        {save.isPending ? "저장하는 중..." : uid ? "보관함에 저장하기" : "로그인하고 저장하기"}
      </Button>
    </form>
  );
}

const EMPTY: SnsDraft = { url: "", title: "", sigun: null, tags: [], memo: "", placeIds: [], customs: [] };

export default function SnsNewPage() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const draft = useSnsDraftStore((s) => s.draft);
  const existing = useSnsLink(editId);
  const l: SnsLink | null | undefined = editId ? existing.data : undefined;
  const initial: SnsDraft = l
    ? {
        url: l.url,
        title: l.title ?? "",
        sigun: l.sigun,
        tags: l.tags,
        memo: l.memo,
        placeIds: l.linked.flatMap((r) => (r.kind === "place" ? [r.placeId] : [])),
        customs: [],
      }
    : (draft ?? EMPTY);
  const initialCustomIds = l ? l.linked.flatMap((r) => (r.kind === "custom" ? [r.customPlaceId] : [])) : [];

  return (
    <div className="flex flex-col pb-10">
      <Seo title="SNS 링크 저장" noindex />
      <PageTopBar fallback={paths.library} title={editId ? "링크 고치기" : "SNS 링크 저장"} />
      <PageBody className="gap-6 pt-5">
        {editId && existing.isPending ? (
          <DetailSkeleton />
        ) : editId && !existing.data ? (
          <Notice tone="warning" title="링크를 찾을 수 없어요">
            삭제됐거나 다른 계정의 링크예요. 로그인한 계정을 확인해 주세요.
          </Notice>
        ) : (
          <SnsForm key={editId ?? "new"} initial={initial} initialCustomIds={initialCustomIds} editId={editId} />
        )}
      </PageBody>
    </div>
  );
}
