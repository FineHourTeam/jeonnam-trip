// S01 탐색 홈 — 첫 화면은 명소 사진 위에 브랜드 제목과 "계획짜기" 버튼을 올린다(HomeHero). 아래로 전남 전체의 축제, 장소, 크리에이터 코스를 구역별로 보여 준다.
// 축제는 오늘 이후에도 열리는 것만(이미 끝난 축제 제외) 보여 주고, 오늘 열리는 축제를 먼저, 나머지는 시작일 순으로 둔다.
// 지역·날짜 고르기는 각 목록 화면에서 한다. 인기·평점 같은 수치는 데이터가 없어 보여 주지 않는다 (화면설계 S01).
// 축제가 없으면 그 지역 장소를 둘러보도록 안내한다. 각 구역은 목록 화면(S02·S04·S08)으로 이어진다.
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useCourseCovers, useCreatorCourses } from "@/features/creators";
import { useFestivals } from "@/features/festivals";
import { usePlaces } from "@/features/places";
import { todayKst } from "@/shared/lib/date";
import { CourseHomeCard, FestivalHomeCard, PlaceHomeCard } from "../components/home-card";
import { HomeHero } from "../components/home-hero";
import { HomeSection, HomeSectionItem } from "../components/home-section";

/** 구역마다 보여 줄 카드 수 — 나머지는 "전체 보기"에서 */
const HOME_LIMIT = 4;

export default function HomePage() {
  const { t } = useTranslation("explore");
  const titleId = useId();
  const today = todayKst();
  const region = t("jeonnam");

  const festivals = useFestivals({ sigun: null, from: today });
  // 장소 목록(S04)의 기본 조건과 같은 모양이라 캐시를 함께 쓴다
  const places = usePlaces({ sigun: null, categories: [], subcategories: [], q: "" });
  const courses = useCreatorCourses();

  const festivalList = [...(festivals.data ?? [])]
    .sort(
      (a, b) =>
        Number(b.startDate <= today) - Number(a.startDate <= today) ||
        a.startDate.localeCompare(b.startDate),
    )
    .slice(0, HOME_LIMIT);
  const placeList = places.data?.pages[0]?.places.slice(0, HOME_LIMIT) ?? [];
  const courseList = (courses.data ?? []).slice(0, HOME_LIMIT);
  const coverOf = useCourseCovers(courseList);

  return (
    <div className="-mt-14 flex flex-col">
      <Seo title={t("seoTitle")} description={t("seoDescription")} />
      <HomeHero labelledBy={titleId} />

      <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 py-8">
        <HomeSection
          title={t("festivals.title", { region })}
          moreTo={paths.festivals}
          isPending={festivals.isPending}
          isError={festivals.isError}
          errorTitle={t("festivals.error")}
          onRetry={() => void festivals.refetch()}
          empty={
            festivalList.length === 0 && (
              <EmptyNotice
                title={t("festivals.empty", { region })}
                hint={t("festivals.emptyHint")}
                action={{ to: paths.places, label: t("festivals.browsePlaces") }}
              />
            )
          }
        >
          {festivalList.map((f) => (
            <HomeSectionItem key={f.id}>
              <FestivalHomeCard festival={f} today={today} />
            </HomeSectionItem>
          ))}
        </HomeSection>

        <HomeSection
          title={t("places.title", { region })}
          moreTo={paths.places}
          isPending={places.isPending}
          isError={places.isError}
          errorTitle={t("places.error")}
          onRetry={() => void places.refetch()}
          empty={
            placeList.length === 0 && (
              <EmptyNotice title={t("places.empty")} hint={null} action={null} />
            )
          }
        >
          {placeList.map((p) => (
            <HomeSectionItem key={p.id}>
              <PlaceHomeCard place={p} />
            </HomeSectionItem>
          ))}
        </HomeSection>

        <HomeSection
          title={t("courses.title", { region })}
          moreTo={paths.creators}
          isPending={courses.isPending}
          isError={courses.isError}
          errorTitle={t("courses.error")}
          onRetry={() => void courses.refetch()}
          empty={
            courseList.length === 0 && (
              <EmptyNotice title={t("courses.empty")} hint={null} action={null} />
            )
          }
        >
          {courseList.map((c) => (
            <HomeSectionItem key={c.id}>
              <CourseHomeCard course={c} cover={coverOf(c)} />
            </HomeSectionItem>
          ))}
        </HomeSection>
      </div>
    </div>
  );
}

interface EmptyNoticeProps {
  title: string;
  hint: string | null;
  action: { to: string; label: string } | null;
}

function EmptyNotice({ title, hint, action }: EmptyNoticeProps) {
  return (
    <>
      <p className="font-medium text-balance">{title}</p>
      {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      {action && (
        <Button variant="outline" asChild>
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </>
  );
}
