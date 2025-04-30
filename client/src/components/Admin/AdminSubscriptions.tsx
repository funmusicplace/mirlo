import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import useAdminFilters from "./useAdminFilters";
import ReleaseDate, { formatDate } from "components/TrackGroup/ReleaseDate";
import { useTranslation } from "react-i18next";

interface AdminSubscription extends ArtistUserSubscription {
  user: User;
  artistUserSubscriptionCharges: {
    createdAt: string;
    amountPaid: number;
    currency: string;
  }[];
}

export const AdminSubscriptions: React.FC = () => {
  const navigate = useNavigate();
  const { trackgroupId } = useParams();
  const [results, setResults] = React.useState<AdminSubscription[]>([]);
  const [openModal, setOpenModal] = React.useState(false);
  const [totalCount, setTotal] = React.useState<number>();
  const { i18n } = useTranslation("translation", {
    keyPrefix: "admin",
  });

  const callback = React.useCallback(async (search?: URLSearchParams) => {
    if (search) {
      search.append("orderBy", "createdAt");
    }
    const { results, total: totalResults } =
      await api.getMany<AdminSubscription>(
        `admin/subscriptions?${search?.toString()}`
      );
    setTotal(totalResults);
    setResults(results);
  }, []);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["lastSubscription"],
  });

  React.useEffect(() => {
    if (trackgroupId) {
      setOpenModal(true);
    }
  }, [trackgroupId]);

  const total = results.reduce((aggr, r) => {
    if (aggr[r.currency]) {
      aggr[r.currency] += r.amount;
    } else {
      aggr[r.currency] = r.amount;
    }
    return aggr;
  }, {} as any);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Subscriptions</h3>
      <Filters />
      <h4>Totals</h4>
      <Table
        className={css`
          margin-bottom: 2rem;
        `}
      >
        <thead>
          <tr>
            <th>Currency</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(total).map((currency) => (
            <tr key={currency}>
              <td>{currency}</td>
              <Money currency={currency} amount={total[currency] / 100} />
            </tr>
          ))}
        </tbody>
      </Table>

      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>User</th>
              <th>Subscription</th>
              <th>Artist</th>
              <th>Amount</th>
              <th>Last charge</th>
            </tr>
          </thead>
          <tbody>
            {results.map((sub, index) => (
              <tr key={sub.artistSubscriptionTierId + sub.userId}>
                <td>{index + 1}</td>

                <td>
                  {sub.user.email} (userId: {sub.userId})
                </td>
                <td>
                  {sub.artistSubscriptionTier.name} (id:{" "}
                  {sub.artistSubscriptionTier.id})
                </td>
                <td>
                  {sub.artistSubscriptionTier.artist.name} (id:{" "}
                  {sub.artistSubscriptionTier.artist.id})
                </td>
                <td>
                  <Money amount={sub.amount / 100} currency={sub.currency} />
                </td>
                <td>
                  {sub.artistUserSubscriptionCharges.map((charge) => (
                    <>
                      <Money
                        amount={charge.amountPaid / 100}
                        currency={charge.currency}
                      ></Money>
                      : {formatDate({ date: charge.createdAt, i18n })}
                    </>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {/* <LoadingButton /> */}
      <Modal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          navigate("/admin/trackgroups");
        }}
      >
        <Outlet />
      </Modal>
    </div>
  );
};

export default AdminSubscriptions;
