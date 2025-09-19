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
          <NavLink to="purchases">{t("purchases")}</NavLink>
        </li>
        <li>
          <NavLink to="subscriptions">{t("subscriptions")}</NavLink>
        </li>
        <li>
          <NavLink to="tips">{t("tips")}</NavLink>
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
