import React from "react";
import { useSearchParams } from "react-router-dom";

import Card from "components/Widget/TrackGroupWidget/variants/Card";
import Compact from "components/Widget/TrackGroupWidget/variants/Compact";
import Strip from "components/Widget/TrackGroupWidget/variants/Strip";

const variants = {
  card: Card,
  strip: Strip,
  compact: Compact,
} as const;

type VariantKey = keyof typeof variants;

const Index = () => {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("variant");
  const variant: VariantKey =
    requested && requested in variants ? (requested as VariantKey) : "card";
  const Component = variants[variant];
  return <Component />;
};

export default Index;
