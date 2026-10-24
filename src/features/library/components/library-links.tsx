// 보관함 · SNS 링크 — 장소 연결 전 링크도 버리지 않고 보관하고, 나중에 직접 연결한다 (S06·S07, SNS-01·02).
// 원문 내용은 가져오지 않는다. 링크 삭제는 연결해 둔 장소·메모를 지우지 않는다.
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExternalLinkIcon, LinkIcon } from "@/components/icons";
import { EmptyState, ErrorState, RowListSkeleton } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { usePlacesByIds } from "@/features/content";
import { errorMessage } from "@/lib/errors";
import { safeHref, SNS_PLATFORM_LABEL } from "@/lib/url";
import { sigunName, type SnsLink } from "@/shared/domain";
import { formatDateDot } from "@/shared/lib/format";
import { useCustomPlaces, useDeleteSnsLink, useSnsLinks } from "../hooks/use-library";

export function LibraryLinks() {
  const links = useSnsLinks();
  const custom = useCustomPlaces();
  const placeIds = (links.data ?? []).flatMap((l) => l.linked.flatMap((r) => (r.kind === "place" ? [r.placeId] : [])));
  const places = usePlacesByIds(placeIds);
  const remove = useDeleteSnsLink();
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [deleting, setDeleting] = useState<SnsLink | null>(null);

  if (links.isPending) return <RowListSkeleton />;
  if (links.isError) return <ErrorState error={links.error} onRetry={() => void links.refetch()} />;
  const all = links.data;
  if (all.length === 0) {
    return (
      <EmptyState
        icon={<LinkIcon />}
        title="저장한 SNS 링크가 없어요"
        description="인스타그램·유튜브·블로그에서 본 곳의 링크를 붙여 넣어 두세요. 장소를 몰라도 보관할 수 있어요."
        action={
          <Button asChild size="touch">
            <Link to={paths.snsNew}>링크 저장하기</Link>
          </Button>
        }
      />
    );
  }
  const list = onlyUnlinked ? all.filter((l) => l.linked.length === 0) : all;
  const nameOf = (r: SnsLink["linked"][number]) =>
    r.kind === "place"
      ? places.data?.find((p) => p.id === r.placeId)?.name
      : custom.data?.find((c) => c.id === r.customPlaceId)?.name;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          링크 {all.length}개 · 장소 연결 전 {all.filter((l) => l.linked.length === 0).length}개
        </p>
        <Toggle variant="chip" size="chip" pressed={onlyUnlinked} onPressedChange={setOnlyUnlinked} className="shrink-0">
          장소 연결 전만
        </Toggle>
      </div>
      {list.length === 0 ? (
        <EmptyState title="장소 연결 전 링크가 없어요" description="모든 링크에 장소를 연결했어요." />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((l) => {
            const href = safeHref(l.url);
            const names = l.linked.map(nameOf).filter((n): n is string => Boolean(n));
            return (
              <li key={l.id} className="border-border flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <span className="bg-primary-soft text-primary-soft-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <LinkIcon size="sm" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-semibold">{l.title ?? (href ? new URL(href).hostname : l.url)}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {SNS_PLATFORM_LABEL[l.platform]} · {l.sigun ? sigunName(l.sigun) : "지역 미분류"} · {formatDateDot(l.createdAt)} 저장
                    </span>
                  </div>
                </div>
                {names.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {names.map((n) => (
                      <Badge key={n} variant="secondary">
                        {n}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="bg-warning-soft text-warning-soft-foreground rounded-lg px-3 py-2 text-sm">
                    장소 연결 전이에요. 일정 자동 배치에서는 빠져요.
                  </p>
                )}
                {l.memo ? <p className="text-sm whitespace-pre-wrap">{l.memo}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {href ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={href} target="_blank" rel="noreferrer noopener">
                        <ExternalLinkIcon size="sm" />
                        원문 보기
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`${paths.snsNew}?id=${l.id}`}>{l.linked.length === 0 ? "장소 연결하기" : "고치기"}</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleting(l); }}>
                    삭제
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => { if (!v) setDeleting(null); }}
        title="링크를 삭제할까요?"
        description="연결해 둔 장소와 보관함의 메모는 그대로 남아요. 삭제하면 되돌릴 수 없어요."
        actionLabel="삭제하기"
        destructive
        pending={remove.isPending}
        onAction={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.success("링크를 삭제했어요.");
            },
            onError: (e) => toast.error(errorMessage(e)),
          });
        }}
      />
    </div>
  );
}
