import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";

import ArtistSearchDialog, { ArtistAvatar } from "./ArtistSearchDialog";

const FeaturedArtistsSelector: React.FC<{
  value: Artist[];
  onChange: (artists: Artist[]) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-1 m-0 p-0 list-none">
          {value.map((artist) => (
            <li
              key={artist.id}
              className="flex items-center justify-between gap-2 border border-(--mi-tint-x-color) rounded p-2"
            >
              <span className="flex items-center gap-2">
                <ArtistAvatar artist={artist} />
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
      <ArtistSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("addFeaturedArtist")}
        excludedIds={value.map((artist) => artist.id)}
        onSelect={(artist) => onChange([...value, artist])}
      />
    </div>
  );
};

export default FeaturedArtistsSelector;
