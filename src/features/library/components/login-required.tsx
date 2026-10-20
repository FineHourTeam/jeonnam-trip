// 비회원 안내 — 로그인 후 지금 보던 화면(쿼리 포함)으로 돌아오게 from을 넘긴다.
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";

interface LoginRequiredProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function LoginRequired({ title, description, children }: LoginRequiredProps) {
  const location = useLocation();
  return (
    <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
      <p className="font-medium text-balance">{title}</p>
      <p className="text-muted-foreground text-sm text-pretty">{description}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to={paths.login} state={{ from: location.pathname + location.search }}>
            로그인하기
          </Link>
        </Button>
        {children}
      </div>
    </div>
  );
}
