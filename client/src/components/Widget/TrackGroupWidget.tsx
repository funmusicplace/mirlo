import React from "react";
import { useTranslation } from "react-i18next";
// import { useLocation, useParams } from "react-router-dom";

const TrackGroupWidget = () => {
  const {t} = useTranslation("translation", {keyPrefix: "trackGroupDetails"})
  // const params = useParams();
  // const loc = useLocation();
  return <>{t("trackgroup")}</>;
};

export default TrackGroupWidget;
