import { css } from "@emotion/css";
import SectionNav from "components/common/SectionNav";
import UnreadCountPill from "components/common/UnreadCountPill";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  return (
    <>
      <div
        className={css`
          overflow-x: hidden;
          padding: 0 !important;
          width: 100%;
          h1 {
            margin: 0.7rem 0;
          }
        `}
      >
        <div className="mb-4">
          <SectionNav>
            <li>
              <NavLink end to="/profile/followed">
                {t("followedArtists")}
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
          </SectionNav>
        </div>

        <WidthContainer variant="big" justify="center">
          <Outlet />
        </WidthContainer>
      </div>
    </>
  );
};

export default Layout;
