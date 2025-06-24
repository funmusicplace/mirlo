import React from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development" && error instanceof Error) {
      console.error("Error:", error.message);
      if (error.message.includes("dynamically imported module")) {
        window.location.reload();
      }
    }
  }, [error]);

  const { t } = useTranslation("translation", { keyPrefix: "errorPage" });

  return (
    <div>
      <h1>{t("reactError")}</h1>
      <p>{t("unexpectedError")}</p>
      <p>
        <i>{(error as any).statusText || (error as any).message}</i>
      </p>
    </div>
  );
}
