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

const H1 = styled.h1`
  font-size: 2.7rem;
  line-height: 2.9rem;

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 1.2rem;
    line-height: 1.3rem;
    padding-top: 0rem;
    padding-bottom: 0rem;
  }
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: left;
  justify-content: space-between;
  flex-grow: 1;
  border-bottom: solid 1px var(--mi-light-foreground-color);
  font-size: var(--mi-font-size-normal);

  p {
    // margin-bottom: 2rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    font-size: var(--mi-font-size-small);
    line-height: 1rem;
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
    padding-bottom: 0.5rem;
    border: solid grey;
    border-width: 0px 0px 1px 0px;
    p {
      margin-bottom: 0em !important;
      padding-bottom: 0.5rem;
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

  return (
    <div
      className={css`
        margin-bottom: 1rem;
        padding-top: 0.5rem;
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      <MetaCard
        title={artist.name}
        description={artist.bio}
        image={artist.avatar?.sizes?.[500] ?? artist?.banner?.sizes?.[625]}
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
              margin-bottom: 1rem;
              align-items: center;

              @media screen and (max-width: ${bp.medium}px) {
                padding-top: 0.5rem;
                margin-bottom: 0rem;
              }
            `}
          >
            {artist.avatar?.sizes?.[300] && (
              <div
                className={css`
                  max-width: 120px;
                  padding-right: 1rem;

                  @media screen and (max-width: ${bp.medium}px) {
                    max-width: 80px;
                    padding-bottom: 0rem;
                    margin-bottom: 0rem;
                  }
                `}
              >
                <img
                  src={artist.avatar?.sizes?.[300]}
                  alt="Artist avatar"
                  className={css`
                    width: 100%;
                    border-radius: 100px;
                    border: solid 1px var(--mi-lighter-foreground-color);
                  `}
                />{" "}
              </div>
            )}

            <div
              className={css`
                width: 100%;
                display: flex;
                flex-direction: column;
              `}
            >
              <HeaderDiv
                className={css`
                  align-items: flex-start !important;
                  padding-bottom: 0 !important;
                  @media screen and (max-width: ${bp.medium}px) {
                    margin-bottom: 0rem !important;
                  }
                `}
              >
                <div>
                  <H1>{artist.name}</H1>
                </div>
                <div
                  className={css`
                    text-align: right;
                    margin-top: 5px;
                  `}
                >
                  {!isManage && <FollowArtist artistId={artist.id} />}
                  {!isManage && user?.id === artist.userId && (
                    <Link to={`/manage/artists/${artist.id}`}>
                      <Button
                        compact
                        transparent
                        type="button"
                        startIcon={<FaPen />}
                      >
                        {t("edit")}
                      </Button>
                    </Link>
                  )}
                </div>
              </HeaderDiv>
              <div
                className={css`
                  @media screen and (max-width: ${bp.medium}px) {
                    display: none;
                  }
                `}>
              <MarkdownContent
                content={artist.bio}
              />
              </div>
            </div>
          </div>
          <div
                className={css`
                  @media screen and (min-width: ${bp.medium}px) {
                    display: none;
                  }
                `}>
          <MarkdownContent
                content={artist.bio}
              />
            </div>
        </Header>
      </div>
    </div>
  );
};

export default ArtistHeaderSection;
