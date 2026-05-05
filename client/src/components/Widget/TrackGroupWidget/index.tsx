import React from "react";
import { useSearchParams } from "react-router-dom";

import Card from "./variants/Card";
import Compact from "./variants/Compact";
import Strip from "./variants/Strip";

const variants = {
  card: Card,
  strip: Strip,
  compact: Compact,
} as const;

type VariantKey = keyof typeof variants;

const TrackGroupWidget = () => {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("variant");
  const variant: VariantKey =
    requested && requested in variants ? (requested as VariantKey) : "card";
  const Component = variants[variant];
  return <Component />;
};

export default TrackGroupWidget;
