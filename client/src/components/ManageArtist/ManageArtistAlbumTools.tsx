import React from "react";
import { useArtistContext } from "state/ArtistContext";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import { css } from "@emotion/css";
import ShowAlbumCodes from "./AlbumTools/ShowAlbumCodes";

const ManageArtistAlbumsTools: React.FC<{}> = () => {
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

export default ManageArtistAlbumsTools;
