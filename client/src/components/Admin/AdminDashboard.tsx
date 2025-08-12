import { css } from "@emotion/css";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Form, Link, useSearchParams } from "react-router-dom";
import api from "services/api";
import { getReleaseUrl } from "utils/artist";
import useAdminFilters from "./useAdminFilters";
import usePagination from "utils/usePagination";
import TextArea from "components/common/TextArea";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";

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
