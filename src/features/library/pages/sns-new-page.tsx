// S07 SNS 링크 저장 — 새 링크, 또는 ?link=<id>로 보관한 링크를 고친다(나중에 장소 연결).
// 서비스가 영상·게시물에서 장소를 자동으로 찾지 않는다 — 사용자가 원문을 보고 직접 연결한다 (기능명세 §4).
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { ChevronLeftIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlacesByIds } from "@/features/places";
import { LoginRequired } from "../components/login-required";
import { SnsLinkForm } from "../components/sns-link-form";
import { useCustomPlaces, useSnsLinks } from "../hooks/use-library";
import { useSnsFormStore } from "../hooks/use-sns-form-store";
import { EMPTY_SNS_FORM, formOfLink } from "../lib/sns-form";
import type { CustomPlace, SnsLink } from "@/shared/domain";

export default function SnsNewPage() {
  const [params] = useSearchParams();
  const linkId = params.get("link");
  const title = linkId ? "SNS 링크 고치기" : "SNS 링크 저장";

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Seo title={title} noindex />
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.library}>
          <ChevronLeftIcon size="sm" />
          보관함
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">{title}</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          인스타그램·유튜브·블로그에서 본 곳을 원문 링크와 함께 보관해요. 영상이나 글에서 장소를
          자동으로 찾아 주지는 않으니, 원문을 보고 장소를 직접 연결해 주세요.
        </p>
      </div>
      {linkId ? <EditLink key={linkId} linkId={linkId} /> : <NewLink />}
    </section>
  );
}

function NewLink() {
  // 처음 그릴 때 보존 값으로 시작한다 — 이후 스토어가 바뀌어도 쓰고 있는 폼을 다시 만들지 않는다
  const [pending] = useState(() => useSnsFormStore.getState().pending);
  return (
    <SnsLinkForm link={null} initial={pending ?? EMPTY_SNS_FORM} restored={pending !== null} />
  );
}

function EditLink({ linkId }: { linkId: string }) {
  const authState = useAuthState();
  if (authState.status === "loading") return <FormSkeleton />;
  if (authState.status === "guest") {
    return (
      <LoginRequired
        title="로그인하면 보관한 링크를 고칠 수 있어요"
        description="보관한 링크와 연결한 장소는 계정에 있어요. 로그인하면 이 화면으로 돌아와요."
      />
    );
  }
  return <EditLinkLoaded linkId={linkId} />;
}

function EditLinkLoaded({ linkId }: { linkId: string }) {
  const links = useSnsLinks();
  const customs = useCustomPlaces();
  const link = links.data?.find((l) => l.id === linkId);

  const failed = [links, customs].filter((q) => q.isError);
  if (failed.length > 0)
    return (
      <LoadError
        onRetry={() => {
          for (const q of failed) void q.refetch();
        }}
      />
    );
  if (!links.data || !customs.data) return <FormSkeleton />;
  if (!link) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
        <p className="font-medium">링크를 찾을 수 없어요</p>
        <p className="text-muted-foreground text-sm">이미 삭제했거나 주소가 잘못된 링크예요.</p>
        <Button asChild variant="outline">
          <Link to={paths.library}>보관함으로 가기</Link>
        </Button>
      </div>
    );
  }
  return <EditLinkForm key={link.id} link={link} customs={customs.data} />;
}

function EditLinkForm({ link, customs }: { link: SnsLink; customs: CustomPlace[] }) {
  // 처음 연 링크의 장소로 고정한다 — 저장 뒤 목록을 새로 받아 연결 장소가 바뀌어도 폼을 다시 만들지 않는다
  const [placeIds] = useState(() =>
    link.linked.flatMap((r) => (r.kind === "place" ? [r.placeId] : [])),
  );
  const places = usePlacesByIds(placeIds);

  if (placeIds.length > 0 && places.isError) {
    return <LoadError onRetry={() => void places.refetch()} />;
  }
  if (placeIds.length > 0 && !places.data) return <FormSkeleton />;

  const initial = formOfLink(link, (r) => {
    if (r.kind === "place") {
      const p = places.data?.find((x) => x.id === r.placeId);
      return p ? { name: p.name, sigun: p.sigun } : null;
    }
    const c = customs.find((x) => x.id === r.customPlaceId);
    return c ? { name: c.name, sigun: c.sigun } : null;
  });
  return <SnsLinkForm link={link} initial={initial} restored={false} />;
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>링크를 불러오지 못했어요</AlertTitle>
        <AlertDescription>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</AlertDescription>
      </Alert>
      <Button onClick={onRetry}>다시 시도</Button>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
