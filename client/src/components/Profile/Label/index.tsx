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

const ProfileLabel: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "label" });
  const {
    data: { results: relationship } = { results: [] },

    refetch,
  } = useQuery(queryLabelArtists());

  return (
    <WidthContainer variant="big" justify="center">
      <h2>{t("manageArtists")}</h2>
      <AddArtistToRoster refresh={refetch} />
      <Table>
        <thead>
          <tr>
            <th></th>
            <th>{t("artist")}</th>
            <th>{t("page")}</th>
            <th>{t("manage")}</th>
            <th>{t("canLabelAddReleases")}</th>
            <th>{t("isLabelApproved")}</th>
          </tr>
        </thead>
        <tbody>
          {relationship.map((relationship) => (
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
              <td>
                {relationship.canLabelAddReleases ? (
                  <MdCheckBox />
                ) : (
                  t("askArtist")
                )}
              </td>
              <td>
                <Toggle
                  toggled={relationship.isLabelApproved}
                  onClick={() => {}}
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
