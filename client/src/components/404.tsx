import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ButtonLink } from "./common/Button";

export default function NotFoundPage() {
  const { t } = useTranslation("translation", { keyPrefix: "notFound" });
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <img
        src="/static/images/stencil-bird.png"
        alt="A Bird Stenciled, Sad It Couldn't Find What You're Looking For"
        className="w-48 h-48 mb-6"
      />
      <p className="text-xl text-gray-700 mb-6">{t("pageNotFound")}</p>
      <ButtonLink to="/" className="px-6 py-3" size="big">
        {t("goHome")}
      </ButtonLink>
    </div>
  );
}
