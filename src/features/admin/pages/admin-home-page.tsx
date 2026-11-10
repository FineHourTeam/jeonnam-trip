// 운영 관리 홈 — 종류별 공개·임시저장·비공개 수와 바로가기.
import { Link } from "react-router";
import { paths, type AdminKind } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContentCounts } from "../hooks/use-admin";
import { KIND_LABEL } from "../lib/labels";

const KINDS: AdminKind[] = ["festivals", "places", "creators"];

export default function AdminHomePage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">운영 관리</h1>
        <p className="text-muted-foreground text-sm">
          공개 중인 콘텐츠를 고치면 공개본은 그대로 두고 수정 초안으로 저장돼요. 공개본 갱신을
          눌러야 사용자에게 보여요.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {KINDS.map((k) => (
          <KindCard key={k} kind={k} />
        ))}
      </ul>
    </section>
  );
}

function KindCard({ kind }: { kind: AdminKind }) {
  const counts = useContentCounts(kind);
  return (
    <li className="border-border bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="font-semibold">{KIND_LABEL[kind]}</h2>
      {counts.isPending && <Skeleton className="h-12 w-full" />}
      {counts.isError && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">개수를 불러오지 못했어요.</span>
          <Button variant="outline" size="xs" onClick={() => void counts.refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {counts.data && (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">공개</dt>
            <dd className="font-semibold tabular-nums">{counts.data.published}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">임시저장</dt>
            <dd className="font-semibold tabular-nums">{counts.data.draft}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">비공개</dt>
            <dd className="font-semibold tabular-nums">{counts.data.hidden}</dd>
          </div>
        </dl>
      )}
      <div className="mt-auto flex gap-2">
        <Button size="sm" asChild>
          <Link to={paths.adminList(kind)}>목록 보기</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to={paths.adminNew(kind)}>새로 등록</Link>
        </Button>
      </div>
    </li>
  );
}
