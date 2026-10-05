import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import ArtistSlugInput from "components/common/SlugInput";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";

const WelcomeUrlSlugStep: React.FC<{
  artistId?: number;
  isLoading: boolean;
  onGoToArtistPage: () => void;
}> = ({ artistId, isLoading, onGoToArtistPage }) => {
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });
  const { watch } = useFormContext<{ urlSlug: string }>();
  const slugInputRef = React.useRef<{ focus: () => void }>(null);
  const urlSlug = watch("urlSlug");

  React.useEffect(() => {
    slugInputRef.current?.focus();
  }, []);

  return (
    <>
      <FormComponent>
        <label htmlFor="input-slug">{t("showInTheURL")}</label>
        <small id="description-slug">
          <Trans
            i18nKey="thisWillLookLikeURL"
            t={t}
            components={{
              span: (
                <span className="font-bold p-1 bg-(--mi-tint-x-color)"></span>
              ),
            }}
            values={{
              url: `${window.location.host}/${urlSlug}`,
            }}
          />
        </small>
        <ArtistSlugInput
          ariaDescribedBy="description-slug"
          id="input-slug"
          ref={slugInputRef}
          type="artist"
          currentArtistId={artistId}
        />
      </FormComponent>

      <Button isLoading={isLoading} type="submit" endIcon={<FaArrowRight />}>
        {t("customizeYourPage")}
      </Button>

      <Button
        type="button"
        variant="outlined"
        endIcon={<FaArrowRight />}
        className="mt-4"
        disabled={isLoading}
        onClick={onGoToArtistPage}
      >
        {t("takeMeToTheArtistPage")}
      </Button>
    </>
  );
};

export default WelcomeUrlSlugStep;
