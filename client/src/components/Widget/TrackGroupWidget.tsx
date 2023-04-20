import React from "react";
import { useLocation, useParams } from "react-router-dom";

const TrackGroupWidget = () => {
  const params = useParams();
  const loc = useLocation();
  console.log("loc", loc, params);
  return <>Track Group</>;
};

export default TrackGroupWidget;
