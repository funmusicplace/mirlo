import { useQuery } from "@tanstack/react-query";
import { queryManagedArtists } from "queries";
import { querySetting } from "queries/settings";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const CanCreateArtists: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const { data: isClosedToPublicArtistSignup, isFetched: isFetchedSetting } =
    useQuery(querySetting("isClosedToPublicArtistSignup"));

  const { user } = useAuthContext();

  const { data: { results: artists } = {}, isFetched } = useQuery(
    queryManagedArtists()
  );
  const canSeeManageArtists = isClosedToPublicArtistSignup
    ? user?.invitesUsed?.find((invite) => invite.accountType === "ARTIST") ||
      !!artists?.length
    : true;

  if (!isFetched || !isFetchedSetting) {
    return null;
  }

  if (!canSeeManageArtists) {
    return null;
  }

  return <>{children}</>;
};

export default CanCreateArtists;
