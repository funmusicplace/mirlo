import { css } from "@emotion/css";
import { useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicObjectById";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";

const PageHeader = () => {
  const { artistId, trackGroupId } = useParams();

  const {
    state: { user },
  } = useGlobalStateContext();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);

  const artistBanner = artist?.banner?.sizes;

  return (
    <>
      {artistBanner && !trackGroupId && (
        <img
          src={artistBanner?.[1250]}
          alt="Artist banner"
          className={css`
            margin-bottom: -6rem;
            max-height: 400px;
            box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.1) inset;
            margin-top: ${user ? "55px" : "0"};

            @media screen and (max-width: ${bp.medium}px) {
              margin-bottom: 0;
              margin-top: ${user ? "3rem" : "0"};
            }
          `}
        />
      )}
      {(!artistBanner || trackGroupId) && user && (
        <div style={{ marginTop: "3rem" }}></div>
      )}
    </>
  );
};

export default PageHeader;
