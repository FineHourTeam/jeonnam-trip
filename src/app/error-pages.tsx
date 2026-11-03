import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "./paths";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-screen-md flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold">{t("error.notFound")}</h1>
      <p className="text-muted-foreground">{t("page.notFoundBody")}</p>
      <Button asChild>
        <Link to={paths.home}>{t("page.goExplore")}</Link>
      </Button>
    </section>
  );
}

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  console.error(error);
  return (
    <section className="mx-auto flex max-w-screen-md flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold">{t("page.errorTitle")}</h1>
      <p className="text-muted-foreground">{t("page.errorBody")}</p>
      <Button
        onClick={() => {
          window.location.reload();
        }}
      >
        {t("retry")}
      </Button>
    </section>
  );
}
