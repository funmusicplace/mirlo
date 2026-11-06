import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import Button from "components/common/Button";
import Table from "components/common/Table";
import { queryArtistLabels, queryManagedArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";

import ArtistLabels from "./ArtistLabels";
import RemoveLabelButton from "./RemoveLabelButton";

const LabelConfirmation: React.FC = () => {
  const { artistId } = useParams();

  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const {
    data: artist,
    isPending: isArtistLoading,
    refetch,
  } = useQuery(queryManagedArtist(Number(artistId)));

  const { data: labelRelationships, refetch: refetchLabels } = useQuery(
    queryArtistLabels(Number(artistId))
  );

  const acceptLabel = async (labelUserId: number) => {
    await api.put(`manage/artists/${artistId}/labels/${labelUserId}`, {
      isArtistApproved: true,
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
      {labelRelationships && (
        <>
          <h2 id="labels">{t("labelsAndCollectives")}</h2>
          <p>{t("labelsAndCollectivesDescription")}</p>

          {labelRelationships.length > 0 && (
            <div
              className={css`
                overflow-x: auto;
              `}
            >
              <Table>
                <thead>
                  <tr>
                    <th>{t("name")}</th>
                    <th>{t("email")}</th>
                    <th>{t("isLabelConfirmed")}</th>
                    <th>{t("canLabelManageArtist")}</th>
                    <th>{t("canLabelAddReleases")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {labelRelationships.map((relationship) => (
                    <tr key={relationship.labelUserId}>
                      <td>{relationship.labelUser.name}</td>
                      <td>{relationship.labelUser.email}</td>
                      <td>
                        {relationship.isLabelApproved ? t("yes") : t("no")}
                      </td>
                      <td>
                        {relationship.canLabelManageArtist ? t("yes") : t("no")}
                      </td>
                      <td>
                        {relationship.canLabelAddReleases ? t("yes") : t("no")}
                      </td>
                      <td className="flex gap-2">
                        {!relationship.isArtistApproved && (
                          <Button
                            size="compact"
                            onClick={() =>
                              acceptLabel(relationship.labelUserId)
                            }
                          >
                            {t("acceptLabel")}
                          </Button>
                        )}
                        <RemoveLabelButton
                          side="artist"
                          artistId={artist.id}
                          labelUserId={relationship.labelUserId}
                          artistName={artist.name}
                          labelName={relationship.labelUser.name}
                          onRemoved={() => {
                            refetch();
                            refetchLabels();
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}
      <ArtistLabels refetch={refetch} />
    </Box>
  );
};

export default LabelConfirmation;
