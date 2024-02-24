import { css } from "@emotion/css";
import { bp } from "../../constants";
import { MetaCard } from "components/common/MetaCard";
import styled from "@emotion/styled";
import FollowArtist from "./FollowArtist";
import SpaceBetweenDiv from "./SpaceBetweenDiv";
import ArtistFormLinks from "components/ManageArtist/ArtistFormLinks";
import Avatar from "components/Artist/Avatar";
import ArtistFormLocation from "components/ManageArtist/ArtistFormLocation";
import ArtistHeaderDescription from "components/Artist/ArtistHeaderDescription";
import { useArtistContext } from "state/ArtistContext";
import LoadingBlocks from "components/Artist/LoadingBlocks";

const H1 = styled.h1<{ artistAvatar: boolean }>`
  font-size: 2.4rem;
  line-height: 2.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 1.2rem;
    line-height: 1.4rem;
    padding-top: 0rem;
    padding-bottom: 0rem;
    ${(props) =>
      !props.artistAvatar
        ? "font-size: 1.3rem !important; line-height: 2rem;"
        : ""}
  }
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: left;
  justify-content: space-between;
  flex-grow: 1;
  font-size: var(--mi-font-size-normal);

  @media screen and (max-width: ${bp.medium}px) {
    font-size: var(--mi-font-size-small);
    line-height: var(--mi-font-size-normal);
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
    margin-bottom: 0rem !important;
  }
`;

const HeaderWrapper = styled.div`
  display: flex;
  overflow: hidden;
  align-items: flex-end;
  justify-content: space-around;
  border-bottom: solid 1px var(--mi-light-foreground-color);

  @media screen and (max-width: ${bp.medium}px) {
    background: var(--mi-normal-background-color);
  }
`;

const DescriptionWrapperHasAvatar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const ArtistActions = styled.div`
  text-align: right;
  word-break: normal !important;
  display: flex;
  flex-direction: row;

  a {
    margin-left: 0.75rem;
  }
  padding-left: 1rem;
  @media screen and (max-width: ${bp.medium}px) {
    padding-left: 0.3rem;
  }
`;

const ArtistHeaderSection: React.FC<{ artist: Artist; isManage?: boolean }> = ({
  isManage,
}) => {
  const {
    state: { artist, isLoading },
  } = useArtistContext();

  const artistAvatar = artist?.avatar;

  if (!artist && isLoading) {
    return <LoadingBlocks rows={1} />;
  } else if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        @media screen and (max-width: ${bp.medium}px) {
          padding-top: 0.5rem;
        }
      `}
    >
      <MetaCard
        title={artist.name}
        description={artist.bio}
        image={artistAvatar?.sizes?.[500] ?? artistAvatar?.sizes?.[1200]}
      />
      <HeaderWrapper>
        <Header>
          <div
            className={css`
              display: flex;
              padding-top: 1rem;
              ${artistAvatar ? "margin-bottom: 0.75rem;" : ""}
              align-items: center;

              @media screen and (max-width: ${bp.medium}px) {
                padding-top: 0rem;
                ${artistAvatar ? "margin-bottom: 0.5rem;" : ""}
              }
            `}
          >
            {artistAvatar && (
              <Avatar
                avatar={
                  artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`
                }
              />
            )}

            <div
              className={css`
                width: 100%;
                display: flex;
                ${artistAvatar ? "min-height: 85px; margin-left: 1rem;" : ""}
                flex-direction: column;
                justify-content: center;
                @media screen and (max-width: ${bp.medium}px) {
                  ${artistAvatar ? "min-height: 55px; margin-left: .5rem;" : ""}
                }
              `}
            >
              <div
                className={css`
                  width: 100%;
                `}
              >
                <SpaceBetweenDiv
                  className={css`
                    padding-bottom: 0 !important;
                    margin-bottom: 0rem !important;
                    @media screen and (max-width: ${bp.medium}px) {
                      margin: 0rem !important;
                    }
                  `}
                >
                  <div
                    className={css`
                      min-height: 50px;
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      word-break: break-word;
                      width: 100%;
                      @media screen and (max-width: ${bp.medium}px) {
                        min-height: auto;
                      }
                    `}
                  >
                    <div
                      className={css`
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        word-break: break-word;
                        width: 100%;
                      `}
                    >
                      <H1 artistAvatar={!!artistAvatar}>{artist.name}</H1>

                      <ArtistFormLocation isManage={!!isManage} />
                    </div>
                    <ArtistActions>
                      {!isManage && <FollowArtist artistId={artist.id} />}
                    </ArtistActions>
                  </div>
                </SpaceBetweenDiv>
              </div>
              {!artistAvatar && (
                <div
                  className={css`
                    width: 100%;
                    ${!artistAvatar ? "padding-top: .75rem;" : ""}
                  `}
                >
                  <ArtistHeaderDescription />
                </div>
              )}
            </div>
          </div>
          {artistAvatar && (
            <DescriptionWrapperHasAvatar>
              <ArtistHeaderDescription />
            </DescriptionWrapperHasAvatar>
          )}
        </Header>
      </HeaderWrapper>
      <div
        className={css`
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
          @media screen and (max-width: ${bp.medium}px) {
            display: none;
          }
        `}
      >
        <ArtistFormLinks isManage={!!isManage} />
      </div>
    </div>
  );
};

export default ArtistHeaderSection;
