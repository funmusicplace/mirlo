import React from "react";
import Button from "./Button";
import Modal from "./Modal";
import SpaceBetweenDiv from "./SpaceBetweenDiv";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { Controller, FormProvider, useForm } from "react-hook-form";
import SupportArtistPopUpTiers from "./SupportArtistPopUpTiers";
import { useSnackbar } from "state/SnackbarContext";
import { checkArtistStripeStatus } from "state/ArtistContext";
import { useTranslation } from "react-i18next";

const SupportArtistPopUp: React.FC<{ artist: Artist }> = ({ artist }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] =
    React.useState<AccountStatus>();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const methods = useForm<{
    tier: {
      id: number;
      name: string;
      description: string;
      isDefaultTier: boolean;
    };
  }>();
  const [options, setOptions] = React.useState<
    { name: string; id: number; description: string }[]
  >([]);

  const {
    state: { user },
    refreshLoggedInUser,
  } = useGlobalStateContext();
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();

  React.useEffect(() => {
    const checkStripe = async () => {
      const status = await checkArtistStripeStatus(artist.userId);
      if (status) {
        setStripeAccountStatus(status.result);
      }
    };
    const callback = async () => {
      const artistDetails = await api.get<Artist>(
        `artists/${artist.id}/?includeDefaultTier=true`
      );

      setOptions(artistDetails.result.subscriptionTiers);

      const foundTier = user?.artistUserSubscriptions?.find(
        (sub) => sub.artistSubscriptionTier.artistId === artist.id
      )?.artistSubscriptionTier;
      if (foundTier) {
        methods.setValue("tier", foundTier);
      }
    };

    checkStripe();
    if (isOpen) {
      callback();
    }
  }, [
    artist.id,
    artist.userId,
    isOpen,
    methods,
    user?.artistUserSubscriptions,
  ]);

  const subscribeToTier = async () => {
    try {
      setIsCheckingForSubscription(true);
      const tier = methods.getValues("tier");

      if (!tier.isDefaultTier) {
        const response = await api.post<
          { tierId: number },
          { sessionUrl: string }
        >(`artists/${artist.id}/subscribe`, {
          tierId: tier.id,
        });
        window.location.assign(response.sessionUrl);
      } else {
        await api.post(`artists/${artist.id}/follow`, {});
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

  if (!stripeAccountStatus?.chargesEnabled || !user) {
    return null;
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
        </FormProvider>
        <Button
          onClick={() => subscribeToTier()}
          isLoading={isCheckingForSubscription}
        >
          {t("continueWithName", { name: value?.name })}
        </Button>
      </Modal>
    </>
  );
};

export default SupportArtistPopUp;
