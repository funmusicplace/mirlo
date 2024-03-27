import React from "react";
import { useParams } from "react-router-dom";
import { fetchArtist } from "state/ArtistContext";

const useArtistColors = () => {
  const [artistColors, setArtistColors] = React.useState<ArtistColors>();
  const params = useParams();
  const artistId = params?.artistId;

  React.useEffect(() => {
    if (!artistId) {
      setArtistColors(undefined);
      return;
    }
    const controller = new AbortController();

    const callback = async () => {
      const artist = await fetchArtist(artistId, false, controller.signal);
      setArtistColors(artist?.properties?.colors);
    };
    callback();

    return () => controller.abort();
  }, [artistId]);

  return artistColors;
};

export default useArtistColors;
