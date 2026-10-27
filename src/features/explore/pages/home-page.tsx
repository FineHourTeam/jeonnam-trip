// S01 탐색 홈 — 첫 화면은 명소 사진 위에 제목·조건 카드를 올린다(HomeHero). 지역·날짜를 고르면 그날 열리는 축제, 그 지역 장소, 크리에이터 코스를 구역별로 보여 준다.
// 조건은 URL 검색 파라미터(?sigun=&date=)에 둔다. 인기·평점 같은 수치는 데이터가 없어 보여 주지 않는다 (화면설계 S01).
// 축제가 없으면 그 지역 장소를 둘러보도록 안내한다. 각 구역은 목록 화면(S02·S04·S08)으로 이어진다.
import { useId } from "react";
import { Link, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { CourseCard, useCourseCovers, useCreatorCourses } from "@/features/creators";
import { FestivalCard, useFestivals } from "@/features/festivals";
import { PlaceCard, usePlaces } from "@/features/places";
import { sigunName } from "@/shared/domain";
import { formatDateKo, todayKst } from "@/shared/lib/date";
import { HomeFilters } from "../components/home-filters";
import { HomeHero } from "../components/home-hero";
import { HomeSection } from "../components/home-section";
import { readHomeFilter, withQuery } from "../lib/home-filter";

/** 구역마다 보여 줄 카드 수 — 나머지는 "전체 보기"에서 */
const HOME_LIMIT = 4;

export default function HomePage() {
  const titleId = useId();
  const today = todayKst();
  const [params, setParams] = useSearchParams();
  const { sigun, date } = readHomeFilter(params, today);
  const region = sigun ? sigunName(sigun) : "전남";
  const dateLabel = date === today ? "오늘" : formatDateKo(date);

  const festivals = useFestivals({ sigun, from: date, to: date });
  // 장소 목록(S04)의 기본 조건과 같은 모양이라 캐시를 함께 쓴다
  const places = usePlaces({ sigun, categories: [], subcategories: [], q: "" });
  const courses = useCreatorCourses();

  const festivalList = festivals.data?.slice(0, HOME_LIMIT) ?? [];
  const placeList = places.data?.pages[0]?.places.slice(0, HOME_LIMIT) ?? [];
  const courseList = (courses.data ?? [])
    .filter((c) => sigun === null || c.siguns.includes(sigun))
    .slice(0, HOME_LIMIT);
  const coverOf = useCourseCovers(courseList);

  const update = (next: { sigun?: string | null; date?: string | null }) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );
  };

  const placesTo = withQuery(paths.places, { sigun });

  return (
    <div className="flex flex-col">
      <Seo
        title="전남 여행지 둘러보기"
        description="날짜와 지역을 고르면 그날 열리는 전남 축제와 그 지역 장소·크리에이터 코스를 함께 볼 수 있어요."
      />
      <HomeHero labelledBy={titleId}>
        <div className="flex flex-col gap-2">
          <h1 id={titleId} className="text-3xl font-bold text-balance md:text-5xl">
            전남 여행지 둘러보기
          </h1>
          <p className="text-base text-pretty md:text-lg">
            지역과 날짜를 고르면 그날 열리는 축제와 그 지역 장소·코스를 모아 보여 줘요.
          </p>
        </div>
        <div className="bg-card text-card-foreground rounded-xl p-4 shadow-lg">
          <HomeFilters
            values={{ sigun, date }}
            today={today}
            onChange={update}
            tripNewTo={withQuery(paths.tripNew, { date })}
          />
        </div>
      </HomeHero>

      <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 py-8">
        <HomeSection
          title={`${dateLabel} 열리는 축제`}
          moreTo={withQuery(paths.festivals, { sigun, date })}
          isPending={festivals.isPending}
          isError={festivals.isError}
          errorTitle="축제를 불러오지 못했어요"
          onRetry={() => void festivals.refetch()}
          empty={
            festivalList.length === 0 && (
              <EmptyNotice
                title={`${region}에서 ${dateLabel} 열리는 축제가 없어요`}
                hint="다른 날짜를 고르거나 이 지역 장소를 둘러보세요."
                action={{ to: placesTo, label: "장소 둘러보기" }}
              />
            )
          }
        >
          {festivalList.map((f) => (
            <li key={f.id}>
              <FestivalCard festival={f} today={today} />
            </li>
          ))}
        </HomeSection>

        <HomeSection
          title={`${region} 장소`}
          moreTo={placesTo}
          isPending={places.isPending}
          isError={places.isError}
          errorTitle="장소를 불러오지 못했어요"
          onRetry={() => void places.refetch()}
          empty={
            placeList.length === 0 && (
              <EmptyNotice
                title={sigun ? "이 지역에 공개된 장소가 아직 없어요" : "아직 공개된 장소가 없어요"}
                hint={sigun ? "다른 지역을 고르거나 전체 장소를 둘러보세요." : null}
                action={sigun ? { to: paths.places, label: "전체 장소 보기" } : null}
              />
            )
          }
        >
          {placeList.map((p) => (
            <li key={p.id}>
              <PlaceCard place={p} />
            </li>
          ))}
        </HomeSection>

        <HomeSection
          title={`${region} 크리에이터 코스`}
          moreTo={withQuery(paths.creators, { sigun })}
          isPending={courses.isPending}
          isError={courses.isError}
          errorTitle="코스를 불러오지 못했어요"
          onRetry={() => void courses.refetch()}
          empty={
            courseList.length === 0 && (
              <EmptyNotice
                title={sigun ? "이 지역을 지나는 코스가 아직 없어요" : "공개된 코스가 아직 없어요"}
                hint={sigun ? "다른 지역을 고르거나 전체 코스를 둘러보세요." : null}
                action={sigun ? { to: paths.creators, label: "전체 코스 보기" } : null}
              />
            )
          }
        >
          {courseList.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} cover={coverOf(c)} />
            </li>
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
