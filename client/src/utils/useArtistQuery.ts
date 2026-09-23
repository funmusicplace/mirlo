import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useParams } from "react-router-dom";

const useArtistQuery = () => {
  const { artistId } = useParams();
  const queryResponse = useQuery(queryArtist({ artistSlug: artistId }));
  return queryResponse;
};

export default useArtistQuery;
