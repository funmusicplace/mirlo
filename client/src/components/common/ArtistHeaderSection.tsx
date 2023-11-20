import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { MetaCard } from "components/common/MetaCard";
import styled from "@emotion/styled";
import MarkdownContent from "./MarkdownContent";
import HeaderDiv from "./HeaderDiv";
import FollowArtist from "./FollowArtist";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "./Button";
import { FaPen } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const H1 = styled.h1`
  font-size: 50px;
  font-size: 2.6vmax;
  line-height: 2.8vmax;
  padding-top: 1.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 32px;
    font-size: 3.2vmax;
    line-height: 3.2vmax;
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
    margin-bottom: 2rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    font-size: var(--mi-font-size-small);
    line-height: 1rem;
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
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
        `}
      >
        <Header>
          <HeaderDiv
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            <div>
              <H1>{artist.name}</H1>
            </div>
            <div>
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
              filter: brightness(75%);
              opacity: 0.8;
            `}
          >
            <MarkdownContent content={artist.bio} />
          </div>
        </Header>{" "}
      </div>
    </div>
  );
};

export default ArtistHeaderSection;
