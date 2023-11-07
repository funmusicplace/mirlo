import { css } from "@emotion/css";
import { useParams } from "react-router-dom";
import { bp } from "../../constants";
import { MetaCard } from "components/common/MetaCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownWrapper from "components/common/MarkdownWrapper";

const ArtistHeaderSection: React.FC<{ artist: Artist }> = ({ artist }) => {

  const { trackGroupId } = useParams();

  const artistBanner = artist?.banner?.sizes;

  return (

<div>

{artistBanner && !trackGroupId && (
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
      <div
        className={css`
          display: flex;
          padding: 0rem 2rem 0rem 2rem;
          width: 100%;
          flex-direction: column;
          align-items: left;
          justify-content: space-between;
          flex-grow: 1;

          p{
            margin-bottom: .5rem !important;
          }

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem .5rem 0rem;
            border: solid grey;
            border-width: 0px 0px 0px 0px;
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
                align-items: center;
                justify-content: space-between;
              `}
            >
              <h1
                className={css`
                  font-size: 50px;
                  line-height: 3.5rem;
                  padding-top: 1.5rem;

                  @media screen and (max-width: ${bp.medium}px) {
                  font-size: 32px;
                  padding-top: .5rem;
                  line-height: 2rem;

                  }
                `}
              >{artist.name}</h1>
            </div>
            <MarkdownWrapper
              className={css`
                margin: 0rem !important;
              `}
            >
              <ReactMarkdown
                className={css`
                  margin: 0rem !important;
                  padding-bottom: 1rem;
                  border-bottom: solid 1px;

                  @media screen and (max-width: ${bp.medium}px) {
                  border-bottom: solid 0px;
                  font-size: .8rem;
                  padding-bottom: 0rem;
                  color: grey;
                  }
                `}
               remarkPlugins={[remarkGfm]}>{artist.bio}</ReactMarkdown>
            </MarkdownWrapper>
        </div>
        <div></div></div>)}

        {(!artistBanner || trackGroupId) && (

          <div
                className={css`
                  display: flex;
                  overflow: hidden;
                  align-items: flex-end;
                  justify-content: space-around;

                  @media screen and (max-width: ${bp.medium}px) {
                  }
                `}
              >
              <div
                className={css`
                  display: flex;
                  padding: 0rem 2rem 0rem 2rem;
                  width: 100%;
                  flex-direction: column;
                  align-items: left;
                  justify-content: space-between;
                  flex-grow: 1;

                  p{
                    margin-bottom: .5rem !important;
                  }

                  @media screen and (max-width: ${bp.medium}px) {
                    border-radius: 0;
                    padding: 0rem .5rem 0rem;
                    border: solid grey;
                    border-width: 0px 0px 1px 0px;
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
                        align-items: center;
                        justify-content: space-between;
                      `}
                    >
                      <h1
                        className={css`
                          font-size: 50px;
                          line-height: 3.5rem;
                          padding-top: 1.5rem;

                          @media screen and (max-width: ${bp.medium}px) {
                          font-size: 32px;
                          padding-top: .5rem;
                          line-height: 2rem;

                          }
                        `}
                      >{artist.name}</h1>
                    </div>
                    <MarkdownWrapper
                      className={css`
                        margin: 0rem !important;
                      `}
                    >
                      <ReactMarkdown
                        className={css`
                          margin: 0rem !important;
                          padding-bottom: 1rem;
                          border-bottom: solid 1px;

                          @media screen and (max-width: ${bp.medium}px) {
                          border-bottom: solid 0px;
                          font-size: .8rem;
                          padding-bottom: 0rem;
                          color: grey;
                          }
                        `}
                       remarkPlugins={[remarkGfm]}>{artist.bio}</ReactMarkdown>
                    </MarkdownWrapper>
                </div>
                <div></div></div>
        )}

        </div>
        );
      }

      export default ArtistHeaderSection;
