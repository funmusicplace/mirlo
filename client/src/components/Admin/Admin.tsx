import { css } from "@emotion/css";
import React from "react";

import Tabs from "../common/Tabs";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Admin: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  return (
    <div
      className={css`
        padding: 1rem;
        width: 100%;
      `}
    >
      <Tabs>
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
          <NavLink to="purchases">{t("purchases")}</NavLink>
        </li>
        <li>
          <NavLink to="subscriptions">{t("subscriptions")}</NavLink>
        </li>
        <li>
          <NavLink to="tips">{t("tips")}</NavLink>
        </li>
        <li>
          <NavLink to="serverTasks">{t("serverTasks")}</NavLink>
        </li>
        <li>
          <NavLink to="sendEmails">{t("sendEmails")}</NavLink>
        </li>
      </Tabs>
      <div
        className={css`
          margin: 1rem 0 0;
        `}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default Admin;
