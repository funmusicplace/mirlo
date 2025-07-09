import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import SalesRow from "./SalesRow";
import { useQueries, useQuery } from "@tanstack/react-query";
import { queryManagedArtists, queryUserSales } from "queries";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import WidthContainer from "components/common/WidthContainer";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { SelectEl } from "components/common/Select";

export const Sales: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();

  const { data: { results, total } = { results: [], total: 0 }, isLoading } =
    useQuery(
      queryUserSales({
        artistIds: filteredArtistId ? [filteredArtistId] : undefined,
      })
    );

  const { data: managedArtists } = useQuery(queryManagedArtists());

  return (
    <WidthContainer
      className={css`
        padding: 1rem;
      `}
      variant={"big"}
    >
      <SpaceBetweenDiv>
        <h3
          className={css`
            margin: 0.5rem 0;
          `}
        >
          {t("sales")}
        </h3>
        <SelectEl
          onChange={(e) => {
            const artistId = e.target.value
              ? Number(e.target.value)
              : undefined;
            setFilteredArtistId(artistId);
          }}
          value={filteredArtistId ?? ""}
        >
          <option value="">{t("selectArtist")}</option>
          {managedArtists?.results.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </SelectEl>
      </SpaceBetweenDiv>
      {isLoading && <LoadingBlocks rows={5} height="2rem" margin=".5rem" />}
      {results.length > 0 && (
        <div
          className={css`
            max-width: 100%;
            overflow-x: auto;
            background-color: var(--mi-lighten-background-color);
          `}
        >
          <Table>
            <thead>
              <tr>
                <th />
                <th>{t("artist")}</th>
                <th>{t("amount")}</th>
                <th>{t("date")}</th>
                <th>{t("type")}</th>
                <th>{t("item")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((sale, index) => (
                <SalesRow key={sale.datePurchased + index} sale={sale} />
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </WidthContainer>
  );
};

export default Sales;
