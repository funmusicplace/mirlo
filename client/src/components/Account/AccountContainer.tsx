import { css } from "@emotion/css";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { Outlet } from "react-router-dom";

import AccountNav from "./AccountNav";

const AccountContainer: React.FC = () => {
  return (
    <div
      className={`w-full flex flex-col ${css`
        h1 {
          margin: 0.7rem 0;
        }
      `}`}
    >
      <div className="mb-4">
        <AccountNav />
      </div>
      <WidthContainer
        variant="big"
        justify="center"
        className="p-(--mi-side-paddings-xsmall)"
      >
        <Outlet />
      </WidthContainer>
    </div>
  );
};

export default AccountContainer;
