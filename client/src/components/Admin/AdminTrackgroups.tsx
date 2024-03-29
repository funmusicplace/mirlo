import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { FaCheck, FaEdit } from "react-icons/fa";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import useAdminFilters from "./useAdminFilters";
// import { AdminTrackGroup, fetchTrackGroups } from "services/api/Admin";
// import usePagination from "utils/usePagination";

export const AdminTrackGroups: React.FC = () => {
  const navigate = useNavigate();
  const { trackgroupId } = useParams();
  const [results, setResults] = React.useState<TrackGroup[]>([]);
  const [openModal, setOpenModal] = React.useState(false);
  const [total, setTotal] = React.useState<number>();

  const callback = React.useCallback(async (search?: URLSearchParams) => {
    if (search) {
      search.append("orderBy", "createdAt");
    }
    const { results, total: totalReuslts } = await api.getMany<TrackGroup>(
      `admin/trackGroups?${search?.toString()}`
    );
    setResults(results);
    setTotal(totalReuslts);
  }, []);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["title", "isPublished", "artistName"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  React.useEffect(() => {
    if (trackgroupId) {
      setOpenModal(true);
    }
  }, [trackgroupId]);

  const onClickQueue = React.useCallback(
    (id: number) => {
      navigate(`/admin/trackGroups/${id}`);
    },
    [navigate]
  );

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>TrackGroups</h3>
      <Filters />
      <h4>Total results: {total}</h4>

      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Title</th>
              {/* <th>Type</th> */}
              {/* <th>Private?</th> */}
              {/* <th>Enabled?</th> */}
              {/* <th>Featured?</th> */}
              <th>Artist</th>
              <th>Release date</th>
              <th>Created date</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((trackgroup, index) => (
              <tr key={trackgroup.id}>
                <td>{index + 1}</td>
                <td>
                  {trackgroup.title} (id: {trackgroup.id})
                </td>
                {/* <td>{trackgroup.type}</td> */}
                {/* <td>{trackgroup.private ? <FaCheck /> : undefined}</td> */}
                {/* <td>{trackgroup.adminEnabled ? <FaCheck /> : undefined}</td> */}
                {/* <td>{trackgroup.featured ? <FaCheck /> : undefined}</td> */}

                <td>{trackgroup.artist?.name}</td>
                <td>{trackgroup.releaseDate}</td>
                <td>{trackgroup.createdAt}</td>
                <td>{trackgroup.published ? <FaCheck /> : undefined}</td>
                <td className="alignRight">
                  <Button
                    compact
                    startIcon={<FaEdit />}
                    onClick={() => onClickQueue(trackgroup.id)}
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

export default AdminTrackGroups;
