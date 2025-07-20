import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { FaCheck } from "react-icons/fa";
import {
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import api from "services/api";
import useAdminFilters from "./useAdminFilters";
import usePagination from "utils/usePagination";

interface AdminArtist extends Artist {
  user: User;
}

const pageSize = 100;

export const AdminArtists: React.FC = () => {
  const navigate = useNavigate();
  const { trackgroupId } = useParams();
  const [results, setResults] = React.useState<AdminArtist[]>([]);
  const [openModal, setOpenModal] = React.useState(false);
  const [total, setTotal] = React.useState<number>();
  const [searchParams] = useSearchParams();
  const { page, PaginationComponent } = usePagination({ pageSize });

  const callback = React.useCallback(async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();
    if (params) {
      params.append("orderBy", "createdAt");
    }
    params.set("skip", `${pageSize * page}`);
    params.set("take", `${pageSize}`);
    const { results, total: totalResults } = await api.getMany<AdminArtist>(
      `admin/artists?${params.toString()}`
    );
    setTotal(totalResults);
    setResults(results);
  }, [searchParams, page]);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["name", "email", "acceptPayments"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  React.useEffect(() => {
    if (trackgroupId) {
      setOpenModal(true);
    }
  }, [trackgroupId]);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Artists</h3>
      <Filters />
      <h4>Total results: {total}</h4>
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Name</th>
              <th>User</th>
              <th>Can accept payments</th>
              <th>Created date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((artist, index) => (
              <tr key={artist.id}>
                <td>{index + 1}</td>
                <td>
                  {artist.name} (id: {artist.id})
                </td>
                <td>
                  {artist.user.email} (userId: {artist.userId})
                </td>
                <td>{artist.user.stripeAccountId ? <FaCheck /> : ""}</td>
                <td>{artist.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {/* <LoadingButton /> */}
      <PaginationComponent amount={results.length} total={total} />
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

export default AdminArtists;
