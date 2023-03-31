import { css } from "@emotion/css";
import IconButton from "components/common/IconButton";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { FaEdit } from "react-icons/fa";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
// import { AdminTrack, fetchTracks } from "services/api/Admin";
// import usePagination from "utils/usePagination";

export const AdminTracks: React.FC = () => {
  const navigate = useNavigate();
  const { trackId } = useParams();
  const [openModal, setOpenModal] = React.useState(false);
  const [results, setResults] = React.useState<Track[]>([]);

  // const { LoadingButton, results, refresh } = usePagination<AdminTrack>({
  //   apiCall: React.useCallback(fetchTracks, []),
  //   options: React.useMemo(() => ({ limit: 50 }), []),
  // });
  React.useEffect(() => {
    const callback = async () => {
      const { results } = await api.getMany<Track>("tracks");
      setResults(results);
    };
    callback();
  }, []);

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

  console.log("track", results);

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
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((track) => (
              <tr key={track.id}>
                <td>{track.title}</td>
                <td>{track.trackGroup.title}</td>
                {/* <td>{track.creator?.displayName}</td> */}
                <td>{track.status}</td>
                <td className="alignRight">
                  <IconButton compact onClick={() => onClickQueue(track.id)}>
                    <FaEdit />
                  </IconButton>
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
