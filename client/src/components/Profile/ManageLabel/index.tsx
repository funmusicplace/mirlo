import { useQuery } from "@tanstack/react-query";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import WidthContainer from "components/common/WidthContainer";
import { queryLabelArtists } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { MdCheckBox } from "react-icons/md";
import { Link } from "react-router-dom";
import { getArtistManageUrl, getArtistUrl } from "utils/artist";
import AddArtistToRoster from "./AddArtistToRoster";
import { useFieldArray, useForm } from "react-hook-form";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import Button, { ButtonLink } from "components/common/Button";
import { FaChevronRight } from "react-icons/fa";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { css } from "@emotion/css";

const ProfileLabel: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "label" });
  const { data: { results: relationships } = { results: [] }, refetch } =
    useQuery(queryLabelArtists());
  const { user } = useAuthContext();

  const { control, setValue } = useForm<{ relationships: ArtistLabel[] }>({
    defaultValues: {
      relationships,
    },
  });
  const { fields, remove } = useFieldArray({
    control,
    name: "relationships",
  });

  React.useEffect(() => {
    if (relationships) {
      setValue("relationships", relationships);
    }
  }, [relationships, setValue]);

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

  if (!user) {
    return <p>{t("notALabel")}</p>;
  }

  return (
    <WidthContainer variant="big" justify="center">
      <SpaceBetweenDiv>
        <h2>{t("manageArtists")}</h2>
        <div
          className={css`
            display: flex;
            gap: 1rem;
          `}
        >
          <ButtonLink variant="outlined" to="/sales" size="compact">
            {t("viewSalesPage")}
          </ButtonLink>
          <ButtonLink variant="outlined" to="/fulfillment" size="compact">
            {t("viewFulfillmentPage")}
          </ButtonLink>
          <ButtonLink
            to={`/label/${user.urlSlug}`}
            endIcon={<FaChevronRight />}
            variant="link"
            size="compact"
          >
            {t("viewLabelPage")}
          </ButtonLink>
        </div>
      </SpaceBetweenDiv>
      <AddArtistToRoster refresh={refetch} />
      <Table>
        <thead>
          <tr>
            <th></th>
            <th>{t("artist")}</th>
            <th>{t("page")}</th>
            <th>{t("manage")}</th>
            {/* <th>{t("manage")}</th> */}
            {/* <th>{t("canLabelAddReleases")}</th> */}
            <th>{t("isArtistConfirmed")}</th>
            <th>{t("isLabelConfirmed")}</th>
          </tr>
        </thead>
        <tbody>
          {relationships.map((relationship, idx) => (
            <tr key={relationship.artist.id}>
              <td>
                <img src={relationship.artist.avatar?.sizes?.[60]} />
              </td>
              <td>{relationship.artist.name}</td>
              <td>
                <Link to={getArtistUrl(relationship.artist)}>{t("page")}</Link>
              </td>
              <td>
                {relationship.canLabelManageArtist ? (
                  <Link to={getArtistManageUrl(relationship.artist.id)}>
                    {t("manage")}
                  </Link>
                ) : (
                  t("askArtist")
                )}
              </td>
              {/* <td>
                {relationship.canLabelAddReleases ? (
                  <MdCheckBox />
                ) : (
                  t("askArtist")
                )}
              </td> */}
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
            </tr>
          ))}
        </tbody>
      </Table>
    </WidthContainer>
  );
};

export default ProfileLabel;
