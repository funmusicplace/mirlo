import React from "react";
import { useTranslation } from "react-i18next";
import { normalizeArtistName } from "utils/artist";

export const useCreditAlbumArtist = (
  trackGroup: TrackGroup | undefined,
  preScanResult: PreScanResult | null
) => {
  const profileName = trackGroup?.artist?.name ?? "";
  const fileAlbumArtist = preScanResult?.albumMeta.albumArtist?.trim() ?? "";
  const canCreditAlbumArtist =
    !!fileAlbumArtist &&
    !!profileName &&
    normalizeArtistName(fileAlbumArtist) !== normalizeArtistName(profileName);
  const [creditAlbumArtist, setCreditAlbumArtist] = React.useState(true);

  React.useEffect(() => {
    setCreditAlbumArtist(true);
  }, [preScanResult]);

  const existingReleaseArtists = [...(trackGroup?.trackGroupArtists ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      artistName: entry.artistName,
      artistId: entry.artistId,
    }));

  const trackGroupArtistsToSave =
    canCreditAlbumArtist && creditAlbumArtist
      ? [
          ...existingReleaseArtists,
          ...(existingReleaseArtists.some(
            (entry) =>
              normalizeArtistName(entry.artistName) ===
              normalizeArtistName(fileAlbumArtist)
          )
            ? []
            : [{ artistName: fileAlbumArtist, artistId: null }]),
        ]
      : undefined;

  return {
    profileName,
    fileAlbumArtist,
    canCreditAlbumArtist,
    creditAlbumArtist,
    setCreditAlbumArtist,
    trackGroupArtistsToSave,
  };
};

const CreditAlbumArtistField: React.FC<{
  fileAlbumArtist: string;
  profileName: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ fileAlbumArtist, profileName, checked, onChange }) => {
  const { t } = useTranslation("translation", { keyPrefix: "zipImport" });
  return (
    <>
      <label
        htmlFor="input-credit-album-artist"
        className="flex items-baseline gap-2 mt-1"
      >
        <input
          type="checkbox"
          id="input-credit-album-artist"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby="hint-credit-album-artist"
        />
        {t("creditReleaseTo", { name: fileAlbumArtist })}
      </label>
      <small
        id="hint-credit-album-artist"
        className="block ms-5 text-xs text-(--mi-lighter-foreground-color)"
      >
        {t("creditReleaseToHint", { profile: profileName })}
      </small>
    </>
  );
};

export default CreditAlbumArtistField;
