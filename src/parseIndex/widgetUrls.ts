import { Client } from "@mirlo/prisma/client";

export const getTrackGroupWidget = (
  client: Client,
  trackGroupId: number,
  variant?: string
) => {
  const base = `${client.applicationUrl}/widget/trackGroup/${trackGroupId}`;
  return variant ? `${base}?variant=${variant}` : base;
};

export const getTrackWidget = (
  client: Client,
  trackId: number,
  variant?: string
) => {
  const base = `${client.applicationUrl}/widget/track/${trackId}`;
  return variant ? `${base}?variant=${variant}` : base;
};

export const getPostWidget = (client: Client, postId: number) =>
  `${client.applicationUrl}/widget/post/${postId}`;
