// A02 콘텐츠 목록 — 검색·지역·공개 상태로 걸러 보고 편집·신규 등록으로 간다.
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { paths, type AdminKind } from "@/app/paths";
import { AddIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SIGUNS, sigunName, type ContentStatus, type SigunCode } from "@/shared/domain";
import type { AnyContent } from "../api/admin-api";
import { useContentList } from "../hooks/use-admin";
import { isAdminKind, KIND_LABEL, STATUS_LABEL } from "../lib/labels";

const PAGE = 50;

interface Row {
  id: string;
  title: string;
  siguns: SigunCode[];
  status: ContentStatus;
  updatedAt: string;
}

function toRow(c: AnyContent): Row {
  if ("title" in c)
    return { id: c.id, title: c.title, siguns: c.siguns, status: c.status, updatedAt: c.updatedAt };
  return { id: c.id, title: c.name, siguns: [c.sigun], status: c.status, updatedAt: c.updatedAt };
}

export default function AdminListPage() {
  const { kind } = useParams();
  if (!isAdminKind(kind)) {
    return <p className="text-muted-foreground">없는 관리 메뉴예요.</p>;
  }
  return <ContentList key={kind} kind={kind} />;
}

function ContentList({ kind }: { kind: AdminKind }) {
  const list = useContentList(kind);
  const [q, setQ] = useState("");
  const [sigun, setSigun] = useState("all");
  const [status, setStatus] = useState("all");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const k = q.trim();
    return (list.data ?? [])
      .map(toRow)
      .filter((r) => (k ? r.title.includes(k) : true))
      .filter((r) => (sigun === "all" ? true : r.siguns.includes(sigun as SigunCode)))
      .filter((r) => (status === "all" ? true : r.status === status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [list.data, q, sigun, status]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{KIND_LABEL[kind]} 관리</h1>
        <Button asChild>
          <Link to={paths.adminNew(kind)}>
            <AddIcon size="sm" />
            새로 등록
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(PAGE);
          }}
          placeholder="이름으로 찾기"
          aria-label="이름으로 찾기"
          className="w-full sm:w-64"
        />
        <Select
          value={sigun}
          onValueChange={(v) => {
            setSigun(v);
            setShown(PAGE);
          }}
        >
          <SelectTrigger className="w-36" aria-label="지역">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 지역</SelectItem>
            {SIGUNS.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setShown(PAGE);
          }}
        >
          <SelectTrigger className="w-32" aria-label="공개 상태">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="published">공개</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="hidden">비공개</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.isPending && <Skeleton className="h-64 w-full" />}
      {list.isError && (
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">목록을 불러오지 못했어요.</p>
          <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {list.data && (
        <>
          <p className="text-muted-foreground text-sm">{rows.length}건</p>
          {rows.length === 0 ? (
            <div className="border-border rounded-lg border border-dashed p-8 text-center text-sm">
              <p>조건에 맞는 항목이 없어요.</p>
              <p className="text-muted-foreground">검색어나 필터를 바꾸거나 새로 등록해 보세요.</p>
            </div>
          ) : (
            <ul className="border-border divide-border flex flex-col divide-y rounded-lg border">
              {rows.slice(0, shown).map((r) => (
                <li key={r.id}>
                  <Link
                    to={paths.adminEdit(kind, r.id)}
                    className="hover:bg-background-subtle flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1 font-medium break-words">{r.title}</span>
                    <span className="text-muted-foreground text-sm">
                      {r.siguns.map(sigunName).join(", ")}
                    </span>
                    <Badge variant={r.status === "published" ? "secondary" : "outline"}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {r.updatedAt.slice(0, 10)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {rows.length > shown && (
            <Button
              variant="outline"
              className="self-center"
              onClick={() => {
                setShown((n) => n + PAGE);
              }}
            >
              더 보기 ({rows.length - shown}건 남음)
            </Button>
          )}
        </>
      )}
    </section>
  );
}
