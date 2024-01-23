import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";

interface AdminArtist extends Artist {
  user: User;
}

export const AdminArtists: React.FC = () => {
  const navigate = useNavigate();
  const { trackgroupId } = useParams();
  const [results, setResults] = React.useState<AdminArtist[]>([]);
  const [openModal, setOpenModal] = React.useState(false);

  React.useEffect(() => {
    const callback = async () => {
      const { results } = await api.getMany<AdminArtist>("admin/artists");
      setResults(results);
    };
    callback();
  }, []);

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
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Name</th>
              <th>User</th>
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
                <td>{artist.createdAt}</td>
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

export default AdminArtists;
