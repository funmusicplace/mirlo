import { css } from "@emotion/css";
import { useLocation, useParams } from "react-router-dom";
import { bp } from "../../constants";
import useArtistQuery from "utils/useArtistQuery";

const PageBanner = () => {
  const { pathname } = useLocation();

  const isManage = pathname.includes("manage");
  const { trackGroupId, postId } = useParams();

  const { data: artist } = useArtistQuery();
  const artistBanner = artist?.banner;

  const showBanner = !(trackGroupId || postId) || isManage;

  console.log("artist", artist);
  return (
    <>
      {artistBanner && showBanner && (
        <div
          className={css`
            position: fixed;
            height: 100%;
            width: 100%;
            overflow: hidden;
            display: flex;
            top: 0;
            justify-content: center;
            box-shadow: inset 1em -2em 0.8em -1.3em rgba(0, 0, 0, 0.4);
            @media screen and (max-width: ${bp.medium}px) {
              position: absolute;
              margin-top: 0px;
            }
          `}
        >
          <div
            className={css`
              display: flex;
              width: 100%;
              min-height: 100%;

              @media screen and (max-width: ${bp.medium}px) {
                min-height: 100%;
              }
            `}
          >
            {artistBanner && !artist.properties?.tileBackgroundImage && (
              <img
                src={
                  artistBanner?.sizes?.[2500] + `?${artistBanner?.updatedAt}`
                }
                alt="Artist banner"
                className={css`
                  width: 100%;
                  z-index: -1;
                  object-fit: cover;

                  @media screen and (max-width: ${bp.medium}px) {
                    object-fit: cover;
                  }
                `}
              />
            )}
            {artistBanner && artist.properties?.tileBackgroundImage && (
              <div
                className={css`
                  width: 100%;
                  height: 100%;
                  background-image: url(${artistBanner.sizes?.original +
                  `?${artistBanner?.updatedAt}`});
                  background-repeat: repeat;
                  background-position: center;
                  filter: brightness(0.8);
                `}
              />
            )}
          </div>
        </div>
      )}
      {(!artistBanner || !showBanner) && (
        <div
          className={css`
            @media screen and (max-width: ${bp.medium}px) {
              margin-top: 0px;
            }
          `}
        ></div>
      )}
    </>
  );
};

export default PageBanner;
