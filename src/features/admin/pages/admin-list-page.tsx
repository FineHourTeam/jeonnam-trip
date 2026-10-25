// A02 콘텐츠 목록 — 검색·지역·공개 상태로 거르고, 신규 등록·수정으로 간다.
import { useState } from "react";
import { Link, useParams } from "react-router";
import { paths, type AdminKind } from "@/app/paths";
import { AddIcon, SearchIcon } from "@/components/icons";
import { EmptyState, ErrorState, RowListSkeleton } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { sigunName, type ContentStatus } from "@/shared/domain";
import { formatDateDot } from "@/shared/lib/format";
import type { AnyContent } from "../api/admin-api";
import { useAdminList } from "../hooks/use-admin";
import { isAdminKind, KIND_LABEL, STATUS_LABEL } from "../lib/admin-content";

function titleOf(c: AnyContent) {
  return "title" in c ? c.title : c.name;
}
function siguns(c: AnyContent) {
  return "siguns" in c ? c.siguns : [c.sigun];
}

export default function AdminListPage() {
  const { kind } = useParams();
  const k: AdminKind = isAdminKind(kind) ? kind : "places";
  const q = useAdminList(k);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>("all");
  const list = (q.data ?? []).filter(
    (c) =>
      (status === "all" || c.status === status) &&
      titleOf(c).replace(/\s/g, "").includes(keyword.replace(/\s/g, "")),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{KIND_LABEL[k]}</h1>
        <Button asChild size="touch">
          <Link to={paths.adminNew(k)}>
            <AddIcon size="sm" />
            새로 등록
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="bg-background h-11 rounded-xl sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon size="sm" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="이름으로 찾기"
            aria-label="이름 검색"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
            }}
          />
        </InputGroup>
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          value={status}
          onValueChange={(v) => {
            if (v) setStatus(v);
          }}
          aria-label="공개 상태"
        >
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {q.isPending ? (
        <RowListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="조건에 맞는 콘텐츠가 없어요" />
      ) : (
        <ul className="border-border bg-background divide-border divide-y rounded-xl border">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to={paths.adminEdit(k, c.id)}
                className="hover:bg-background-subtle flex items-center gap-3 px-4 py-3"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{titleOf(c)}</span>
                  <span className="text-muted-foreground text-xs">
                    {siguns(c).map(sigunName).join("·")} · {formatDateDot(c.updatedAt)} 수정
                  </span>
                </span>
                <Badge variant={c.status === "published" ? "default" : "outline"}>
                  {STATUS_LABEL[c.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
