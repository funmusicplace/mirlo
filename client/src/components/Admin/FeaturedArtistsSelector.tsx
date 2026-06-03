import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import CommandSearch, {
  CommandSearchSection,
} from "components/common/CommandSearch/CommandSearch";
import { queryArtists } from "queries/artists";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { useDebounce } from "use-debounce";

const FeaturedArtistsSelector: React.FC<{
  value: Artist[];
  onChange: (artists: Artist[]) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { t: tSearch } = useTranslation("translation", {
    keyPrefix: "commandSearch",
  });
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const trimmed = debouncedQuery.trim();

  const searchQ = useQuery({
    ...queryArtists({ name: trimmed, take: 10 }),
    enabled: open && trimmed.length >= 2,
  });

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const sections = React.useMemo<CommandSearchSection[]>(() => {
    if (!open || trimmed.length < 2) return [];
    const items = (searchQ.data?.results ?? [])
      .filter((a) => !value.some((sel) => sel.id === a.id))
      .map((a) => ({
        key: `artist-${a.id}`,
        node: (
          <span className="flex items-center gap-2">
            {a.avatar?.sizes?.[60] ? (
              <img
                src={a.avatar.sizes[60]}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="w-6 h-6 rounded-full bg-(--mi-darken-background-color) shrink-0" />
            )}
            {a.name}
          </span>
        ),
        onSelect: () => {
          onChange([...value, a]);
          setOpen(false);
        },
      }));
    return items.length > 0
      ? [{ category: tSearch("categoryArtists"), items }]
      : [];
  }, [open, trimmed, searchQ.data, value, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-1 m-0 p-0 list-none">
          {value.map((artist) => (
            <li
              key={artist.id}
              className="flex items-center justify-between gap-2 border border-(--mi-darken-background-color) rounded p-2"
            >
              <span className="flex items-center gap-2">
                {artist.avatar?.sizes?.[60] ? (
                  <img
                    src={artist.avatar.sizes[60]}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-(--mi-darken-background-color) shrink-0" />
                )}
                {artist.name}
              </span>
              <Button
                type="button"
                variant="dashed"
                startIcon={<FaTrash />}
                onClick={() =>
                  onChange(value.filter((a) => a.id !== artist.id))
                }
              >
                {t("removeFeaturedArtist")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="dashed" onClick={() => setOpen(true)}>
        {t("addFeaturedArtist")}
      </Button>
      <CommandSearch
        open={open}
        onClose={() => setOpen(false)}
        title={t("addFeaturedArtist")}
        placeholder={t("searchArtistsPlaceholder")}
        query={query}
        onQueryChange={setQuery}
        sections={sections}
        isLoading={searchQ.isFetching}
      />
    </div>
  );
};

export default FeaturedArtistsSelector;
