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

  return (
    <Box
      as="li"
      className="mb-4 bg-[var(--mi-tint-color)]"
      style={{ padding: "0.5rem" }}
    >
      <div className="flex flex-col">
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
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
              style={{
                padding: "0.25rem",
                height: "auto",
                width: "auto",
                lineHeight: 1,
              }}
            />
            <ArtistRouterLink
              to={getPostURLReference({ ...post, artist })}
              className="min-w-0 flex-1 flex justify-start items-start [&_h2]:mr-4"
            >
              <h2 className="truncate mb-0!">
                {post.title === "" || !post.title ? (
                  <span className="italic">{t("untitledPost")}</span>
                ) : (
                  post.title
                )}
              </h2>
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
              ? "mt-2 pt-2 border-t border-(--mi-tint-color)"
              : "hidden"
          }
        >
          <p className="text-gray-500 mb-4 text-left w-full">
            {new Date(post.publishedAt) > new Date() &&
              t("willPublishAt", {
                date: formatDate({
                  date: post.publishedAt,
                  i18n,
                  options: { dateStyle: "short" },
                }),
              })}
            {new Date(post.publishedAt) <= new Date() &&
              t("publishedAt", {
                date: formatDate({ date: post.publishedAt, i18n }),
              })}
          </p>
          <MarkdownWrapper className="line-clamp-5">
            {parse(post.content ?? "")}
          </MarkdownWrapper>
        </div>
      </div>
    </Box>
  );
};

export default ManageArtistPostRow;
