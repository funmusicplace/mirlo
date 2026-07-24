import { useTranslation } from "react-i18next";
import { ButtonLink } from "./common/Button";

export default function NotFoundPage() {
  const { t } = useTranslation("translation", { keyPrefix: "notFound" });
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-(--mi-background-color) px-4 text-(--mi-text-color)">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <img
        src="/static/images/stencil-bird.png"
        alt="A Bird Stenciled, Sad It Couldn't Find What You're Looking For"
        className="w-48 h-48 mb-6 [[data-mi-high-contrast=dark]_&]:invert"
      />
      <p className="text-xl text-(--mi-secondary-text-color) mb-6">{t("pageNotFound")}</p>
      <ButtonLink to="/" className="px-6 py-3" size="big">
        {t("goHome")}
      </ButtonLink>
    </div>
  );
}
