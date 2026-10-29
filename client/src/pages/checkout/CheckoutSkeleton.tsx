import Skeleton from "components/common/Skeleton";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";

const CheckoutSkeleton: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "hostedCheckout" });

  return (
    <WidthWrapper
      variant="medium"
      className="mt-8 mb-12 py-8 px-6 border border-(--mi-tint-color) rounded-[var(--mi-border-radius-x)]"
      role="status"
      aria-label={t("loading")}
    >
      <h1 className="text-xl mb-1">{t("title")}</h1>
      <Skeleton className="h-5 w-56 mb-4" />
      <Skeleton className="h-4 w-16 mb-2" />
      <Skeleton className="h-11 mb-4" />
      <Skeleton className="h-44 mb-4" />
      <Skeleton className="h-11" />
    </WidthWrapper>
  );
};

export default CheckoutSkeleton;
