import { useQuery } from "@tanstack/react-query";
import { queryManagedArtists } from "queries";
import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { useAuthContext } from "state/AuthContext";

const CanCreateArtists: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const { isClosedToPublicArtistSignup } = useInstanceSettings();

  const { user } = useAuthContext();

  const { data: { results: artists } = {}, isFetched } = useQuery(
    queryManagedArtists()
  );
  const canSeeManageArtists = isClosedToPublicArtistSignup
    ? user?.canCreateArtists || !!artists?.length
    : true;

  if (!isFetched) {
    return null;
  }

  if (!canSeeManageArtists) {
    return null;
  }

  return <>{children}</>;
};

export default CanCreateArtists;
