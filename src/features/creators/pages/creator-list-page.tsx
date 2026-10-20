// S08 크리에이터 코스 목록 — 공개 코스를 한 번 받아 지역·일수·태그로 거른다. 조건은 URL 검색 파라미터에 둔다.
import { useSearchParams } from "react-router";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_TRIP_DAYS, isSigunCode, type CreatorCourse } from "@/shared/domain";
import { CourseCard } from "../components/course-card";
import { CourseFilters } from "../components/course-filters";
import { useCourseCovers, useCreatorCourses } from "../hooks/use-creator-courses";
import { courseTags, filterCourses, type CourseFilter } from "../lib/course";

function readFilter(params: URLSearchParams): CourseFilter {
  const sigun = params.get("sigun") ?? "";
  const days = Number(params.get("days"));
  const tag = params.get("tag") ?? "";
  return {
    sigun: isSigunCode(sigun) ? sigun : null,
    days: Number.isInteger(days) && days >= 1 && days <= MAX_TRIP_DAYS ? days : null,
    tag: tag === "" ? null : tag,
  };
}

export default function CreatorListPage() {
  const [params, setParams] = useSearchParams();
  const filter = readFilter(params);
  const courses = useCreatorCourses();
  const all = courses.data ?? [];
  const results = filterCourses(all, filter);
  // 조건을 바꿀 때마다 다시 읽지 않도록 걸러지기 전 전체 코스의 장소를 한 번에 읽는다
  const coverOf = useCourseCovers(all);

  const update = (next: Partial<CourseFilter>) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) {
          if (v === null) p.delete(k);
          else p.set(k, String(v));
        }
        return p;
      },
      { replace: true },
    );
  };
  const reset = () => {
    update({ sigun: null, days: null, tag: null });
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <Seo
        title="크리에이터 코스"
        description="여행 편집자가 구성한 전남 여행 코스를 지역·일수·테마로 찾아보고 내 일정으로 가져오세요."
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">크리에이터 코스</h1>
        <p className="text-muted-foreground text-sm">
          다른 사람이 구성한 코스를 내 여행 날짜에 맞춰 가져와 고칠 수 있어요.
        </p>
      </div>

      <CourseFilters values={filter} tags={courseTags(all)} onChange={update} onReset={reset} />

      <p className="text-sm font-medium" aria-live="polite">
        {courses.isSuccess && `코스 ${String(results.length)}개`}
      </p>

      <ResultList
        isPending={courses.isPending}
        isError={courses.isError}
        onRetry={() => void courses.refetch()}
        results={results}
        coverOf={coverOf}
        filtered={filter.sigun !== null || filter.days !== null || filter.tag !== null}
        onReset={reset}
      />
    </section>
  );
}

interface ResultListProps {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  results: CreatorCourse[];
  coverOf: (course: CreatorCourse) => string | null | undefined;
  filtered: boolean;
  onReset: () => void;
}

function ResultList({
  isPending,
  isError,
  onRetry,
  results,
  coverOf,
  filtered,
  onReset,
}: ResultListProps) {
  if (isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <AlertTitle>코스 목록을 불러오지 못했어요</AlertTitle>
          <AlertDescription>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</AlertDescription>
        </Alert>
        <Button onClick={onRetry}>다시 시도</Button>
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
        <p className="font-medium">
          {filtered ? "조건에 맞는 코스가 없어요" : "공개된 코스가 아직 없어요"}
        </p>
        {filtered && (
          <>
            <p className="text-muted-foreground text-sm">지역이나 일수를 바꿔 다시 찾아보세요.</p>
            <Button variant="outline" onClick={onReset}>
              조건 초기화
            </Button>
          </>
        )}
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {results.map((c) => (
        <li key={c.id}>
          <CourseCard course={c} cover={coverOf(c)} />
        </li>
      ))}
    </ul>
  );
}
