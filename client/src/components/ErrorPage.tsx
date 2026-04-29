import React from "react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";

import NotFoundPage from "./404";
import { ButtonLink } from "./common/Button";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);
  const snackbar = useSnackbar();

  const isNotFoundError =
    (isRouteErrorResponse(error) && error.status === 404) ||
    (error as any)?.status === 404 ||
    (error as any)?.statusText === "Not Found";

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development" && error instanceof Error) {
      console.error("Error:", error.message);
      if (error.message.includes("dynamically imported module")) {
        const alreadyReloaded = sessionStorage.getItem("chunkReload") === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem("chunkReload", "1");
          snackbar("Hey, there's a new version of Mirlo! Reloading...");
          navigator.serviceWorker?.getRegistration().then((reg) => {
            reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
          });
          window.location.reload();
        } else {
          sessionStorage.removeItem("chunkReload");
        }
      }
    }
  }, [error]);

  const { t } = useTranslation("translation", { keyPrefix: "errorPage" });

  if (isNotFoundError) {
    return <NotFoundPage />;
  }

  const errorMessage =
    (error as any)?.statusText ||
    (error as any)?.message ||
    t("unexpectedError");

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <img
        src="/static/images/stencil-bird.png"
        alt="Mirlo bird"
        className="mb-6 h-28 w-28"
      />
      <h1 className="mb-3 text-3xl font-semibold">{t("reactError")}</h1>
      <p className="mb-6 text-base">{t("unexpectedError")}</p>
      <p className="mb-8 max-w-xl text-sm opacity-80">
        <i>{errorMessage}</i>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink to="/" size="big">
          Go back home
        </ButtonLink>
        <button
          type="button"
          className="rounded border border-current px-4 py-2 text-sm"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
