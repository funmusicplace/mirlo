import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { MetaCard } from "components/common/MetaCard";
import styled from "@emotion/styled";
import MarkdownContent from "./MarkdownContent";
import FollowArtist from "./FollowArtist";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "./Button";
import { FaPen } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import HeaderDiv from "./HeaderDiv";
import ArtistFormLinks from "components/ManageArtist/ArtistFormLinks";
import Avatar from "components/Artist/Avatar";
import ArtistFormLocation from "components/ManageArtist/ArtistFormLocation";

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
  padding-bottom: 0.5rem;
  flex-grow: 1;
  border-bottom: solid 1px var(--mi-light-foreground-color);
  font-size: var(--mi-font-size-normal);

  p {
    margin-bottom: 0rem !important;
  }

  @media screen and (max-width: ${bp.medium}px) {
    font-size: var(--mi-font-size-small);
    line-height: var(--mi-font-size-normal);
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
    padding-bottom: 0.5rem;
    border: solid grey;
    border-width: 0px 0px 1px 0px;
    margin-bottom: 0rem !important;
    p {
      margin-bottom: 0em !important;
      padding-bottom: 0rem;
    }
  }
`;

const ArtistHeaderSection: React.FC<{ artist: Artist; isManage?: boolean }> = ({
  artist,
  isManage,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const {
    state: { user },
  } = useGlobalStateContext();

  const artistAvatar = artist?.avatar?.sizes;

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
        image={artistAvatar?.[500] ?? artistAvatar?.[1200]}
      />
      <div
        className={css`
          display: flex;
          overflow: hidden;
          align-items: flex-end;
          justify-content: space-around;

          @media screen and (max-width: ${bp.medium}px) {
            background: var(--mi-normal-background-color);
          }
        `}
      >
        <Header>
          <div
            className={css`
              display: flex;
              padding-top: 1rem;
              margin-bottom: 0.5rem;
              ${artistAvatar ? "margin-bottom: 0.3rem;" : ""}
              align-items: center;

              @media screen and (max-width: ${bp.medium}px) {
                padding-top: 0rem;
                margin-bottom: 0rem;
              }
            `}
          >
            <Avatar avatar={artistAvatar?.[300]} />

            <div
              className={css`
                width: 100%;
                display: flex;
                ${artistAvatar ? "min-height: 85px; margin-left: 1rem;" : ""}
                flex-direction: column;
                justify-content: center;
                @media screen and (max-width: ${bp.medium}px) {
                  ${artistAvatar ? "min-height: 50px; margin-left: .5rem;" : ""}
                }
              `}
            >
              <div
                className={css`
                  width: 100%;
                  ${!artistAvatar ? "padding-bottom: .5rem;" : ""}
                `}
              >
                <HeaderDiv
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
                    <H1 artistAvatar={!!artistAvatar}>{artist.name}</H1>

                    <div
                      className={css`
                        text-align: right;
                        display: flex;
                        flex-direction: column;
                        padding-left: 1rem;
                        @media screen and (max-width: ${bp.medium}px) {
                          padding-left: 0.3rem;
                        }
                      `}
                    >
                      {!isManage && <FollowArtist artistId={artist.id} />}
                    </div>
                  </div>
                </HeaderDiv>
                <ArtistFormLocation isManage={!!isManage} />
              </div>
              {!artistAvatar && <MarkdownContent content={artist.bio} />}
            </div>
          </div>
          <div
            className={css`
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
            `}
          >
            {artistAvatar && (
              <MarkdownContent
                content={artist.bio}
                className={css`
                  padding-bottom: 0.5rem;
                  @media screen and (max-width: ${bp.medium}px) {
                    ${artistAvatar ? "padding-bottom: .2rem;" : ""}
                  }
                `}
              />
            )}
            {!isManage && user?.id === artist.userId && (
              <Link to={`/manage/artists/${artist.id}`}>
                <Button compact transparent type="button" startIcon={<FaPen />}>
                  {t("edit")}
                </Button>
              </Link>
            )}
          </div>
        </Header>
      </div>
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
