import { css } from "@emotion/css";
import { useLocation, useParams } from "react-router-dom";
import { bp } from "../../constants";
import useArtistQuery from "utils/useArtistQuery";
import styled from "@emotion/styled";

export const NoMargin = styled.div`
  @media screen and (max-width: ${bp.medium}px) {
    margin-top: 0px;
  }
`;

export const TiledImage = styled.div<{ url: string }>`
  width: 100%;
  height: 100%;
  background-image: url(${(props) => props.url});
  background-repeat: repeat;
  background-position: center;
  filter: brightness(0.8);
`;

export const StretchedImage = styled.img`
  width: 100%;
  z-index: -1;
  object-fit: cover;

  @media screen and (max-width: ${bp.medium}px) {
    object-fit: cover;
  }
`;

export const BackgroundWrapper = styled.div`
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
`;

const ArtistBackground = () => {
  const { pathname } = useLocation();

  const isManage = pathname.includes("manage");
  const { trackGroupId, postId } = useParams();

  const { data: artist } = useArtistQuery();

  const artistBackground = artist?.background;

  const showBackground = !(trackGroupId || postId) || isManage;

  return (
    <>
      {artistBackground && showBackground && (
        <BackgroundWrapper>
          {artistBackground && !artist.properties?.tileBackgroundImage && (
            <StretchedImage
              src={
                artistBackground?.sizes?.[2500] +
                `?${artistBackground?.updatedAt}`
              }
              alt="Artist background"
            />
          )}
          {artistBackground && artist.properties?.tileBackgroundImage && (
            <TiledImage
              url={`${artistBackground.sizes?.original}?${artistBackground?.updatedAt}`}
            />
          )}
        </BackgroundWrapper>
      )}
      {(!artistBackground || !showBackground) && <NoMargin />}
    </>
  );
};

export default ArtistBackground;
