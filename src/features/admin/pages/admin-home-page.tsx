// 운영 관리 첫 화면 — 종류별 공개·임시저장·비공개 수와 바로가기.
import { Link } from "react-router";
import { paths, type AdminKind } from "@/app/paths";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentStatus } from "@/shared/domain";
import { useAdminList } from "../hooks/use-admin";
import { KIND_LABEL, STATUS_LABEL } from "../lib/admin-content";

function KindCard({ kind }: { kind: AdminKind }) {
  const q = useAdminList(kind);
  const count = (s: ContentStatus) => (q.data ?? []).filter((c) => c.status === s).length;
  return (
    <Link
      to={paths.adminList(kind)}
      className="border-border bg-background hover:border-primary flex flex-col gap-3 rounded-xl border p-4"
    >
      <span className="font-bold">{KIND_LABEL[kind]}</span>
      {q.isPending ? (
        <Skeleton className="h-5 w-40" />
      ) : q.isError ? (
        <span className="text-destructive text-sm">
          불러오지 못했어요. 눌러서 다시 열어 보세요.
        </span>
      ) : (
        <span className="text-muted-foreground flex gap-3 text-sm">
          {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((s) => (
            <span key={s}>
              {STATUS_LABEL[s]} <strong className="text-foreground">{count(s)}</strong>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">운영 관리</h1>
      <p className="text-muted-foreground text-sm">
        항목마다 출처·확인일·확인 상태를 남겨 주세요. 공개 중인 콘텐츠를 고치면 초안으로 두었다가
        &quot;공개본 갱신&quot; 때 반영돼요.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(KIND_LABEL) as AdminKind[]).map((k) => (
          <KindCard key={k} kind={k} />
        ))}
      </div>
    </div>
  );
}
