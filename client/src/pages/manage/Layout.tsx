import { css } from "@emotion/css";
import AccountNav from "components/Account/AccountNav";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { Outlet, useMatch } from "react-router-dom";

export const MANAGE_ANNOUNCEMENT_MOUNT_ID = "manage-announcement-mount";

const Layout: React.FC = () => {
  const isManageIndex = useMatch("/manage");

  return (
    <div
      className={css`
        z-index: 1;
        top: calc(48px + 3rem);
        left: 0;
        padding: 0 !important;
        width: 100%;
      `}
    >
      <div id={MANAGE_ANNOUNCEMENT_MOUNT_ID} />
      {isManageIndex && <AccountNav />}
      <WidthContainer variant="big" justify="center">
        <Outlet />
      </WidthContainer>
    </div>
  );
};

export default Layout;
