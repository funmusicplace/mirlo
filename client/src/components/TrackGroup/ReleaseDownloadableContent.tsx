import { css } from "@emotion/css";

import { useTranslation } from "react-i18next";

import { bp } from "../../constants";

import { FaDownload } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";

import { ArtistButtonAnchor } from "components/Artist/ArtistButtons";
import api from "services/api";

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

  const download = async (contentId: string, filename: string) => {
    const resp = await api.request(
      `downloadableContent/${contentId}`,
      {
        method: "GET",
        credentials: "include",
      },
      {
        noProcess: true,
      }
    );

    (resp as any).blob().then((blob: Blob) => {
      const href = URL.createObjectURL(blob);

      const anchorElement = document.createElement("a");
      anchorElement.href = href;
      anchorElement.download = filename;

      document.body.appendChild(anchorElement);
      anchorElement.click();

      document.body.removeChild(anchorElement);
      window.URL.revokeObjectURL(href);
    });
  };

  if (userHasPurchasedTrackGroup || userIsOwner) {
    return trackGroup.downloadableContent &&
      trackGroup.downloadableContent.length > 0 ? (
      <div
        className={
          "includes " +
          css`
            margin-top: 1rem;
            font-size: var(--mi-font-size-small);
            @media screen and (max-width: ${bp.small}px) {
              max-width: 100%;
              flex: 100%;
              margin: var(--mi-side-paddings-xsmall);
              margin-top: 1rem;
            }
          `
        }
      >
        <p>
          <strong
            className={css`
              font-size: var(--mi-font-size-small);
              }
            `}
          >
            {t("yourPurchaseIncludes")}
          </strong>
        </p>
        <ul
          className={css`
            list-style-type: disc;
            margin: var(--mi-side-paddings-xsmall);
            margin-top: 0.5rem;
            font-size: var(--mi-font-size-small);
            margin-left: 1rem;
          `}
        >
          {trackGroup.downloadableContent.map((content) => (
            <li key={content.downloadableContentId}>
              <ArtistButtonAnchor
                onClick={(e) => {
                  e.preventDefault;
                  download(
                    content.downloadableContentId,
                    content.downloadableContent.originalFilename
                  );
                }}
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
              margin-top: 1rem;
              font-size: var(--mi-font-size-small);
              @media screen and (max-width: ${bp.small}px) {
                max-width: 100%;
                flex: 100%;
                margin: var(--mi-side-paddings-xsmall);
                margin-top: 1rem;
              }
            `}
          >
            <p>
              <strong>{t("purchaseIncludesThisDownloadableContent")}</strong>
            </p>
            <ul
              className={css`
                list-style-type: disc;
                margin: var(--mi-side-paddings-xsmall);
                margin-top: 0.5rem;
                font-size: var(--mi-font-size-small);
                margin-left: 1rem;
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
