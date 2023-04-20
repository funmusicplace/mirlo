import React from "react";
import { useLocation } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";

const Widget = () => {
  const {
    state: { user },
  } = useGlobalStateContext();

  const loc = useLocation();
  console.log("hi", user, loc);
  return <></>;
};

export default Widget;
