import { css } from "@emotion/css";
import React from "react";

import { Outlet } from "react-router-dom";

const ManageContainer: React.FC = () => {
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
        `}
      >
        <Outlet />
      </div>
    </>
  );
};

export default ManageContainer;
