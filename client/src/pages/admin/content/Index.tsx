import SectionNav from "components/common/SectionNav";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

export const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  return (
    <div className="w-full flex flex-col">
      <div className="mb-4">
        <SectionNav uppercase={false} transparent>
          <li>
            <NavLink to="track-groups">{t("trackgroups")}</NavLink>
          </li>
          <li>
            <NavLink to="artists">{t("artists")}</NavLink>
          </li>
          <li>
            <NavLink to="users">{t("users")}</NavLink>
          </li>
          <li>
            <NavLink to="tracks">{t("tracks")}</NavLink>
          </li>
        </SectionNav>
      </div>
      <WidthContainer variant="big" justify="center" className="p-4">
        <Outlet />
      </WidthContainer>
    </div>
  );
};

export default Index;
