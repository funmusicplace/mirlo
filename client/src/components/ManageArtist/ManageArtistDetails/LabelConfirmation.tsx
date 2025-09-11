import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import { queryArtistLabels, queryManagedArtist } from "queries";
import React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import ArtistLabels from "./ArtistLabels";
import { css } from "@emotion/css";
import FeatureFlag from "components/common/FeatureFlag";

const LabelConfirmation: React.FC = () => {
  const { artistId } = useParams();

  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const {
    data: artist,
    isLoading: isArtistLoading,
    refetch,
  } = useQuery(queryManagedArtist(Number(artistId)));

  const { data: labelRelationships, refetch: refetchLabels } = useQuery(
    queryArtistLabels(Number(artistId))
  );

  const { control, setValue } = useForm<{ relationships: ArtistLabel[] }>({
    defaultValues: {
      relationships: labelRelationships,
    },
  });
  const { fields } = useFieldArray({
    control,
    name: "relationships",
  });

  React.useEffect(() => {
    if (labelRelationships) {
      setValue("relationships", labelRelationships);
    }
  }, [labelRelationships, setValue]);

  React.useEffect(() => {
    if (labelRelationships) {
      setValue("relationships", labelRelationships);
    }
  }, [labelRelationships, setValue]);

  const handleConfirm = async (labelUserId: number, newValue: boolean) => {
    await api.put(`manage/artists/${artistId}/labels/${labelUserId}`, {
      isArtistApproved: newValue,
    });
    refetch();
    refetchLabels();
  };

  if (isArtistLoading) {
    return (
      <Box variant="info">
        <LoadingBlocks />
      </Box>
    );
  }

  if (!artist) {
    return null;
  }

  return (
    <Box
      className={css`
        margin-top: 1rem;

        p {
          margin-bottom: 1rem;
        }

        img {
          border-radius: 50%;
        }
      `}
    >
      {fields && (
        <>
          <h2 id="labels">{t("labelsAndCollectives")}</h2>
          <p>{t("labelsAndCollectivesDescription")}</p>

          {fields.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <th />
                  <th>{t("name")}</th>
                  <th>{t("email")}</th>
                  <th>{t("isLabelConfirmed")}</th>
                  <th>{t("isArtistConfirmed")}</th>
                  <th>{t("canLabelManageArtist")}</th>
                  <th>{t("canLabelAddReleases")}</th>
                </tr>
              </thead>
              <tbody>
                {fields?.map((relationship, idx) => (
                  <tr key={relationship.labelUser.id}>
                    <td>
                      {relationship.labelUser.userAvatar && (
                        <img
                          src={relationship.labelUser.userAvatar.sizes[60]}
                          width={30}
                          height={30}
                        />
                      )}
                    </td>
                    <td>{relationship.labelUser.name}</td>
                    <td>{relationship.labelUser.email}</td>
                    <td>{relationship.isLabelApproved ? "Yes" : "No"}</td>
                    <td>
                      <Toggle
                        toggled={fields[idx].isArtistApproved}
                        onClick={() => {
                          const newValue = !fields[idx].isArtistApproved;
                          setValue(
                            `relationships.${idx}.isArtistApproved`,
                            newValue
                          );
                          handleConfirm(fields[idx].labelUserId, newValue);
                        }}
                        label={t("confirmRelationship")}
                      />
                    </td>
                    <td>{relationship.canLabelManageArtist ? "Yes" : "No"}</td>
                    <td>{relationship.canLabelAddReleases ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
      <ArtistLabels refetch={refetch} />
    </Box>
  );
};

export default LabelConfirmation;
