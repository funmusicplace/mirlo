import { css } from "@emotion/css";
import { useParams } from "react-router-dom";
import { bp } from "../../constants";
import { MetaCard } from "components/common/MetaCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import styled from "@emotion/styled";

const H1 = styled.h1`
  font-size: 50px;
  line-height: 3.5rem;
  padding-top: 1.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 32px;
    padding-top: 0.5rem;
    line-height: 2rem;
  }
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: left;
  justify-content: space-between;
  flex-grow: 1;

  p {
    margin-bottom: 0.5rem !important;
  }

  @media screen and (max-width: ${bp.medium}px) {
    border-radius: 0;
    padding: 0rem 0.5rem 0rem;
    border: solid grey;
    border-width: 0px 0px 1px 0px;
  }
`;

const remarkClass = css`
  margin: 0rem !important;
  padding-bottom: 1rem;
  border-bottom: solid 1px;

  @media screen and (max-width: ${bp.medium}px) {
    border-bottom: solid 0px;
    font-size: 0.8rem;
    padding-bottom: 0rem;
    color: grey;
  }
`;

const ArtistHeaderSection: React.FC<{ artist: Artist; isManage?: boolean }> = ({
  artist,
  isManage,
}) => {
  const { trackGroupId } = useParams();

  const artistBanner = artist?.banner?.sizes;

  return (
    <div>
      <MetaCard
        title={artist.name}
        description={artist.bio}
        image={artist.avatar?.sizes?.[500] ?? artist?.banner?.sizes?.[625]}
      />
      {artistBanner && (!trackGroupId || isManage) && (
        <div
          className={css`
            display: flex;
            overflow: hidden;
            align-items: flex-end;
            justify-content: space-around;
            background: var(--mi-light-background-color);

            @media screen and (max-width: ${bp.medium}px) {
              background: var(--mi-normal-background-color);
            }
          `}
        >
          <Header>
            <H1>{artist.name}</H1>
            <MarkdownWrapper
              className={css`
                margin: 0rem !important;
              `}
            >
              <ReactMarkdown
                className={remarkClass}
                remarkPlugins={[remarkGfm]}
              >
                {artist.bio}
              </ReactMarkdown>
            </MarkdownWrapper>
          </Header>
        </div>
      )}

      {(!artistBanner || trackGroupId) && (
        <div
          className={css`
            display: flex;
            overflow: hidden;
            align-items: flex-end;
            justify-content: space-around;
          `}
        >
          <Header>
            <H1>{artist.name}</H1>
            <MarkdownWrapper
              className={css`
                margin: 0rem !important;
              `}
            >
              <ReactMarkdown
                className={remarkClass}
                remarkPlugins={[remarkGfm]}
              >
                {artist.bio}
              </ReactMarkdown>
            </MarkdownWrapper>
          </Header>
        </div>
      )}
    </div>
  );
};

export default ArtistHeaderSection;
