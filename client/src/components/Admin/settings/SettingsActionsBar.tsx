import { cx } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import useShow from "utils/useShow";

const SettingsActionsBar: React.FC<{ isSaving: boolean }> = ({ isSaving }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const headerShow = useShow();

  return (
    <div
      className={cx(
        "sticky z-[1001] mb-6 flex justify-end border-b border-(--mi-tint-x-color) bg-(--mi-background-color) py-4 transition-[top] duration-300",
        headerShow === "down" ? "top-0" : "top-(--header-cover-sticky-height)"
      )}
    >
      <Button type="submit" uppercase isLoading={isSaving} disabled={isSaving}>
        {t("save")}
      </Button>
    </div>
  );
};

export default SettingsActionsBar;
