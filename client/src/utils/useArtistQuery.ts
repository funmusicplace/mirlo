import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist } from "queries";
import { useParams } from "react-router-dom";

const useArtistQuery = () => {
  const { artistId } = useParams();
  const queryResponse = useQuery(queryManagedArtist(Number(artistId)));
  return queryResponse;
};

export default useArtistQuery;
