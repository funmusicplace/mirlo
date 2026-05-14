import ArtistRouterLink, {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import Box from "components/common/Box";
import Button from "components/common/Button";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import parse from "html-react-parser";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp, FaPen, FaTrash } from "react-icons/fa";
import { getManagePostURLReference, getPostURLReference } from "utils/artist";

type ManageArtistPostRowProps = {
  post: Post;
  artist: Artist;
  onDelete: (postId: number) => void;
};

const ManageArtistPostRow: React.FC<ManageArtistPostRowProps> = ({
  post,
  artist,
  onDelete,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const [isExpanded, setIsExpanded] = React.useState(false);
  const detailsId = `post-details-${post.id}`;

  const isFuture = new Date(post.publishedAt) > new Date();
  const dateLabel = isFuture
    ? t("willPublishAt", {
        date: formatDate({
          date: post.publishedAt,
          i18n,
          options: { dateStyle: "short" },
        }),
      })
    : t("publishedAt", {
        date: formatDate({ date: post.publishedAt, i18n }),
      });

  return (
    <Box as="li" className="mb-4 p-4 bg-(--mi-button-tint-color)">
      <div className="flex flex-col">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <Button
              type="button"
              variant="transparent"
              size="compact"
              onlyIcon
              startIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              aria-label={
                isExpanded ? t("collapseDetails") : t("expandDetails")
              }
              onClick={() => setIsExpanded((v) => !v)}
            />
            <ArtistRouterLink
              to={getPostURLReference({ ...post, artist })}
              className="min-w-0 flex-1 flex flex-col justify-start items-start"
            >
              <h2 className="truncate mb-0!">
                {post.title === "" || !post.title ? (
                  <span className="italic">{t("untitledPost")}</span>
                ) : (
                  post.title
                )}
              </h2>
              <p className="text-xs text-(--mi-secondary-text-color) mt-0.5 truncate">
                {dateLabel}
              </p>
            </ArtistRouterLink>
          </div>
          <div className="flex items-center gap-2">
            <ArtistButtonLink
              aria-label={t("editPost")}
              to={getManagePostURLReference(post)}
              onlyIcon
              variant="dashed"
              startIcon={<FaPen />}
            />
            <ArtistButton
              aria-label={t("deletePost")}
              startIcon={<FaTrash />}
              onClick={() => onDelete(post.id)}
            />
          </div>
        </div>
        <div
          id={detailsId}
          className={
            isExpanded
              ? "mt-4 pt-4 border-t border-(--mi-tint-color)"
              : "hidden"
          }
        >
          <MarkdownWrapper className="line-clamp-5">
            {parse(post.content ?? "")}
          </MarkdownWrapper>
        </div>
      </div>
    </Box>
  );
};

export default ManageArtistPostRow;
