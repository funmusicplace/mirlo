import React from "react";
import Button from "./Button";
import Modal from "./Modal";
import SpaceBetweenDiv from "./SpaceBetweenDiv";
import api from "services/api";
import { Controller, FormProvider, useForm } from "react-hook-form";
import SupportArtistPopUpTiers from "./SupportArtistPopUpTiers";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import FollowArtist from "./FollowArtist";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryUserStripeStatus } from "queries";

const SupportArtistPopUp: React.FC<{ artist: Artist }> = ({ artist }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const methods = useForm<{
    tier: {
      id: number;
      name: string;
      description: string;
      isDefaultTier: boolean;
    };
    email: string;
  }>();

  const { user, refreshLoggedInUser } = useAuthContext();
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();

  const { data: artistDetails } = useQuery(queryArtist(artist.urlSlug ?? "", true));
  const { data: stripeAccountStatus } = useQuery(queryUserStripeStatus(artist.userId));

  const options = artistDetails?.subscriptionTiers ?? [];

  React.useEffect(() => {
    if (isOpen) {
      const foundTier = user?.artistUserSubscriptions?.find(
        (sub) => sub.artistSubscriptionTier.artistId === artist.id
      )?.artistSubscriptionTier;
      if (foundTier) {
        methods.setValue("tier", foundTier);
      }
    }
  }, [
    artist.id,
    isOpen,
    methods,
    user?.artistUserSubscriptions,
  ]);

  const subscribeToTier = async () => {
    try {
      setIsCheckingForSubscription(true);
      const tier = methods.getValues("tier");
      const email = methods.getValues("email");
      if (!tier.isDefaultTier) {
        const response = await api.post<
          { tierId: number; email: string },
          { sessionUrl: string }
        >(`artists/${artist.id}/subscribe`, {
          tierId: tier.id,
          email,
        });
        window.location.assign(response.sessionUrl);
      } else {
        await api.post(`artists/${artist.id}/follow`, {
          email,
        });
      }
      if (!user) {
        snackbar("We've sent you a verification email!", { type: "success" });
      }
    } catch (e) {
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsCheckingForSubscription(false);
      refreshLoggedInUser();
      setIsOpen(false);
    }
  };

  const value = methods.watch("tier");

  if (!stripeAccountStatus?.chargesEnabled) {
    return <FollowArtist artistId={artist.id} />;
  }

  return (
    <>
      <Button variant="big" onClick={() => setIsOpen(true)}>
        {t("subscribeToArtist", { artist: artist.name })}
      </Button>
      <Modal
        title={t("supportArtist", { artist: artist.name }) ?? ""}
        open={isOpen}
        size="small"
        onClose={() => setIsOpen(false)}
      >
        <SpaceBetweenDiv>
          <div>{t("chooseATier")}</div>
        </SpaceBetweenDiv>
        <FormProvider {...methods}>
          <Controller
            name="tier"
            control={methods.control}
            render={({ ...props }) => (
              <SupportArtistPopUpTiers {...props} options={options} />
            )}
          />
          {!user && (
            <FormComponent>
              {t("email")}
              <InputEl {...methods.register("email")} type="email" required />
            </FormComponent>
          )}
        </FormProvider>
        <Button
          onClick={() => subscribeToTier()}
          isLoading={isCheckingForSubscription}
          disabled={!methods.formState.isValid}
          wrap
        >
          {t("continueWithName", { name: value?.name })}
        </Button>
      </Modal>
    </>
  );
};

export default SupportArtistPopUp;
