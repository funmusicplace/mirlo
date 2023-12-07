import { css } from "@emotion/css";
import React from "react";

import Tabs from "../common/Tabs";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CallServerTasks from "./CallServerTasks";

export const Admin: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  return (
    <div
      className={css`
        padding: 1rem;
        width: 100%;
      `}
    >
      <CallServerTasks />
      <Tabs>
        <li>
          <NavLink to="users">{t("users")}</NavLink>
        </li>
        <li>
          <NavLink to="trackgroups">{t("trackgroups")}</NavLink>
        </li>
        <li>
          <NavLink to="tracks">{t("tracks")}</NavLink>
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
