import { css } from "@emotion/css";
import Tabs from "components/common/Tabs";
import WidthContainer from "components/common/WidthContainer";
import { bp } from "../../constants";
import React from "react";
import { useTranslation } from "react-i18next";

import { NavLink, Outlet } from "react-router-dom";
import UnreadCountPill from "components/common/UnreadCountPill";

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
          h1 {
            margin: 0.7rem 0;
          }
          a {
            color: var(--mi-normal-foreground-color);
          }
        `}
      >
        <div
          className={css`
            border-bottom: var(--mi-border);
            background-color: var(--mi-light-background-color);
            margin-bottom: 1rem;
          `}
        >
          <WidthContainer variant="big" justify="center">
            <Tabs
              className={css`
                padding: 0;
                text-transform: uppercase;
                @media (prefers-color-scheme: dark) {
                  color: pink;
                }
                @media screen and (max-width: ${bp.xlarge}px) {
                  padding: var(--mi-side-paddings-xsmall);
                }
                @media screen and (max-width: ${bp.medium}px) {
                  a {
                    font-size: 1rem !important;
                  }
                }
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
              <li>
                <NavLink to="/profile/purchases">{t("purchases")}</NavLink>
              </li>
              <li>
                <NavLink to="/profile/notifications">
                  {t("notifications")}
                  <UnreadCountPill />
                </NavLink>
              </li>
            </Tabs>
          </WidthContainer>
        </div>

        <Outlet />
      </div>
    </>
  );
};

export default ProfileContainer;
