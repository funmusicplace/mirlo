import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import FulfillmentRow from "./FulfillmentRow";
import { useQuery } from "@tanstack/react-query";
import { queryUserPurchases, queryManagedArtists } from "queries";
import WidthContainer from "components/common/WidthContainer";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Button, { ButtonLink } from "components/common/Button";
import DropdownMenu from "components/common/DropdownMenu";
import { FaDownload } from "react-icons/fa";
import usePagination from "utils/usePagination";
import { SelectEl } from "components/common/Select";

const pageSize = 50;

export const Fulfillment: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const [isLoadingFulfillments, setIsLoadingFulfillments] =
    React.useState(false);
  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();
  const [datePurchased, setDatePurchased] = React.useState<string>("");
  const { page, PaginationComponent } = usePagination({ pageSize });

  const downloadOrderData = React.useCallback(async () => {
    setIsLoadingFulfillments(true);
    try {
      const params = new URLSearchParams();
      if (filteredArtistId) {
        params.append("artistIds", String(filteredArtistId));
      }
      if (datePurchased) {
        params.append("datePurchased", datePurchased);
      }
      params.append("format", "csv");

      await api.getFile(
        "fulfillments",
        `manage/purchases?${params.toString()}`,
        "text/csv"
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFulfillments(false);
    }
  }, [filteredArtistId, datePurchased]);

  const { data: purchaseResults } = useQuery(
    queryUserPurchases({
      artistIds: filteredArtistId ? [filteredArtistId] : undefined,
      datePurchased: datePurchased || undefined,
      take: pageSize,
      skip: page * pageSize,
    })
  );

  const { data: managedArtists } = useQuery(queryManagedArtists());

  return (
    <WidthContainer
      variant="big"
      className={css`
        padding: 1rem;
      `}
    >
      <SpaceBetweenDiv>
        <h1
          className={css`
            margin: 0.5rem 0;
          `}
        >
          {t("ordersAndFulfillment")}
        </h1>
        <div
          className={css`
            align-items: center;
            display: flex;
            gap: 1rem;
          `}
        >
          <ButtonLink variant="outlined" to="/sales">
            {t("viewSales")}
          </ButtonLink>
          <DropdownMenu>
            <ul>
              <li>
                <Button
                  onClick={downloadOrderData}
                  size="compact"
                  startIcon={<FaDownload />}
                  isLoading={isLoadingFulfillments}
                >
                  {t("downloadOrderData")}
                </Button>
              </li>
            </ul>
          </DropdownMenu>
        </div>
      </SpaceBetweenDiv>
      <p>{t("fulfillmentDescription")}</p>
      <div className="flex gap-1 mb-1">
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
        <SelectEl
          onChange={(e) => {
            setDatePurchased(e.target.value);
          }}
          value={datePurchased}
        >
          <option value="">All dates</option>
          <option value="thisMonth">Current month to date</option>
          <option value="previousMonth">Previous month</option>
          <option value="thisYear">Current year to date</option>
          <option value="lastYear">Last year</option>
        </SelectEl>
      </div>
      <h4>{t("totalResults", { count: purchaseResults?.total })}</h4>
      {(purchaseResults?.results.length ?? 0) > 0 && (
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
                <th>{t("merchItem")}</th>
                <th>{t("customer")}</th>
                <th>{t("email")}</th>
                <th>{t("quantity")}</th>
                <th>{t("type")}</th>
                <th>{t("fulfillmentStatus")}</th>
                <th>{t("orderDate")}</th>
                <th>{t("lastUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {purchaseResults?.results.map((purchase, index) => (
                <FulfillmentRow key={purchase.id} purchase={purchase} />
              ))}
            </tbody>
          </Table>
          <PaginationComponent
            amount={purchaseResults?.results.length ?? 0}
            total={purchaseResults?.total ?? 0}
          />
        </div>
      )}
    </WidthContainer>
  );
};

export default Fulfillment;
