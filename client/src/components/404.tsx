import { useTranslation } from "react-i18next";

import { ButtonLink } from "./common/Button";

export default function NotFoundPage() {
  const { t } = useTranslation("translation", { keyPrefix: "notFound" });
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-(--mi-background-color) px-4">
      <h1 className="text-6xl font-bold text-(--mi-text-color) mb-4">404</h1>
      <img
        src="/static/images/stencil-bird.png"
        alt="A Bird Stenciled, Sad It Couldn't Find What You're Looking For"
        className="w-48 h-48 mb-6"
      />
      <p className="text-xl text-(--mi-light-foreground-color) mb-6">
        {t("pageNotFound")}
      </p>
      <ButtonLink to="/" className="px-6 py-3" size="big">
        {t("goHome")}
      </ButtonLink>
    </div>
  );
}
