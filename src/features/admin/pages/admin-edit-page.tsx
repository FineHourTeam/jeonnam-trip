// A03 콘텐츠 편집 — /admin/:kind/new(신규) · /admin/:kind/:contentId(수정).
// 공개 중인 콘텐츠에 수정 초안이 있으면 초안을 불러와 이어서 고친다.
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths, type AdminKind } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreatorCourse, Festival, Place } from "@/shared/domain";
import { kstDateTimeOf, todayKst } from "@/shared/lib/date";
import type { AnyContent } from "../api/admin-api";
import { CourseForm } from "../components/course-form";
import { FestivalForm } from "../components/festival-form";
import { PlaceForm } from "../components/place-form";
import {
  useContentAction,
  useContentList,
  useEditable,
  useNewContentId,
  type ContentAction,
} from "../hooks/use-admin";
import {
  courseToValues,
  emptyCourseValues,
  emptyFestivalValues,
  emptyPlaceValues,
  festivalToValues,
  placeToValues,
} from "../lib/content-form";
import { isAdminKind, KIND_LABEL, STATUS_LABEL } from "../lib/labels";

const DONE: Record<ContentAction, string> = {
  draft: "초안을 저장했어요.",
  publish: "공개했어요. 사용자 화면에 바로 반영돼요.",
  hide: "비공개로 바꿨어요.",
  discard: "수정 초안을 버렸어요.",
};

export default function AdminEditPage() {
  const { kind, contentId } = useParams();
  if (!isAdminKind(kind)) return <p className="text-muted-foreground">없는 관리 메뉴예요.</p>;
  return <Editor key={`${kind}/${contentId ?? "new"}`} kind={kind} contentId={contentId ?? null} />;
}

function Editor({ kind, contentId }: { kind: AdminKind; contentId: string | null }) {
  const navigate = useNavigate();
  const newId = useNewContentId(kind);
  const id = contentId ?? newId;
  const editable = useEditable(kind, contentId);
  const action = useContentAction(kind);
  // 장소 목록은 코스 편집에서만 쓴다 (장소 1천여 건을 다른 편집 화면에서 받지 않게)
  const places = useContentList("places", kind === "creators");

  const onAction = (a: ContentAction, content: AnyContent) => {
    action.mutate(
      { action: a, content },
      {
        onSuccess: (result) => {
          toast.success(
            result === "draft-doc" ? "공개본은 그대로 두고 수정 초안을 저장했어요." : DONE[a],
          );
          if (!contentId) void navigate(paths.adminEdit(kind, id), { replace: true });
        },
        onError: () => {
          toast.error("저장하지 못했어요. 권한과 네트워크를 확인하고 다시 시도해주세요.");
        },
      },
    );
  };

  if (contentId && editable.isPending) return <Skeleton className="h-96 w-full" />;
  if (contentId && editable.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>콘텐츠를 불러오지 못했어요</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          네트워크 연결을 확인해주세요.
          <Button variant="outline" size="sm" onClick={() => void editable.refetch()}>
            다시 시도
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const saved = editable.data?.saved ?? null;
  const draft = editable.data?.draft ?? null;
  if (contentId && !saved) {
    return (
      <p className="text-muted-foreground">
        이 콘텐츠를 찾을 수 없어요. 삭제됐거나 주소가 잘못됐어요.
      </p>
    );
  }
  const current = draft?.data ?? saved;
  const common = {
    contentId: id,
    status: saved?.status ?? null,
    hasDraft: draft !== null,
    pending: action.isPending ? action.variables.action : null,
    onAction,
  };
  // 저장 후 서버 값이 바뀌면 폼을 새 기준값으로 다시 그린다
  const formKey = `${id}:${editable.dataUpdatedAt.toString()}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={paths.adminList(kind)} aria-label="목록으로">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {KIND_LABEL[kind]} {contentId ? "수정" : "등록"}
        </h1>
        {saved && <Badge variant="outline">{STATUS_LABEL[saved.status]}</Badge>}
        {draft && <Badge variant="secondary">수정 초안 {kstDateTimeOf(draft.savedAt)}</Badge>}
      </div>
      {draft && (
        <p className="text-muted-foreground text-sm">
          {saved?.status === "published"
            ? "공개본은 그대로 있고, 아래는 저장해 둔 수정 초안이에요. 공개본 갱신을 눌러야 사용자에게 보여요."
            : "아래는 비공개로 바꾸기 전에 저장해 둔 수정 초안이에요. 초안 저장이나 공개하기를 누르면 본문에 반영돼요."}
        </p>
      )}

      {kind === "festivals" && (
        <FestivalForm
          key={formKey}
          {...common}
          base={(saved as Festival | null) ?? undefined}
          initial={
            current ? festivalToValues(current as Festival) : emptyFestivalValues(todayKst())
          }
        />
      )}
      {kind === "places" && (
        <PlaceForm
          key={formKey}
          {...common}
          base={(saved as Place | null) ?? undefined}
          initial={current ? placeToValues(current as Place) : emptyPlaceValues()}
        />
      )}
      {kind === "creators" &&
        (places.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : places.isError ? (
          <Alert variant="destructive">
            <AlertTitle>장소 목록을 불러오지 못했어요</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              코스에 넣을 장소를 확인하려면 장소 목록이 필요해요.
              <Button variant="outline" size="sm" onClick={() => void places.refetch()}>
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <CourseForm
            key={formKey}
            {...common}
            places={places.data}
            base={(saved as CreatorCourse | null) ?? undefined}
            initial={current ? courseToValues(current as CreatorCourse) : emptyCourseValues()}
          />
        ))}
    </section>
  );
}
