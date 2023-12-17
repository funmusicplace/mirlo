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

  const userId = user?.id;

  return (
    <>
      {artistBanner && (!trackGroupId || isManage) && (
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
              ${userId ? "margin-top: 0px;" : "height: calc(34vh);"}
              ${!userId ? "position: fixed;" : ""}
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
            // margin-top: 55px;
            @media screen and (max-width: ${bp.medium}px) {
              margin-top: 0px;
            }
          `}
        ></div>
      )}
    </>
  );
};

export default PageHeader;
