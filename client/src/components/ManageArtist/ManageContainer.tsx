import { css } from "@emotion/css";
import WidthContainer from "components/common/WidthContainer";
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
          padding: 0 !important;
          width: 100%;
        `}
      >
        <WidthContainer variant="big" justify="center">
          <Outlet />
        </WidthContainer>
      </div>
    </>
  );
};

export default ManageContainer;
