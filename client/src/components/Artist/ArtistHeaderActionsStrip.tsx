import ContactArtist from "components/common/ContactArtist";
import { UpdateArtistBody } from "queries";
import { useTranslation } from "react-i18next";
import { FaRss } from "react-icons/fa";
import { transformFromLinks } from "utils/links";
import { useMatchMedia } from "utils/useMatchMedia";

import { between, bp } from "../../constants";

import { ArtistButtonAnchor, ArtistButtonLink } from "./ArtistButtons";
import ArtistHeaderDescription from "./ArtistHeaderDescription";
import ArtistShare from "./ArtistShare";
import ArtistTourDates from "./ArtistTourDates";

export const tabButtonClass = "rounded-full!";

const ArtistHeaderActionsStrip: React.FC<{
  artist: Artist;
  isManage: boolean;
  onSubmit: (data: UpdateArtistBody) => Promise<void>;
}> = ({ artist, isManage, onSubmit }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const allLinks = transformFromLinks(artist).linkArray;
  const hasAnyLink = allLinks.length > 0;
  const hasHiddenLink = allLinks.some((l) => !l.inHeader);
  const isCompactLayout = useMatchMedia(between(bp.medium, bp.xlarge));
  const buttonSize: "tiny" | "compact" = isCompactLayout ? "tiny" : "compact";

  return (
    <div className="flex flex-row items-end gap-2 max-md:p-(--mi-side-paddings-xsmall)">
      <ArtistTourDates
        isManage={isManage}
        artist={artist}
        onSubmit={onSubmit}
        size={buttonSize}
      />
      <ArtistHeaderDescription
        isManage={isManage}
        artist={artist}
        onSubmit={onSubmit}
        size={buttonSize}
      />
      {hasAnyLink && (
        <ArtistButtonLink
          to="links"
          size={buttonSize}
          className={`${tabButtonClass} ${hasHiddenLink ? "" : "md:hidden!"}`}
        >
          {t("links")}
        </ArtistButtonLink>
      )}
      {!isManage && (
        <ContactArtist artist={artist} onlyIcon size={buttonSize} />
      )}
      <ArtistButtonAnchor
        target="_blank"
        href={`${import.meta.env.VITE_API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`}
        rel="noreferrer"
        onlyIcon
        size={buttonSize}
        startIcon={<FaRss />}
      />
      <ArtistShare artist={artist} size={buttonSize} />
    </div>
  );
};

export default ArtistHeaderActionsStrip;
