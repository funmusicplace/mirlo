import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { FaEdit } from "react-icons/fa";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";

const pageSize = 100;

export const AdminTracks: React.FC = () => {
  const navigate = useNavigate();
  const { trackId } = useParams();
  const [openModal, setOpenModal] = React.useState(false);
  const [results, setResults] = React.useState<Track[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });

  React.useEffect(() => {
    const callback = async () => {
      const params = new URLSearchParams();
      params.append("skip", `${pageSize * page}`);
      params.append("take", `${pageSize}`);

      const { results } = await api.getMany<Track>(
        `tracks?${params.toString()}`
      );
      setResults(results);
    };
    callback();
  }, [page]);

  React.useEffect(() => {
    if (trackId) {
      setOpenModal(true);
    }
  }, [trackId]);

  const onClickQueue = React.useCallback(
    (id: number) => {
      navigate(`/admin/tracks/${id}`);
    },
    [navigate]
  );

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Tracks</h3>
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Album</th>
              <th>Album artist</th>
              <th>Preview</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((track) => (
              <tr key={track.id}>
                <td>{track.title}</td>
                <td>{track.trackGroup.title}</td>
                <td>{track.trackGroup.artist?.name}</td>
                <td>{track.isPreview}</td>

                <td className="alignRight">
                  <Button
                    startIcon={<FaEdit />}
                    compact
                    onClick={() => onClickQueue(track.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
      <Modal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          navigate("/admin/tracks");
          // refresh();
        }}
      >
        <Outlet />
      </Modal>
    </div>
  );
};

export default AdminTracks;
