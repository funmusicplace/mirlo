import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import { queryInstanceArtist } from "queries/settings";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";

import ArtistSearchDialog, { ArtistAvatar } from "../ArtistSearchDialog";

import { FormSettings } from "./settingsForm";

const InstanceArtistSelector: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { watch, setValue } = useFormContext<FormSettings>();
  const artistId = watch("instanceCustomization.artistId");
  const { data: savedArtist, isSuccess: isSavedArtistLoaded } = useQuery(
    queryInstanceArtist()
  );
  const [chosenArtist, setChosenArtist] = React.useState<Artist>();
  const [open, setOpen] = React.useState(false);
  const shouldRestoreFocus = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const currentArtist = [chosenArtist, savedArtist].find(
    (artist) => artist && artistId && String(artist.id) === String(artistId)
  );

  const isSavedArtistMissing =
    !currentArtist && !!artistId && isSavedArtistLoaded && !savedArtist;

  React.useEffect(() => {
    if (shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      containerRef.current?.querySelector("button")?.focus();
    }
  }, [currentArtist, isSavedArtistMissing]);

  const chooseArtist = React.useCallback(
    (artist?: Artist) => {
      setChosenArtist(artist);
      shouldRestoreFocus.current = true;
      setValue(
        "instanceCustomization.artistId",
        artist ? String(artist.id) : "",
        { shouldDirty: true }
      );
    },
    [setValue]
  );

  const removeButton = (
    <Button
      type="button"
      variant="dashed"
      startIcon={<FaTrash />}
      onClick={() => chooseArtist(undefined)}
    >
      {t("removeInstanceArtist")}
    </Button>
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {currentArtist ? (
        <div className="flex items-center justify-between gap-2 border border-(--mi-tint-x-color) rounded p-2">
          <span className="flex items-center gap-2">
            <ArtistAvatar artist={currentArtist} />
            {currentArtist.name}
          </span>
          {removeButton}
        </div>
      ) : isSavedArtistMissing ? (
        <div className="flex items-center justify-between gap-2 border border-(--mi-tint-x-color) rounded p-2">
          <span>{t("instanceArtistMissing", { id: artistId })}</span>
          {removeButton}
        </div>
      ) : (
        <Button type="button" variant="dashed" onClick={() => setOpen(true)}>
          {t("chooseInstanceArtist")}
        </Button>
      )}
      <ArtistSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("chooseInstanceArtist")}
        includeUnpublished
        onSelect={chooseArtist}
      />
    </div>
  );
};

export default InstanceArtistSelector;
