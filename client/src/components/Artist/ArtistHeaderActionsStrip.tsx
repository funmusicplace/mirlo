import ContactArtist from "components/common/ContactArtist";
import { transformFromLinks } from "components/ManageArtist/ArtistFormLinks";
import { UpdateArtistBody } from "queries";
import { useTranslation } from "react-i18next";
import { FaRss } from "react-icons/fa";

import { ArtistButtonAnchor, ArtistButtonLink } from "./ArtistButtons";
import ArtistHeaderDescription from "./ArtistHeaderDescription";
import ArtistShare from "./ArtistShare";
import ArtistTourDates from "./ArtistTourDates";

const smallButtonClass = "h-6! w-6! [&_svg]:text-[0.8rem]";

export const tabButtonClass = "h-6! rounded-full!";

const ArtistHeaderActionsStrip: React.FC<{
  artist: Artist;
  isManage: boolean;
  onSubmit: (data: UpdateArtistBody) => Promise<void>;
}> = ({ artist, isManage, onSubmit }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const allLinks = transformFromLinks(artist).linkArray;
  const hasAnyLink = allLinks.length > 0;
  const hasHiddenLink = allLinks.some((l) => !l.inHeader);

  return (
    <div className="flex flex-row items-end gap-2 max-md:p-(--mi-side-paddings-xsmall)">
      <ArtistTourDates
        isManage={isManage}
        artist={artist}
        onSubmit={onSubmit}
      />
      <ArtistHeaderDescription
        isManage={isManage}
        artist={artist}
        onSubmit={onSubmit}
      />
      {hasAnyLink && (
        <ArtistButtonLink
          to="links"
          size="compact"
          className={`${tabButtonClass} ${hasHiddenLink ? "" : "md:hidden!"}`}
        >
          {t("links")}
        </ArtistButtonLink>
      )}
      {!isManage && (
        <ContactArtist artist={artist} onlyIcon className={smallButtonClass} />
      )}
      <ArtistButtonAnchor
        target="_blank"
        href={`${import.meta.env.VITE_API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`}
        rel="noreferrer"
        onlyIcon
        className={smallButtonClass}
        startIcon={<FaRss />}
      />
      <ArtistShare artist={artist} buttonClassName={smallButtonClass} />
    </div>
  );
};

export default ArtistHeaderActionsStrip;
