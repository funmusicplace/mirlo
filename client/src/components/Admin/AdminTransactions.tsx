import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import SectionNav from "../common/SectionNav";

export const Admin: React.FC = () => {
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
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
};

export default Admin;
