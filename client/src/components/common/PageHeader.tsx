import { css } from "@emotion/css";
import React from "react";
import { useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicObjectById";

const PageHeader = () => {
  const { artistId } = useParams();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);

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
            margin-top: 66px;

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
