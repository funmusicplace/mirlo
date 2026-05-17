import { css } from "@emotion/css";
import CanCreateArtists from "components/CanCreateArtists";
import Tabs from "components/common/Tabs";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

import { bp } from "../../constants";

const AccountNav: React.FC = () => {
  const { t } = useTranslation("translation");
  const { user } = useAuthContext();
  return (
    <Tabs
      className={css`
        padding: 0;
        text-transform: uppercase;
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
      {user?.isLabelAccount ? (
        <li>
          <NavLink end to="/account/label">
            {t("profile.label")}
          </NavLink>
        </li>
      ) : (
        <CanCreateArtists>
          <li>
            <NavLink end to="/manage">
              {t("profile.manageArtists")}
            </NavLink>
          </li>
        </CanCreateArtists>
      )}
      <li>
        <NavLink end to="/sales">
          {t("sales.sales")}
        </NavLink>
      </li>
      <li>
        <NavLink end to="/fulfillment">
          {t("fulfillment.fulfillment")}
        </NavLink>
      </li>
      <li>
        <NavLink end to="/account">
          {t("profile.account")}
        </NavLink>
      </li>
    </Tabs>
  );
};

export default AccountNav;
