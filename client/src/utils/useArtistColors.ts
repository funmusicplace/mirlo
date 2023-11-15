import React from "react";
import { useParams } from "react-router-dom";
import { fetchArtist } from "state/ArtistContext";

const useArtistColors = () => {
  const [artistColors, setArtistColors] = React.useState<ArtistColors>();
  const params = useParams();
  const artistId = params?.artistId;

  React.useEffect(() => {
    const callback = async () => {
      const artist = await fetchArtist(artistId);
      setArtistColors(artist?.properties?.colors);
    };
    callback();
  }, [artistId]);

  return artistColors;
};

export default useArtistColors;
