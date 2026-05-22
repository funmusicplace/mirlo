import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { queryManagedMerch } from "queries";
import React from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaPen, FaPlus } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import countryCodesCurrencies from "./country-codes-currencies";
import DashedList from "./DashedList";
import DestinationListItem from "./DestinationListItem";

const P = styled.p`
  margin: 0.25rem 0 0.5rem;
`;

type DestinationForm = {
  destinations: Partial<ShippingDestination>[];
};

const currencyToCountryMap = countryCodesCurrencies.reduce(
  (aggr, country) => {
    aggr[country.currencyCode] = country;
    return aggr;
  },
  {} as { [key: string]: any }
);

const countryNameToCodeMap = countryCodesCurrencies.reduce(
  (aggr, country) => {
    aggr[country.countryName.toLowerCase()] = country.countryCode;
    return aggr;
  },
  {} as { [key: string]: string }
);

export const countryNameToCode = (name?: string | null) => {
  if (!name) return undefined;
  return countryNameToCodeMap[name.trim().toLowerCase()];
};

const MerchDestinations: React.FC<{ artist?: Artist }> = ({ artist }) => {
  const { merchId: merchParamId } = useParams();
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const [isEditing, setIsEditing] = React.useState(false);
  const { user } = useAuthContext();

  const { data: merch, refetch } = useQuery(
    queryManagedMerch(merchParamId ?? "")
  );

  const artistCountryCode = React.useMemo(() => {
    for (const tag of artist?.artistLocationTags ?? []) {
      const code = countryNameToCode(tag.locationTag?.country);
      if (code) return code;
    }
    return undefined;
  }, [artist]);

  const defaultHomeCountry =
    artistCountryCode ??
    (user?.currency
      ? currencyToCountryMap[user.currency]?.countryCode
      : undefined);

  const methods = useForm<DestinationForm>({
    defaultValues: {
      destinations: merch?.shippingDestinations.map((dest) => ({
        ...dest,
        homeCountry: (
          dest.homeCountry ||
          defaultHomeCountry ||
          ""
        ).toUpperCase(),
        costUnit: dest.costUnit / 100,
        costExtraUnit: dest.costExtraUnit / 100,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: `destinations`,
  });

  const update = React.useCallback(
    async (newDestinations: DestinationForm) => {
      const packet = newDestinations.destinations.map((dest) => ({
        ...dest,
        costUnit: Number(dest.costUnit) * 100,
        costExtraUnit: Number(dest.costExtraUnit) * 100,
      }));
      try {
        await api.put(`manage/merch/${merchParamId}/destinations`, packet);
        refetch();
        snackbar(t("updatedShippingDestinations"), { type: "success" });
      } catch (e) {
        console.error("e", e);
      }
    },
    [merchParamId, refetch]
  );

  return (
    <>
      <h2
        className={css`
          margin-top: 3rem;
        `}
      >
        {t("shippingDestinationPrices")}
      </h2>
      <P>{t("setDifferentCostPerDestination")}</P>

      <form
        onSubmit={methods.handleSubmit(update)}
        className={css`
          width: 100%;
          margin-top: 0.75rem;
        `}
      >
        <FormProvider {...methods}>
          <DashedList>
            {fields?.map((dest, index) => (
              <DestinationListItem
                dest={dest}
                key={dest.id}
                isEditing={isEditing}
                index={index}
                currency={merch?.currency ?? "usd"}
                onRemove={() => remove(index)}
              />
            ))}
          </DashedList>
        </FormProvider>
        <div
          className={css`
            margin-top: 1rem;
            display: flex;
            justify-content: space-between;
          `}
        >
          {!isEditing && (
            <ArtistButton
              startIcon={<FaPen />}
              onClick={() => setIsEditing(true)}
              className={css`
                justify-self: flex-start;
              `}
            >
              {t("edit")}
            </ArtistButton>
          )}
          {isEditing && (
            <>
              <ArtistButton
                wrap
                onClick={() => {
                  append({
                    destinationCountry: null,
                    homeCountry: defaultHomeCountry,
                  });
                }}
                type="button"
                size="compact"
                startIcon={<FaPlus />}
                variant="dashed"
              >
                {t("addNewShippingDestination")}
              </ArtistButton>
              <ArtistButton>{t("saveDestinations")}</ArtistButton>
            </>
          )}
        </div>
      </form>
    </>
  );
};

export default MerchDestinations;
