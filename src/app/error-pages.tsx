import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "./paths";

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-screen-md flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold">찾을 수 없는 페이지예요</h1>
      <p className="text-muted-foreground">주소가 바뀌었거나 삭제된 페이지일 수 있어요.</p>
      <Button asChild>
        <Link to={paths.home}>탐색으로 가기</Link>
      </Button>
    </section>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  console.error(error);
  return (
    <section className="mx-auto flex max-w-screen-md flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold">문제가 발생했어요</h1>
      <p className="text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      <Button
        onClick={() => {
          window.location.reload();
        }}
      >
        다시 시도
      </Button>
    </section>
  );
}
