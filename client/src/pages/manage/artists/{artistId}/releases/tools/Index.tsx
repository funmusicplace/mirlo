import React from "react";
import { useArtistContext } from "state/ArtistContext";
import { ManageSectionWrapper } from "components/ManageArtist/ManageSectionWrapper";
import { css } from "@emotion/css";
import ShowAlbumCodes from "components/ManageArtist/AlbumTools/ShowAlbumCodes";

const Index: React.FC<{}> = () => {
  const {
    state: { artist },
  } = useArtistContext();

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper
      className={css`
        margin-top: 2rem;
      `}
    >
      <ShowAlbumCodes />
    </ManageSectionWrapper>
  );
};

export default Index;
