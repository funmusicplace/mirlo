import { css } from "@emotion/css";
import React from "react";
import { useSearchParams } from "react-router-dom";
import api from "services/api";

import usePagination from "utils/usePagination";

interface AdminPurchase extends UserTrackGroupPurchase {
  user: User;
  trackGroup: TrackGroup;
}

const pageSize = 100;

export const AdminDashboard: React.FC = () => {
  const { page, PaginationComponent } = usePagination({ pageSize });

  const [searchParams] = useSearchParams();

  const callback = React.useCallback(async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();
    params.append("orderBy", "datePurchased");
    params.append("skip", `${pageSize * page}`);
    params.append("take", `${pageSize}`);

    const { results } = await api.getMany<AdminPurchase>(
      `admin/purchases?${params.toString() ?? ""}`
    );
  }, [page, searchParams]);

  React.useEffect(() => {
    callback();
  }, [callback]);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Dashboard</h3>
    </div>
  );
};

export default AdminDashboard;
