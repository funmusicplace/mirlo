import { css } from "@emotion/css";
import React from "react";
import { useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicArtist";

const PageHeader = () => {
  const { artistId } = useParams();

  const { artist } = usePublicArtist(artistId);

  const artistBanner = artist?.banner?.sizes;

  return (
    <>
      {artistBanner && (
        <img
          src={artistBanner?.[1250]}
          alt="Artist banner"
          className={css`
            margin-bottom: -6rem;
            max-height: 400px;
            box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.1) inset;

            @media screen and (max-width: 800px) {
              margin-bottom: 0;
              margin-top: 3rem;
            }
          `}
        />
      )}
      {!artistBanner && <div style={{ marginTop: "3rem" }}></div>}
    </>
  );
};

export default PageHeader;
