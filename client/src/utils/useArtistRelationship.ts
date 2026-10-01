import { useQuery } from "@tanstack/react-query";
import { queryManagedArtists } from "queries";
import { useAuthContext } from "state/AuthContext";

export type ArtistRelationship = "owner" | "manager" | "label" | "admin";

const useArtistRelationship = (
  artist?: Pick<Artist, "id" | "userId"> | null
): { relationship?: ArtistRelationship; hasOwnerRights: boolean } => {
  const { user } = useAuthContext();
  const { data: { results: managedArtists } = {}, isFetched } = useQuery({
    ...queryManagedArtists(),
    enabled: !!user,
  });

  if (!user || !artist) {
    return { hasOwnerRights: false };
  }

  if (artist.userId === user.id) {
    return { relationship: "owner", hasOwnerRights: true };
  }

  if (!isFetched) {
    return { hasOwnerRights: !!user.isAdmin };
  }

  let relationship: ArtistRelationship;
  if (
    managedArtists?.find((a) => a.id === artist.id)?.relationship === "manager"
  ) {
    relationship = "manager";
  } else if (user.isAdmin) {
    relationship = "admin";
  } else {
    relationship = "label";
  }

  return { relationship, hasOwnerRights: !!user.isAdmin };
};

export default useArtistRelationship;
