import { css } from "@emotion/css";
import BackToArtistLink from "../BackToArtistLink";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, queryManagedPost } from "queries";
import { useParams } from "react-router-dom";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import { getPostURLReference } from "utils/artist";
import { useTranslation } from "react-i18next";
import { bp } from "../../../constants";
import PublishPostButton from "./PublishPostButton";
import SaveDraftButton from "./SaveDraftButton";

const EditPostHeader: React.FC<{
  reload: (postId?: number) => Promise<unknown>;
  onClose?: () => void;
}> = ({ reload, onClose }) => {
  const { postId, artistId } = useParams();
  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));
  const { t } = useTranslation("translation", { keyPrefix: "managePost" });

  const { data: post, refetch } = useQuery(queryManagedPost(Number(postId)));

  const isPublished =
    post && !post.isDraft && new Date(post.publishedAt) < new Date();

  if (!post) {
    return null;
  }

  return (
    <div
      className={css`
        background-color: var(--mi-normal-background-color);
        box-shadow: 0px 1px 0px rgba(0, 0, 0, 0.25);
        top: 0;
        position: sticky;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.2rem 0;
        margin-bottom: 1rem;
        z-index: 1;

        @media screen and (max-width: ${bp.medium}px) {
          padding-top: 0.5rem;
        }
      `}
    >
      <BackToArtistLink subPage="posts" />
      <div
        className={css`
          display: flex;
        `}
      >
        {artist && isPublished && (
          <div
            className={css`
              display: flex;
              align-items: center;
              margin-right: 1rem;
            `}
          >
            <ArtistButtonLink
              variant="dashed"
              to={getPostURLReference({ ...post, artist })}
            >
              {t("viewLive")}
            </ArtistButtonLink>
          </div>
        )}
        {artist && (
          <SaveDraftButton
            post={post}
            artistId={artist.id}
            reload={reload}
            onClose={onClose}
          />
        )}
        <PublishPostButton post={post} reload={() => refetch()} />
      </div>
    </div>
  );
};

export default EditPostHeader;
