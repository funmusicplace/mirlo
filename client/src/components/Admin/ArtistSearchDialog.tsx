import { useQuery } from "@tanstack/react-query";
import CommandSearch, {
  CommandSearchSection,
} from "components/common/CommandSearch/CommandSearch";
import { queryArtists } from "queries/artists";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "use-debounce";

export const ArtistAvatar: React.FC<{ artist: Artist }> = ({ artist }) =>
  artist.avatar?.sizes?.[60] ? (
    <img
      src={artist.avatar.sizes[60]}
      alt=""
      className="w-6 h-6 rounded-full object-cover shrink-0"
    />
  ) : (
    <span className="w-6 h-6 rounded-full bg-(--mi-tint-x-color) shrink-0" />
  );

const ArtistSearchDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  onSelect: (artist: Artist) => void;
  excludedIds?: number[];
  includeUnpublished?: boolean;
}> = ({ open, onClose, title, onSelect, excludedIds, includeUnpublished }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { t: tSearch } = useTranslation("translation", {
    keyPrefix: "commandSearch",
  });
  const [query, setQuery] = React.useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const trimmed = debouncedQuery.trim();

  const searchQ = useQuery({
    ...queryArtists({ name: trimmed, take: 10, includeUnpublished }),
    enabled: open && trimmed.length >= 2,
  });

  const close = React.useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const sections = React.useMemo<CommandSearchSection[]>(() => {
    if (!open || trimmed.length < 2) return [];
    const items = (searchQ.data?.results ?? [])
      .filter((artist) => !excludedIds?.includes(artist.id))
      .map((artist) => ({
        key: `artist-${artist.id}`,
        node: (
          <span className="flex items-center gap-2">
            <ArtistAvatar artist={artist} />
            {artist.name}
          </span>
        ),
        onSelect: () => {
          onSelect(artist);
          close();
        },
      }));
    return items.length > 0
      ? [{ category: tSearch("categoryArtists"), items }]
      : [];
  }, [open, trimmed, searchQ.data, excludedIds, onSelect, close, tSearch]);

  return (
    <CommandSearch
      open={open}
      onClose={close}
      title={title}
      placeholder={t("searchArtistsPlaceholder")}
      query={query}
      onQueryChange={setQuery}
      sections={sections}
      isLoading={searchQ.isFetching}
    />
  );
};

export default ArtistSearchDialog;
