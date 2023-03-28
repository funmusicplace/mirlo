import React from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function Artist() {
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();

  const fetchPosts = React.useCallback(async () => {
    const result = await api.get<Artist>(`artists/${artistId}`);
    console.log("result", result);
    setArtist(result);
  }, [artistId]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (!artist) {
    return null;
  }

  return (
    <div>
      <h1>{artist.name}</h1>
      <p>{artist.bio}</p>
      {artist.payPalClientId && (
        <>
          <h2>Support</h2>
          <p>You can support {artist?.name} with a recurring donation</p>
        </>
      )}
    </div>
  );
}

export default Artist;
