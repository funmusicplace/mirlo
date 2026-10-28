import Skeleton from "components/common/Skeleton";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";

const DashboardSkeleton: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  return (
    <WidthContainer variant="big" justify="center" className="grow p-4">
      <div role="status" aria-label={t("loading")}>
        <h2 className="text-2xl font-bold mb-6">{t("title")}</h2>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        <Skeleton className="h-9 w-64 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>

        <Skeleton className="h-9 w-48 mb-4" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </WidthContainer>
  );
};

export default DashboardSkeleton;
