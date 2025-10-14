import { css } from "@emotion/css";

import { useTranslation } from "react-i18next";

import { bp } from "../../constants";

import { FaDownload } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";

import { ArtistButtonAnchor } from "components/Artist/ArtistButtons";

const ReleaseDownloadableContent: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
}> = ({ trackGroup, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const { user } = useAuthContext();

  const userIsOwner = user?.id === artist.userId || user?.isAdmin;

  const userHasPurchasedTrackGroup = user?.userTrackGroupPurchases?.some(
    (m) => m.trackGroupId === trackGroup.id
  );

  if (userHasPurchasedTrackGroup || userIsOwner) {
    return trackGroup.downloadableContent &&
      trackGroup.downloadableContent.length > 0 ? (
      <div
        className={
          "includes " +
          css`
            margin: 1.5rem 1rem 0 1rem;
            @media screen and (max-width: ${bp.small}px) {
              max-width: 100%;
              flex: 100%;
              margin-left: 0;
            }
          `
        }
      >
        <p>
          <strong>{t("yourPurchaseIncludes")}</strong>
        </p>
        <ul
          className={css`
            list-style-type: disc;
            margin-top: 0.5rem;
            margin-left: 1.5rem;
          `}
        >
          {trackGroup.downloadableContent.map((content) => (
            <li key={content.downloadableContentId}>
              <ArtistButtonAnchor
                href={content.downloadableContent.downloadUrl}
                target="_blank"
                rel="noreferrer"
                variant="link"
                endIcon={<FaDownload />}
              >
                {content.downloadableContent.originalFilename}
              </ArtistButtonAnchor>
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  }

  return (
    <>
      {trackGroup.downloadableContent &&
        trackGroup.downloadableContent.length > 0 && (
          <div
            className={css`
              margin: 1.5rem 1rem 0 1rem;
              @media screen and (max-width: ${bp.small}px) {
                max-width: 100%;
                flex: 100%;
                margin-left: 0;
              }
            `}
          >
            <p>
              <strong>{t("purchaseIncludesThisDownloadableContent")}</strong>
            </p>
            <ul
              className={css`
                list-style-type: disc;
                margin-top: 0.5rem;
                margin-left: 1.5rem;
              `}
            >
              {trackGroup.downloadableContent.map((content) => (
                <li key={content.downloadableContentId}>
                  {content.downloadableContent.originalFilename}
                </li>
              ))}
            </ul>
          </div>
        )}
    </>
  );
};

export default ReleaseDownloadableContent;
