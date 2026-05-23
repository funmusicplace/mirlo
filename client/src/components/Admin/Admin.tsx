import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import SectionNav from "../common/SectionNav";

export const Admin: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  return (
    <div className="w-full flex flex-col">
      <SectionNav>
        <li>
          <NavLink to="dashboard">{t("dashboard")}</NavLink>
        </li>
        <li>
          <NavLink to="settings">{t("settings")}</NavLink>
        </li>
        <li>
          <NavLink to="users">{t("users")}</NavLink>
        </li>
        <li>
          <NavLink to="artists">{t("artists")}</NavLink>
        </li>
        <li>
          <NavLink to="trackgroups">{t("trackgroups")}</NavLink>
        </li>
        <li>
          <NavLink to="tracks">{t("tracks")}</NavLink>
        </li>
        <li>
          <NavLink to="transactions">{t("transactions")}</NavLink>
        </li>
        <li>
          <NavLink to="sendEmails">{t("sendEmails")}</NavLink>
        </li>
        <li>
          <NavLink to="tasks/fundraising">{t("tasks")}</NavLink>
        </li>
      </SectionNav>
      <Outlet />
    </div>
  );
};

export default Admin;
