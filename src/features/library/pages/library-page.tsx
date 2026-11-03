// S06 보관함 — 저장한 장소(필터·여러 곳 선택 → 코스·일차에 담기, 태그·메모, 저장 해제)와 장소 연결 전 링크.
// 계정에 보관하므로 로그인해야 쓴다. 비회원에게는 이유와 로그인 버튼을 보여 준다 (돌아오면 이 화면).
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { AddIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlacesByIds } from "@/features/places";
import type { SnsLink } from "@/shared/domain";
import { LoginRequired } from "../components/login-required";
import { SavedPlacesTab } from "../components/saved-places-tab";
import { SnsLinkCard } from "../components/sns-link-card";
import { useCustomPlaces, useSavedPlaces, useSnsLinks } from "../hooks/use-library";
import { useLibraryViewStore } from "../hooks/use-library-view-store";
import { libraryEntries, linksWithoutSavedPlace } from "../lib/library";

export default function LibraryPage() {
  const { t } = useTranslation("library");
  const authState = useAuthState();

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <Seo title={t("page.title")} description={t("page.seoDescription")} noindex />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-balance">{t("page.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("page.subtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link to={paths.snsNew}>
            <AddIcon size="sm" />
            {t("saveSns")}
          </Link>
        </Button>
      </div>

      {authState.status === "loading" ? (
        <LoadingList />
      ) : authState.status === "guest" ? (
        <LoginRequired title={t("page.guestTitle")} description={t("page.guestBody")}>
          <Button asChild variant="outline">
            <Link to={paths.places}>{t("browsePlaces")}</Link>
          </Button>
        </LoginRequired>
      ) : (
        <LibraryContent />
      )}
    </section>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}

function LibraryContent() {
  const { t } = useTranslation("library");
  const saved = useSavedPlaces();
  const customs = useCustomPlaces();
  const links = useSnsLinks();
  const placeIds = useMemo(
    () => (saved.data ?? []).flatMap((s) => (s.ref.kind === "place" ? [s.ref.placeId] : [])),
    [saved.data],
  );
  const places = usePlacesByIds(placeIds);
  const tab = useLibraryViewStore((s) => s.tab);
  const setTab = useLibraryViewStore((s) => s.setTab);

  const queries = placeIds.length > 0 ? [saved, customs, links, places] : [saved, customs, links];
  const failed = queries.filter((q) => q.isError);
  if (failed.length > 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <AlertTitle>{t("page.loadError")}</AlertTitle>
          <AlertDescription>{t("networkHint")}</AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            for (const q of failed) void q.refetch();
          }}
        >
          {t("retry", { ns: "common" })}
        </Button>
      </div>
    );
  }
  if (!saved.data || !customs.data || !links.data || (placeIds.length > 0 && !places.data)) {
    return <LoadingList />;
  }

  const entries = libraryEntries(saved.data, places.data ?? [], customs.data, links.data);
  // 방금 저장한 장소는 새 목록을 받는 동안(이전 결과를 보여 주는 중) 원본이 비어 있다 — '볼 수 없는 장소'로 그리지 않고 기다린다
  const resolving = entries.some((e) =>
    e.saved.ref.kind === "place"
      ? e.place === null && places.isPlaceholderData
      : e.custom === null && customs.isFetching,
  );
  if (resolving) return <LoadingList />;
  const unlinked = linksWithoutSavedPlace(links.data, saved.data);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        setTab(v === "links" ? "links" : "places");
      }}
      className="flex flex-col gap-4"
    >
      <TabsList>
        <TabsTrigger value="places">{t("page.tabPlaces", { count: entries.length })}</TabsTrigger>
        <TabsTrigger value="links">{t("page.tabLinks", { count: unlinked.length })}</TabsTrigger>
      </TabsList>
      <TabsContent value="places">
        <SavedPlacesTab entries={entries} />
      </TabsContent>
      <TabsContent value="links">
        <UnlinkedLinks links={unlinked} />
      </TabsContent>
    </Tabs>
  );
}

function UnlinkedLinks({ links }: { links: SnsLink[] }) {
  const { t } = useTranslation("library");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm text-pretty">{t("page.unlinkedHelp")}</p>
      {links.length === 0 ? (
        <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
          <p className="font-medium">{t("page.unlinkedEmptyTitle")}</p>
          <p className="text-muted-foreground text-sm">{t("page.unlinkedEmptyBody")}</p>
          <Button asChild variant="outline">
            <Link to={paths.snsNew}>{t("saveSns")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {links.map((l) => (
            <li key={l.id}>
              <SnsLinkCard link={l} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
