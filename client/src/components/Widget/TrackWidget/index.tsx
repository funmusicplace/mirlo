import React from "react";
import { useSearchParams } from "react-router-dom";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import Card from "./variants/Card";
import Strip from "./variants/Strip";

const variants = {
  card: Card,
  strip: Strip,
} as const;

type VariantKey = keyof typeof variants;

const TrackWidget = () => {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("variant");
  const fallback: VariantKey = isEmbeddedInMirlo() ? "strip" : "card";
  const variant: VariantKey =
    requested && requested in variants ? (requested as VariantKey) : fallback;
  const Component = variants[variant];
  return <Component />;
};

export default TrackWidget;
