import { css } from "@emotion/css";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { Outlet } from "react-router-dom";

export const MANAGE_ANNOUNCEMENT_MOUNT_ID = "manage-announcement-mount";

const Layout: React.FC = () => {
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
      <WidthContainer variant="big" justify="center">
        <Outlet />
      </WidthContainer>
    </div>
  );
};

export default Layout;
