import CanCreateArtists from "components/CanCreateArtists";
import SectionNav from "components/common/SectionNav";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const AccountNav: React.FC = () => {
  const { t } = useTranslation("translation");
  const { user } = useAuthContext();
  return (
    <SectionNav>
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
    </SectionNav>
  );
};

export default AccountNav;
