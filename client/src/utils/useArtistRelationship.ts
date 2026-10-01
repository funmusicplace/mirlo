import { useQuery } from "@tanstack/react-query";
import { queryManagedArtists } from "queries";
import { useAuthContext } from "state/AuthContext";

export type ArtistRelationship = "owner" | "manager" | "label" | "admin";

const useArtistRelationship = (
  artist?: Pick<Artist, "id" | "userId"> | null
): { relationship?: ArtistRelationship; isOwner: boolean } => {
  const { user } = useAuthContext();
  const { data: { results: managedArtists } = {} } = useQuery({
    ...queryManagedArtists(),
    enabled: !!user,
  });

  if (!user || !artist) {
    return { isOwner: false };
  }

  let relationship: ArtistRelationship;
  if (artist.userId === user.id) {
    relationship = "owner";
  } else if (
    managedArtists?.find((a) => a.id === artist.id)?.relationship === "manager"
  ) {
    relationship = "manager";
  } else if (user.isAdmin) {
    relationship = "admin";
  } else {
    relationship = "label";
  }

  return {
    relationship,
    isOwner: relationship === "owner" || !!user.isAdmin,
  };
};

export default useArtistRelationship;
