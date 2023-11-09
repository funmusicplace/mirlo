import { css } from "@emotion/css";
import { useLocation, useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicObjectById";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";

const PageHeader = () => {
  const { pathname } = useLocation();

  const isManage = pathname.includes("manage");
  const { artistId, trackGroupId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);

  const artistBanner = artist?.banner?.sizes;

  return (
    <>
      {artistBanner && (!trackGroupId || isManage) && (
        <div
          className={css`
            ${user ? "margin-top: 60px;" : "height: calc(34vh);"}
            height: calc(36vh);
            min-height: calc(14rem-55px);
            position: fixed;
            overflow: hidden;
            width: 100%;
            display: flex;
            justify-content: center;
            //* border-bottom: solid 4px; *//
            box-shadow: inset 1em -2em 0.8em -1.3em rgba(0, 0, 0, 0.4);
            @media screen and (max-width: ${bp.medium}px) {
              position: relative;
              max-height: 20vw;
            }
          `}
        >
          <div
            className={css`
              display: flex;
              //* max-width: 1250px; *//
              width: 100%;
              min-height: 100%;

              @media screen and (max-width: ${bp.medium}px) {
                min-height: 100%;
              }
            `}
          >
            <img
              src={artistBanner?.[2500]}
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
          </div>
        </div>
      )}
      {(!artistBanner || (trackGroupId && !isManage)) && (
        <div
          className={css`
            margin-top: 60px;
            }
          `}
        ></div>
      )}
    </>
  );
};

export default PageHeader;
