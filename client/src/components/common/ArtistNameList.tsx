import { toLanguageTag } from "i18n";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { getArtistLinkUrl, listSeparators } from "utils/artist";

import Tooltip from "./Tooltip";

type RenderArtistList = (artists: ArtistLink[]) => React.ReactNode;

const ArtistNameList: React.FC<{
  artists: ArtistLink[];
  renderLink: (artist: ArtistLink, url: string) => React.ReactNode;
  renderPlain?: (artist: ArtistLink) => React.ReactNode;
  itemAs?: React.ElementType;
  showRoles?: boolean;
}> = ({
  artists,
  renderLink,
  renderPlain = (artist) => artist.name,
  itemAs: Item = React.Fragment,
  showRoles,
}) => {
  const { i18n } = useTranslation();
  const separators = listSeparators(
    artists.length,
    toLanguageTag(i18n.resolvedLanguage)
  );
  return artists.map((artist, index) => {
    const url = getArtistLinkUrl(artist);
    const name = url ? renderLink(artist, url) : renderPlain(artist);
    return (
      <Item key={`${artist.name}-${index}`}>
        {showRoles && artist.role ? (
          <Tooltip
            position="right"
            hoverText={artist.role}
            underline={false}
            compact
          >
            {name}
          </Tooltip>
        ) : (
          name
        )}
        {separators[index]}
      </Item>
    );
  });
};

const ArtistListSlot: React.FC<{
  artists: ArtistLink[];
  renderList: RenderArtistList;
}> = ({ artists, renderList }) => <>{renderList(artists)}</>;

export const MainAndFeaturedArtists: React.FC<{
  main: ArtistLink[];
  featured: ArtistLink[];
  renderList: RenderArtistList;
}> = ({ main, featured, renderList }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackArtists" });
  return (
    <>
      {renderList(main)}
      {featured.length > 0 && (
        <>
          {main.length > 0 && " "}
          <Trans
            t={t}
            i18nKey="withGuests"
            components={{
              guests: (
                <ArtistListSlot artists={featured} renderList={renderList} />
              ),
            }}
          />
        </>
      )}
    </>
  );
};

export default ArtistNameList;
