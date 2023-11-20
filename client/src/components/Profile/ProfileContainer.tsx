import { css } from "@emotion/css";
import Tabs from "components/common/Tabs";
import React from "react";
import { useTranslation } from "react-i18next";

import { NavLink, Outlet } from "react-router-dom";

const ProfileContainer: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  return (
    <>
      <div
        className={css`
          z-index: 1;
          top: calc(48px + 3rem);
          left: 0;
          overflow-x: hidden;
          padding: 0 !important;
          width: 100%;
          padding: var(--mi-side-paddings-xsmall);
        `}
      >
        <Tabs
          className={css`
            padding: var(--mi-side-paddings-xsmall);
            margin-right: 0 !important;
          `}
        >
          <li>
            <NavLink end to="/profile">
              {t("profile")}
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile/collection">{t("collection")}</NavLink>
          </li>
          <li>
            <NavLink to="/profile/wishlist">{t("wishlist")}</NavLink>
          </li>
        </Tabs>

        <Outlet />
      </div>
    </>
  );
};

export default ProfileContainer;
