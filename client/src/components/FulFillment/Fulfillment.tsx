import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import FulfillmentRow from "./FulfillmentRow";
import { useQuery } from "@tanstack/react-query";
import { queryUserPurchases } from "queries";
import WidthContainer from "components/common/WidthContainer";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Button, { ButtonLink } from "components/common/Button";
import DropdownMenu from "components/common/DropdownMenu";
import { FaDownload } from "react-icons/fa";

export const Fulfillment: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const [isLoadingFulfillments, setIsLoadingFulfillments] =
    React.useState(false);

  const downloadOrderData = React.useCallback(async () => {
    setIsLoadingFulfillments(true);
    try {
      await api.getFile(
        "fulfillments",
        `manage/purchases?format=csv`,
        "text/csv"
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFulfillments(false);
    }
  }, []);

  const { data: purchaseResults } = useQuery(queryUserPurchases());

  return (
    <WidthContainer
      variant="big"
      className={css`
        padding: 1rem;
      `}
    >
      <SpaceBetweenDiv>
        <h3
          className={css`
            margin: 0.5rem 0;
          `}
        >
          {t("ordersAndFulfillment")}
        </h3>
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
        </div>
      )}
    </WidthContainer>
  );
};

export default Fulfillment;
