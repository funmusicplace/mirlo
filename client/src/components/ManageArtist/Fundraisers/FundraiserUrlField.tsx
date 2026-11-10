import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { useUpdateFundraiserMutation } from "queries";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { getFundraiserUrl } from "utils/artist";

const FundraiserUrlField: React.FC<{
  artist: { id: number; urlSlug?: string };
  fundraiser: Pick<Fundraiser, "id" | "urlSlug" | "isPublic">;
}> = ({ artist, fundraiser }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isOpen, setIsOpen] = React.useState(false);
  const { mutateAsync: updateFundraiser, isPending } =
    useUpdateFundraiserMutation();
  const { register, handleSubmit, reset, setError, formState } = useForm<{
    urlSlug: string;
  }>({ values: { urlSlug: fundraiser.urlSlug ?? "" } });

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const onSubmit = async ({ urlSlug }: { urlSlug: string }) => {
    try {
      await updateFundraiser({
        fundraiserId: fundraiser.id,
        body: { urlSlug },
      });
      snackbar(t("urlSaved"), { type: "success" });
      setIsOpen(false);
    } catch (e) {
      if (e instanceof MirloFetchError && e.status === 400) {
        setError("urlSlug", { message: t("urlSlugTaken") });
      } else {
        errorHandler(e);
      }
    }
  };

  return (
    <>
      <small>
        {t("urlWillBe")}
        <ArtistButton
          type="button"
          variant="link"
          size="compact"
          className="self-start text-left text-xs"
          onClick={() => setIsOpen(true)}
        >
          {window.location.origin}${getFundraiserUrl(artist, fundraiser)}
        </ArtistButton>
      </small>
      <Modal open={isOpen} onClose={close} size="small" title={t("urlSlug")}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
          <FormComponent>
            <label htmlFor="input-fundraiser-url-slug">{t("urlSlug")}</label>
            <InputEl
              id="input-fundraiser-url-slug"
              aria-describedby="error-fundraiser-url-slug"
              required
              {...register("urlSlug", { required: true })}
            />
            {formState.errors.urlSlug?.message && (
              <small className="error" id="error-fundraiser-url-slug">
                {formState.errors.urlSlug.message}
              </small>
            )}
            {fundraiser.isPublic && (
              <small className="text-(--mi-warning-color)">
                {t("urlSlugWarning")}
              </small>
            )}
          </FormComponent>
          <div>
            <ArtistButton type="submit" isLoading={isPending}>
              {t("saveUrl")}
            </ArtistButton>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default FundraiserUrlField;
