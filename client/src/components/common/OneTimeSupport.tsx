import React from "react";
import Button from "./Button";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import { useForm } from "react-hook-form";
import api from "services/api";

interface FormData {
  chosenPrice: string;
  userEmail: string;
}

const OneTimeSupport: React.FC<{ artistId: number }> = ({ artistId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}` ?? "" })
  );

  const { user, refreshLoggedInUser } = useAuthContext();
  const localArtistId = artist?.id;

  const [isSupportPopUpOpen, setIsSupportPopUpOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const onSupportClick = React.useCallback(() => {
    setIsSupportPopUpOpen(true);
  }, [localArtistId, refreshLoggedInUser, user]);

  const onSubmitOneTimeSupport = React.useCallback(async (data: FormData) => {
    try {
      await api.post(`/artists/${localArtistId}/one-time-support`, {
        ...data,
      });
    } catch (e) {
      console.error("Something went wrong");
    }
  }, []);

  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `5`,
      userEmail: "",
    },
    reValidateMode: "onBlur",
  });

  console.log("artist", artist);
  if (!artist?.id) {
    return null;
  }

  return (
    <>
      <Modal
        size="small"
        open={isSupportPopUpOpen}
        onClose={() => setIsSupportPopUpOpen(false)}
        title={
          t("supportArtist", {
            artist: artist.name,
          }) ?? ""
        }
      >
        <form onSubmit={methods.handleSubmit(onSubmitOneTimeSupport)}>
          <FormComponent>
            {t("nameYourPrice", { currency: artist.user?.currency })}
            <InputEl
              {...methods.register("chosenPrice")}
              type="number"
              min={1}
            />
          </FormComponent>
          <Button
            variant="big"
            type="submit"
            disabled={!methods.formState.isValid}
          >
            {t("supportArtist", { artist: artist.name })}
          </Button>
        </form>
      </Modal>
      <Button
        compact
        transparent
        type="button"
        onClick={onSupportClick}
        isLoading={isLoading}
      >
        {t("oneTimeSupport")}
      </Button>
    </>
  );
};

export default OneTimeSupport;
