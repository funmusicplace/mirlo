import SectionNav from "components/common/SectionNav";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const Layout: React.FC = () => {
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
          <NavLink to="content">{t("content")}</NavLink>
        </li>
        <li>
          <NavLink to="transactions">{t("transactions")}</NavLink>
        </li>
        <li>
          <NavLink to="send-emails">{t("sendEmails")}</NavLink>
        </li>
        <li>
          <NavLink to="tasks/fundraising">{t("tasks")}</NavLink>
        </li>
        <li>
          <NavLink to="clients">{t("clients")}</NavLink>
        </li>
      </SectionNav>
      <Outlet />
    </div>
  );
};

export default Layout;
