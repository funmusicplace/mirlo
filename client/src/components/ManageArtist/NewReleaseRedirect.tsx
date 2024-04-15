import React from "react";
import { useNavigate } from "react-router-dom";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { useAuthContext } from "state/AuthContext";

const NewReleaseRedirect: React.FC<{}> = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const {
    state: { artist },
  } = useArtistContext();

  const [isGeneratingAlbum, setIsGeneratingAlbum] = React.useState(false);

  const userId = user?.id;
  const artistId = artist?.id;

  const callback = React.useCallback(
    async (artistId?: number, userId?: number) => {
      if (artistId) {
        const userAlbums = await api.getMany(`users/${userId}/trackGroups`);

        const newAlbum = await api.post<
          Partial<TrackGroup>,
          { result: TrackGroup }
        >(`users/${userId}/trackGroups`, {
          title: "",
          urlSlug: `mi-temp-slug-new-album-${
            userAlbums.results.length ?? 0 + 2
          }`,
          artistId: artistId,
        });
        navigate(`/manage/artists/${artistId}/release/${newAlbum.result.id}`);
      }
    },
    [navigate]
  );

  React.useEffect(() => {
    if (!isGeneratingAlbum) {
      setIsGeneratingAlbum(true);
      callback(artistId, userId);
    }
  }, [artistId, userId, callback, isGeneratingAlbum]);

  return <LoadingBlocks />;
};

export default NewReleaseRedirect;
