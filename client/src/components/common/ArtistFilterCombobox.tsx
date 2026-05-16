import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaTimes } from "react-icons/fa";
import { useFilterableList } from "utils/useFilterableList";

import { InputEl } from "./Input";

interface ArtistFilterComboboxProps {
  artists: Artist[];
  selectedArtistId: number | null;
  onChange: (artistId: number | null) => void;
}

const getArtistSearchText = (a: Artist) => a.name;

const ArtistFilterCombobox: React.FC<ArtistFilterComboboxProps> = ({
  artists,
  selectedArtistId,
  onChange,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const {
    searchQuery,
    setSearchQuery,
    filtered: filteredArtists,
  } = useFilterableList(artists, getArtistSearchText);

  const selectedArtist =
    selectedArtistId != null
      ? (artists.find((a) => a.id === selectedArtistId) ?? null)
      : null;

  const closePanel = React.useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    toggleRef.current?.focus();
  }, [setSearchQuery]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        closePanel();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, closePanel]);

  React.useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  const handleSelect = (id: number | null) => {
    onChange(id);
    closePanel();
  };

  return (
    <div className="relative self-start" ref={wrapperRef}>
      <div className="inline-flex items-stretch border border-(--mi-tint-x-color) rounded bg-(--mi-button-tint-color) hover:border-(--mi-text-color)">
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 text-sm"
          aria-expanded={isOpen}
        >
          {selectedArtist?.avatar?.sizes?.[60] && (
            <img
              src={selectedArtist.avatar.sizes[60]}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          <span className="truncate max-w-48">
            {selectedArtist ? selectedArtist.name : t("filterByArtist")}
          </span>
          {!selectedArtist && <FaChevronDown className="opacity-60" />}
        </button>
        {selectedArtist && (
          <button
            type="button"
            onClick={() => handleSelect(null)}
            aria-label={t("clearFilter")}
            className="px-2 border-l border-(--mi-tint-x-color) opacity-60 hover:opacity-100"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-72 bg-(--mi-background-color) border border-(--mi-tint-x-color) rounded shadow-lg flex flex-col">
          <div className="p-2 border-b border-(--mi-tint-color)">
            <label htmlFor="input-artist-filter-search" className="sr-only">
              {t("searchArtists")}
            </label>
            <InputEl
              id="input-artist-filter-search"
              ref={searchInputRef}
              type="text"
              placeholder={t("searchArtists")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-(--mi-tint-color)">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2 hover:bg-(--mi-button-tint-color) text-sm flex items-center gap-2"
            >
              <span className="w-5 h-5" />
              <span className="italic">{t("allArtists")}</span>
            </button>
            {filteredArtists.length === 0 ? (
              <div className="px-3 py-2 text-sm text-(--mi-secondary-text-color)">
                {t("noResults")}
              </div>
            ) : (
              filteredArtists.map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => handleSelect(artist.id)}
                  className="w-full text-left px-3 py-2 hover:bg-(--mi-button-tint-color) text-sm flex items-center gap-2"
                >
                  {artist.avatar?.sizes?.[60] ? (
                    <img
                      src={artist.avatar.sizes[60]}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-(--mi-tint-color) shrink-0" />
                  )}
                  <span className="truncate">{artist.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistFilterCombobox;
