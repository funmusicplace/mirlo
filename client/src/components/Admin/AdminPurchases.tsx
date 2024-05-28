import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { getReleaseUrl } from "utils/artist";
import useAdminFilters from "./useAdminFilters";

interface AdminPurchase extends UserTrackGroupPurchase {
  user: User;
  trackGroup: TrackGroup;
}

export const AdminPurchases: React.FC = () => {
  const navigate = useNavigate();
  const { trackgroupId } = useParams();
  const [results, setResults] = React.useState<AdminPurchase[]>([]);
  const [openModal, setOpenModal] = React.useState(false);

  const callback = React.useCallback(async (search?: URLSearchParams) => {
    if (search) {
      search.append("orderBy", "datePurchased");
    }
    const { results } = await api.getMany<AdminPurchase>(
      `admin/purchases?${search?.toString() ?? ""}`
    );
    setResults(results);
  }, []);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["datePurchased"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  React.useEffect(() => {
    if (trackgroupId) {
      setOpenModal(true);
    }
  }, [trackgroupId]);

  const total = results.reduce((aggr, r) => {
    if (aggr[r.currencyPaid]) {
      aggr[r.currencyPaid] += r.pricePaid;
    } else {
      aggr[r.currencyPaid] = r.pricePaid;
    }
    return aggr;
  }, {} as any);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Purchases</h3>
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
              <Money amount={total[currency] / 100} />
            </tr>
          ))}
        </tbody>
      </Table>
      <h4>All</h4>
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>User</th>
              <th>TrackGroup</th>
              <th>Date purchased</th>
              <th>Amount paid</th>
            </tr>
          </thead>
          <tbody>
            {results.map((purchase, index) => (
              <tr key={purchase.trackGroupId + purchase.userId}>
                <td>{index + 1}</td>

                <td>
                  {purchase.user.email} (userId: {purchase.userId})
                </td>
                <td>
                  <Link
                    to={getReleaseUrl(
                      purchase.trackGroup.artist ?? {
                        id: purchase.trackGroup.artistId!,
                      },
                      purchase.trackGroup
                    )}
                  >
                    {purchase.trackGroup.title}
                  </Link>{" "}
                  (id: {purchase.trackGroup.id})
                </td>
                <td>{purchase.datePurchased}</td>
                <td>
                  <Money
                    amount={purchase.pricePaid / 100}
                    currency={purchase.currencyPaid}
                  />
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

export default AdminPurchases;
