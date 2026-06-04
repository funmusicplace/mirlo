import ArtistRouterLink from "components/Artist/ArtistRouterLink";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import Box from "components/common/Box";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import Pill from "components/common/Pill";
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
  const formattedScheduledDate = formatDate({
    date: post.publishedAt,
    i18n,
    options: { dateStyle: "short" },
  });
  const dateLabel = t("publishedAt", {
    date: formatDate({ date: post.publishedAt, i18n }),
  });
  const tier = artist.subscriptionTiers?.find(
    ({ id }) => id === post.minimumSubscriptionTierId
  );

  return (
    <Box
      as="li"
      noPadding
      className="relative mb-4 bg-(--mi-button-tint-color) border border-(--mi-tint-x-color) overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {post.featuredImage && (
          <div className="hidden sm:block sm:w-32 sm:shrink-0 sm:self-stretch relative">
            <img
              src={post.featuredImage.src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-col flex-1 min-w-0 p-2">
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <ArtistButton
                type="button"
                variant="transparent"
                size="compact"
                startIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                aria-label={
                  isExpanded ? t("collapseDetails") : t("expandDetails")
                }
                onClick={() => setIsExpanded((v) => !v)}
              />
              <ArtistRouterLink
                to={
                  post.isDraft || isFuture
                    ? getManagePostURLReference(post)
                    : getPostURLReference({ ...post, artist })
                }
                className="min-w-0 flex-1 flex flex-col justify-start items-start no-underline! hover:underline!"
              >
                <h2 className="w-full line-clamp-2 mb-0! pb-1 text-sm! md:text-lg!">
                  {post.title === "" || !post.title ? (
                    <span className="italic">{t("untitledPost")}</span>
                  ) : (
                    post.title
                  )}
                </h2>
                <p className="w-full text-xs text-(--mi-secondary-text-color) mt-0.5 truncate">
                  {post.isDraft && !isFuture ? (
                    t("draftLabel")
                  ) : isFuture ? (
                    <>
                      <strong className="font-bold!">
                        {t("willBePublishedAtLabel")}
                      </strong>{" "}
                      {formattedScheduledDate}
                    </>
                  ) : (
                    dateLabel
                  )}
                </p>
              </ArtistRouterLink>
            </div>
            <div className="flex flex-col md:flex-row items-end md:items-center gap-2 shrink-0 max-md:self-stretch max-md:justify-between">
              {post.isPublic ? (
                <Pill
                  variant="tint"
                  className="max-md:px-1! max-md:py-0! max-md:text-xs!"
                >
                  {t("publicLabel")}
                </Pill>
              ) : tier ? (
                <Pill
                  variant="tint"
                  className="capitalize max-md:px-1! max-md:py-0! max-md:text-xs!"
                >
                  {tier.name}
                </Pill>
              ) : null}
              <div className="flex items-center gap-2">
                <ArtistButtonLink
                  aria-label={t("editPost")}
                  to={getManagePostURLReference(post)}
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
          </div>
        </div>
      </div>
      {isExpanded && (
        <div id={detailsId} className="p-4 border-t border-(--mi-tint-color)">
          <MarkdownWrapper className="line-clamp-5">
            {parse(post.content ?? "")}
          </MarkdownWrapper>
        </div>
      )}
    </Box>
  );
};

export default ManageArtistPostRow;
