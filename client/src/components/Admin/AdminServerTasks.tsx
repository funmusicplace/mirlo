import { css } from "@emotion/css";
import React from "react";

import Tabs from "../common/Tabs";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const AdminServerTasks: React.FC = () => {
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
          <NavLink to="fundraising">{t("fundraising")}</NavLink>
        </li>
        <li>
          <NavLink to="serverTasks">{t("serverTasks")}</NavLink>
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

export default AdminServerTasks;
