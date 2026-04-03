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
      <Table
        className={
          "my-8 " +
          css`
            a {
              white-space: nowrap;
            }
          `
        }
      >
        <thead>
          <tr>
            <th aria-label="Avatar"></th>
            <th>{t("artist")}</th>
            <th>{t("manage")}</th>
            {/* <th>{t("manage")}</th> */}
            <th>{t("canLabelAddReleases")}</th>
            <th>{t("isArtistConfirmed")}</th>
            <th>{t("isLabelConfirmed")}</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {relationships.map((relationship, idx) => (
            <tr key={relationship.artist.id}>
              <td>
                <img
                  src={relationship.artist.avatar?.sizes?.[120]}
                  className="w-10 h-10 object-cover flex-shrink-0"
                />
              </td>
              <td>{relationship.artist.name}</td>

              <td>
                {relationship.canLabelManageArtist ? (
                  <>
                    <Link to={getArtistManageUrl(relationship.artist.id)}>
                      {t("manage")}
                    </Link>
                  </>
                ) : (
                  t("askArtist")
                )}
              </td>
              <td>
                {relationship.canLabelAddReleases ? <MdCheckBox /> : null}
              </td>
              <td>
                {relationship.isArtistApproved ? (
                  <MdCheckBox />
                ) : (
                  t("askArtist")
                )}
              </td>
              <td>
                <Toggle
                  toggled={relationship.isLabelApproved}
                  onClick={() => {
                    const newValue = !fields[idx].isLabelApproved;
                    setValue(`relationships.${idx}.isLabelApproved`, newValue);
                    handleConfirm(fields[idx].artistId, newValue);
                  }}
                  label={t("showOnPage")}
                />
              </td>
              <td className="justify-end! flex gap-2">
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
              </td>
            </tr>
          ))}
          {relationships.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="text-center py-4! bg-(--mi-darken-background-color)"
              >
                {t("noArtists")}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
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
      <Table
        className={
          "my-8 " +
          css`
            a {
              white-space: nowrap;
            }
          `
        }
      >
        <thead>
          <tr>
            <th aria-label="Avatar"></th>
            <th>{t("artist")}</th>
            <th aria-label="actions"></th>
          </tr>
        </thead>
        <tbody>
          {filteredArtists.map((artist, idx) => (
            <tr key={artist.id}>
              <td>
                <img
                  src={artist.avatar?.sizes?.[120]}
                  className="w-10 h-10 object-cover flex-shrink-0"
                />
              </td>
              <td>{artist.name}</td>
              <td className="justify-end! flex gap-2">
                <ButtonLink size="compact" to={getArtistUrl(artist)}>
                  {t("viewPage")}
                </ButtonLink>

                <Button
                  size="compact"
                  onClick={() => onAddArtistToRoster(artist.id)}
                >
                  {t("addToRoster")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
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
      <div className="flex gap-2 flex-col">
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
        <ProfileSection>
          <div className="flex justify-between items-center">
            <h2>{t("managePayment")}</h2>
            <div className="flex gap-2">
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
