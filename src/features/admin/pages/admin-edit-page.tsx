// A03 콘텐츠 편집 — 초안 저장 / 공개(공개본 갱신) / 비공개, 공개 전 검수 목록. 공개 중이면 초안으로 두고 공개본을 유지한다.
// 공개본을 바꾸면 그 콘텐츠를 담은 사용자 코스는 다시 열 때 변경 안내를 받는다. 사용자 일정은 자동으로 바꾸지 않는다 (ADM-03, FES-06).
import { useForm, type UseFormReturn } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths, type AdminKind } from "@/app/paths";
import { Notice } from "@/components/detail-parts";
import { ErrorState, RowListSkeleton } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import type { ContentStatus } from "@/shared/domain";
import type { ContentInput } from "../api/admin-api";
import { CourseFields } from "../components/course-fields";
import { PhotosEditor } from "../components/field-editors";
import { FestivalFields } from "../components/festival-fields";
import { Section } from "../components/form-parts";
import { PlaceFields } from "../components/place-fields";
import { useAdminContent, useAdminMutations } from "../hooks/use-admin";
import {
  emptyInput,
  isAdminKind,
  KIND_LABEL,
  reviewForPublish,
  STATUS_LABEL,
  toInput,
} from "../lib/admin-content";

function userHref(kind: AdminKind, id: string) {
  return kind === "places"
    ? paths.placeDetail(id)
    : kind === "festivals"
      ? paths.festivalDetail(id)
      : paths.creatorDetail(id);
}

function Editor({
  kind,
  id,
  status,
  hasDraft,
  initial,
}: {
  kind: AdminKind;
  id: string | null;
  status: ContentStatus | null;
  hasDraft: boolean;
  initial: ContentInput<AdminKind>;
}) {
  const navigate = useNavigate();
  const m = useAdminMutations(kind);
  const form = useForm<ContentInput<AdminKind>>({ values: initial });
  const values = form.watch();
  const review = reviewForPublish(kind, values);
  const busy =
    m.create.isPending || m.saveDraft.isPending || m.publish.isPending || m.hide.isPending;
  const fail = (e: unknown) => toast.error(`처리하지 못했어요. ${errorMessage(e)}`);

  const saveDraft = form.handleSubmit((v) => {
    if (!id) {
      m.create.mutate(v, {
        onSuccess: (newId) => {
          toast.success("임시저장했어요. 이제 사진을 올릴 수 있어요.");
          void navigate(paths.adminEdit(kind, newId), { replace: true });
        },
        onError: fail,
      });
      return;
    }
    m.saveDraft.mutate(
      { id, status: status ?? "draft", input: v },
      {
        onSuccess: () =>
          toast.success(
            status === "published" ? "초안을 저장했어요. 공개본은 그대로예요." : "임시저장했어요.",
          ),
        onError: fail,
      },
    );
  });
  const publish = form.handleSubmit((v) => {
    if (!id || review.errors.length > 0) return;
    m.publish.mutate(
      { id, input: v },
      {
        onSuccess: () =>
          toast.success(status === "published" ? "공개본을 갱신했어요." : "공개했어요."),
        onError: fail,
      },
    );
  });

  const photos =
    "photos" in values ? (
      <Section title="사진">
        <PhotosEditor
          value={values.photos}
          onChange={(p) => {
            form.setValue("photos", p, { shouldDirty: true });
          }}
          onUpload={id ? (file) => m.upload.mutateAsync({ id, file }) : null}
        />
      </Section>
    ) : null;

  return (
    <form
      className="flex flex-col gap-4 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        void saveDraft();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">
          {id ? `${KIND_LABEL[kind]} 편집` : `새 ${KIND_LABEL[kind]}`}
        </h1>
        {status ? (
          <Badge variant={status === "published" ? "default" : "outline"}>
            {STATUS_LABEL[status]}
          </Badge>
        ) : null}
        {hasDraft ? <Badge variant="secondary">공개 대기 초안 있음</Badge> : null}
        {id && status === "published" ? (
          <Link
            to={userHref(kind, id)}
            className="text-primary ml-auto text-sm underline-offset-2 hover:underline"
            target="_blank"
          >
            사용자 화면에서 보기
          </Link>
        ) : null}
      </div>
      {status === "published" ? (
        <Notice tone="info">
          공개 중이라 저장하면 초안으로 따로 두고 공개본은 유지해요. &quot;공개본 갱신&quot;을
          눌러야 사용자에게 보여요. 갱신하면 이 콘텐츠를 담은 사용자 코스는 다시 열 때 변경 안내를
          받아요.
        </Notice>
      ) : null}

      {kind === "places" ? (
        <PlaceFields form={form as unknown as UseFormReturn<ContentInput<"places">>} />
      ) : null}
      {kind === "festivals" ? (
        <FestivalFields form={form as unknown as UseFormReturn<ContentInput<"festivals">>} />
      ) : null}
      {kind === "creators" ? (
        <CourseFields form={form as unknown as UseFormReturn<ContentInput<"creators">>} />
      ) : null}
      {photos}

      <Section title="공개 전 검수">
        {review.errors.length === 0 && review.warnings.length === 0 ? (
          <p className="text-success text-sm">
            필수 항목을 모두 채웠어요. 입력 형식 검사는 사실 확인을 대신하지 않아요.
          </p>
        ) : null}
        {review.errors.map((e) => (
          <p key={e} className="text-destructive text-sm">
            • {e}
          </p>
        ))}
        {review.warnings.map((w) => (
          <p key={w} className="text-warning-soft-foreground text-sm">
            • {w}
          </p>
        ))}
      </Section>

      <div className="border-border bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl flex-wrap gap-2 px-4 py-3">
          <Button type="submit" variant="outline" size="touch" disabled={busy}>
            {id ? (status === "published" ? "초안 저장" : "임시저장") : "임시저장하고 시작"}
          </Button>
          {id ? (
            <Button
              type="button"
              size="touch"
              disabled={busy || review.errors.length > 0}
              onClick={() => void publish()}
            >
              {status === "published" ? "공개본 갱신" : "공개하기"}
            </Button>
          ) : null}
          {id && status === "published" ? (
            <Button
              type="button"
              variant="ghost"
              size="touch"
              disabled={busy}
              onClick={() => {
                m.hide.mutate(id, {
                  onSuccess: () => toast.success("비공개로 돌렸어요. 사용자 화면에서 사라져요."),
                  onError: fail,
                });
              }}
            >
              비공개로
            </Button>
          ) : null}
          {id && hasDraft ? (
            <Button
              type="button"
              variant="ghost"
              size="touch"
              disabled={busy}
              onClick={() => {
                m.discardDraft.mutate(id, {
                  onSuccess: () => toast.success("초안을 버리고 공개본으로 돌아왔어요."),
                  onError: fail,
                });
              }}
            >
              초안 버리기
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export default function AdminEditPage() {
  const { kind, contentId } = useParams();
  const k: AdminKind = isAdminKind(kind) ? kind : "places";
  const q = useAdminContent(k, contentId);
  if (!contentId)
    return <Editor kind={k} id={null} status={null} hasDraft={false} initial={emptyInput(k)} />;
  if (q.isPending) return <RowListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const { content, draft } = q.data;
  return (
    <Editor
      key={`${content.id}-${content.updatedAt}-${draft?.updatedAt ?? ""}`}
      kind={k}
      id={content.id}
      status={content.status}
      hasDraft={draft !== null}
      initial={toInput(draft ?? content)}
    />
  );
}
