// S06 보관함 — 저장한 장소 / SNS 링크. 로그인 전에는 로그인 안내 (탐색·작성은 비회원도 가능, 보관은 로그인 후).
import { Link, useLocation, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { AddIcon, BookmarkIcon } from "@/components/icons";
import { PageBody } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { CardGridSkeleton, EmptyState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LibraryLinks } from "../components/library-links";
import { LibraryPlaces } from "../components/library-places";

export default function LibraryPage() {
  const auth = useAuthState();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "links" ? "links" : "places";

  return (
    <PageBody width="xl" className="gap-5 pt-5 pb-8 md:pt-8">
      <Seo title="보관함" noindex />
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">보관함</h1>
          <p className="text-muted-foreground text-sm">
            가고 싶은 곳을 모아 두고 일정에 꺼내 써요. 메모는 나만 봐요.
          </p>
        </div>
        <Button asChild variant="outline" size="touch">
          <Link to={paths.snsNew}>
            <AddIcon size="sm" />
            SNS 링크
          </Link>
        </Button>
      </div>

      {auth.status === "loading" ? (
        <CardGridSkeleton count={4} />
      ) : auth.status === "guest" ? (
        <EmptyState
          icon={<BookmarkIcon />}
          title="로그인하면 저장한 장소를 모아 볼 수 있어요"
          description="모바일과 PC에서 같은 보관함을 열 수 있어요."
          action={
            <Button asChild size="touch">
              <Link to={paths.login} state={{ from: location.pathname }}>
                로그인하기
              </Link>
            </Button>
          }
        />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setParams(v === "links" ? { tab: "links" } : {}, { replace: true });
          }}
        >
          <TabsList variant="line" className="h-11">
            <TabsTrigger value="places" className="px-3">
              저장한 장소
            </TabsTrigger>
            <TabsTrigger value="links" className="px-3">
              SNS 링크
            </TabsTrigger>
          </TabsList>
          <TabsContent value="places" className="pt-4">
            <LibraryPlaces />
          </TabsContent>
          <TabsContent value="links" className="pt-4">
            <LibraryLinks />
          </TabsContent>
        </Tabs>
      )}
    </PageBody>
  );
}
