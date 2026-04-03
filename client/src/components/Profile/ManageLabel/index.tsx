import { useQuery } from "@tanstack/react-query";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import WidthContainer from "components/common/WidthContainer";
import { queryLabelArtists, queryManagedArtists } from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { MdCheckBox } from "react-icons/md";
import { Link } from "react-router-dom";
import { getArtistManageUrl, getArtistUrl } from "utils/artist";
import AddArtistToRoster from "./AddArtistToRoster";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import Button, { ButtonLink } from "components/common/Button";
import { FaChevronRight, FaEdit } from "react-icons/fa";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { css } from "@emotion/css";
import { ProfileSection } from "..";
import { NewAlbumButton } from "components/ManageArtist/NewAlbumButton";
import StripeStatus from "components/common/stripe/StripeStatusAndButton";

type Relationship = {
  artist: {
    id: number;
    userId: number;
    name: string;
    avatar?: {
      sizes?: {
        [key: number]: string;
      };
    };
  };
  isLabelApproved: boolean;
  isArtistApproved: boolean;
  canLabelManageArtist: boolean;
  canLabelAddReleases: boolean;
  artistId: number;
};

const RelationshipsTable: React.FC = () => {
  const { data: { results: relationships } = { results: [] }, refetch } =
    useQuery(queryLabelArtists());
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "label" });
  const { control, setValue } = useForm<{
    relationships: Relationship[];
  }>({
    defaultValues: {
      relationships,
    },
  });
  const { fields } = useFieldArray({
    control,
    name: "relationships",
  });

  const handleConfirm = async (artistId: number, newValue: boolean) => {
    if (!user) {
      return;
    }
    await api.put(`manage/label/artists/${artistId}`, {
      isLabelApproved: newValue,
      labelUserId: user.id,
    });
    refetch();
  };

  React.useEffect(() => {
    if (relationships) {
      setValue("relationships", relationships);
    }
  }, [relationships, setValue]);

  return (
    <>
      <h3>{t("artistsOnYourRoster")}</h3>
      <div className="my-8 space-y-1 divide-y-1 divide-(--mi-darken-background-color)">
        {relationships.length === 0 ? (
          <div className="text-center py-4 bg-(--mi-darken-background-color) rounded">
            {t("noArtists")}
          </div>
        ) : (
          <>
            <div className="hidden md:flex flex-col md:flex-row md:items-center gap-4 p-3 md:p-1 md:px-3 bg-(--mi-darken-background-color) text-xs">
              <div className="flex-1 col-span-2">{t("artist")}</div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-3 items-center">
                <div>{t("manage")}</div>
                <div>{t("canLabelAddReleases")}</div>
                <div>{t("isArtistConfirmed")}</div>
                <div>{t("showOnRoster")}</div>
                <div className="col-span-2 text-right">{t("actions")}</div>
              </div>
            </div>
            {relationships.map((relationship, idx) => (
              <div
                key={relationship.artist.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-3 md:p-1 md:px-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={relationship.artist.avatar?.sizes?.[120]}
                    className="w-10 h-10 object-cover flex-shrink-0 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{relationship.artist.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-3">
                  <div className="flex flex-col gap-1 justify-center">
                    <label className="md:sr-only text-sm opacity-70">
                      {t("manage")}
                    </label>
                    {relationship.canLabelManageArtist ? (
                      <Link to={getArtistManageUrl(relationship.artist.id)}>
                        {t("manage")}
                      </Link>
                    ) : (
                      <span>{t("askArtist")}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 justify-center">
                    <label
                      id="canLabelAddReleases"
                      className="md:sr-only text-sm opacity-70"
                    >
                      {t("canLabelAddReleases")}
                    </label>
                    <div aria-labelledby="canLabelAddReleases">
                      {relationship.canLabelAddReleases ? <MdCheckBox /> : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 justify-center">
                    <label
                      id="isArtistConfirmed"
                      className="md:sr-only text-sm opacity-70"
                    >
                      {t("isArtistConfirmed")}
                    </label>
                    <div aria-labelledby="isArtistConfirmed">
                      {relationship.isArtistApproved ? (
                        <MdCheckBox />
                      ) : (
                        <span className="text-sm">{t("askArtist")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 justify-center">
                    <label
                      id="isLabelConfirmed"
                      className="md:sr-only text-sm opacity-70"
                    >
                      {t("isLabelConfirmed")}
                    </label>
                    <Toggle
                      id="isLabelConfirmed"
                      labelId="isLabelConfirmed"
                      toggled={relationship.isLabelApproved}
                      onClick={() => {
                        const newValue = !fields[idx].isLabelApproved;
                        setValue(
                          `relationships.${idx}.isLabelApproved`,
                          newValue
                        );
                        handleConfirm(fields[idx].artistId, newValue);
                      }}
                      labelClassName="text-sm"
                      label={t("showOnPage")}
                    />
                  </div>

                  <div
                    className="col-span-2 items-end md:items-center justify-end 
                 flex flex-col md:flex-row gap-2"
                  >
                    {relationship.canLabelManageArtist && (
                      <NewAlbumButton artist={relationship.artist} />
                    )}
                    <ButtonLink
                      size="compact"
                      variant="link"
                      to={getArtistUrl(relationship.artist)}
                    >
                      {t("viewPage")}
                    </ButtonLink>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <AddArtistToRoster refresh={refetch} />
    </>
  );
};

const OtherArtistsTable: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "label" });
  const { user } = useAuthContext();

  const { data: { results: relationships } = { results: [] }, refetch } =
    useQuery(queryLabelArtists());
  const {
    data: { results: managedArtists } = {},
    isLoading,
    refetch: refetchManagedArtists,
  } = useQuery(queryManagedArtists());

  const filteredArtists = React.useMemo(() => {
    return managedArtists?.filter((artist) => {
      if (artist.isLabelProfile) {
        return false;
      }
      const isInRelationships = relationships?.some(
        (relationship) => relationship.artist.id === artist.id
      );
      return !isInRelationships;
    });
  }, [managedArtists, relationships]);

  const onAddArtistToRoster = React.useCallback(
    async (artistId: number) => {
      try {
        if (user?.id) {
          await api.post(`manage/artists/${artistId}/labels`, {
            labelUserId: user.id,
            isLabelApproved: true,
          });
          refetchManagedArtists();
          refetch();
        }
      } catch (e) {
        refetchManagedArtists();
        refetch();
      }
    },
    [user?.id]
  );

  if (isLoading) {
    return null;
  }

  if (!filteredArtists || filteredArtists?.length === 0) {
    return null;
  }

  return (
    <ProfileSection>
      <h3>{t("otherArtists")}</h3>
      <p>{t("otherArtistsDescription")}</p>
      <div className="my-8 space-y-1 divide-y-1 divide-(--mi-darken-background-color)">
        <div className="flex text-sm flex-col md:flex-row md:items-center gap-4 p-1 bg-(--mi-darken-background-color) rounded">
          <div>{t("artist")}</div>

          <div className="text-end">{t("actions")}</div>
        </div>
        {filteredArtists.map((artist, idx) => (
          <div
            key={artist.id}
            className="flex flex-col md:flex-row md:items-center gap-4 p-1 bg-(--mi-darken-background-color) rounded"
          >
            {/* Avatar & Name */}
            <div className="flex items-center gap-3 flex-1">
              <img
                src={artist.avatar?.sizes?.[120]}
                className="w-10 h-10 object-cover flex-shrink-0 rounded"
              />
              <div className="flex-1">
                <p className="font-semibold">{artist.name}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-2">
              <ButtonLink size="compact" to={getArtistUrl(artist)}>
                {t("viewPage")}
              </ButtonLink>

              <Button
                size="compact"
                onClick={() => onAddArtistToRoster(artist.id)}
              >
                {t("addToRoster")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ProfileSection>
  );
};

const ProfileLabel: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const { user } = useAuthContext();

  if (!user) {
    return <p>{t("notALabel")}</p>;
  }

  const labelProfile = user.artists?.find((a) => a.isLabelProfile);

  if (!labelProfile) {
    return <p>{t("notALabel")}</p>;
  }

  return (
    <WidthContainer variant="big" justify="center">
      <div className="flex gap-2 flex-col p-4">
        <div className="flex justify-between items-center">
          <h1>{t("manageLabel")}</h1>
          <div className="flex flex-wrap gap-4">
            <ButtonLink
              to={getArtistManageUrl(labelProfile.id)}
              startIcon={<FaEdit />}
              size="compact"
              variant="dashed"
            >
              {t("editLabelProfile")}
            </ButtonLink>
            <ButtonLink
              to={`/${labelProfile?.urlSlug}`}
              endIcon={<FaChevronRight />}
              variant="link"
              size="compact"
            >
              {t("viewLabelPage")}
            </ButtonLink>
          </div>
        </div>
        <p>{t("manageLabelDescription")}</p>
        <p>
          <Trans
            t={t}
            i18nKey="linkToProfile"
            components={{
              link: <Link to={getArtistManageUrl(labelProfile.id)}></Link>,
            }}
          />
        </p>
        <ProfileSection>
          <h2>{t("manageArtists")}</h2>
          <RelationshipsTable />
        </ProfileSection>
        <OtherArtistsTable />
        <ProfileSection className="flex flex-col gap-2">
          <div className="gap-2 flex flex-col md:flex-row justify-between md:items-center">
            <h2>{t("managePayment")}</h2>
            <div className="flex gap-2 ">
              <ButtonLink variant="outlined" to="/sales" size="compact">
                {t("viewSalesPage")}
              </ButtonLink>
              <ButtonLink variant="outlined" to="/fulfillment" size="compact">
                {t("viewFulfillmentPage")}
              </ButtonLink>
            </div>
          </div>
          <StripeStatus />
        </ProfileSection>
      </div>
    </WidthContainer>
  );
};

export default ProfileLabel;
