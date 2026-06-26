import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import SectionNav from "components/common/SectionNav";
import WidthContainer from "components/common/WidthContainer";

export const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  return (
    <div className="w-full flex flex-col">
      <div className="mb-4">
        <SectionNav uppercase={false} transparent>
          <li>
            <NavLink to="purchases">{t("purchases")}</NavLink>
          </li>
          <li>
            <NavLink to="subscriptions">{t("subscriptions")}</NavLink>
          </li>
          <li>
            <NavLink to="tips">{t("tips")}</NavLink>
          </li>
          <li>
            <NavLink to="fundraiser-pledges">{t("fundraiserPledges")}</NavLink>
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
