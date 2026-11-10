import { ArtistButton } from "components/Artist/ArtistButtons";
import { useUpdateFundraiserMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { getFundraiserUrl } from "utils/artist";

const FundraiserPublicButton: React.FC<{
  artist: { id: number; urlSlug?: string };
  fundraiser: Pick<Fundraiser, "id" | "urlSlug" | "isPublic">;
}> = ({ artist, fundraiser }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { mutateAsync: updateFundraiser, isPending } =
    useUpdateFundraiserMutation();

  const toggle = async () => {
    try {
      await updateFundraiser({
        fundraiserId: fundraiser.id,
        body: { isPublic: !fundraiser.isPublic },
      });
      snackbar(t(fundraiser.isPublic ? "madePrivate" : "madePublic"), {
        type: "success",
      });
    } catch (e) {
      errorHandler(e);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ArtistButton
        type="button"
        onClick={toggle}
        isLoading={isPending}
        disabled={isPending}
        startIcon={fundraiser.isPublic ? <FaEyeSlash /> : <FaEye />}
      >
        {t(fundraiser.isPublic ? "makePrivate" : "makePublic")}
      </ArtistButton>
      {fundraiser.isPublic && (
        <Link to={getFundraiserUrl(artist, fundraiser)}>{t("viewPage")}</Link>
      )}
    </div>
  );
};

export default FundraiserPublicButton;
