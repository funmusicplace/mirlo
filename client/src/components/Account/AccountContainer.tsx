import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { Outlet } from "react-router-dom";

import AccountNav from "./AccountNav";

const AccountContainer: React.FC = () => {
  return (
    <div className="w-full flex flex-col">
      <WidthContainer variant="big" justify="center">
        <AccountNav />
      </WidthContainer>
      <Outlet />
    </div>
  );
};

export default AccountContainer;
