import { css } from "@emotion/css";
import Button from "components/common/Button";
import { SelectEl } from "components/common/Select";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import React from "react";
import { FaArrowCircleLeft, FaCheck, FaTimes } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";

const AdminManageArtist = () => {
  const { id } = useParams();
  console.log("getting artist", id);
  const [artist, setArtist] = React.useState<ArtistFromAdmin>();
  const [featureFlags, setFeatureFlags] = React.useState<string[]>([]);
  const snackbar = useSnackbar();
  const navigate = useNavigate();

  const callback = React.useCallback(async () => {
    const response = await api.get<ArtistFromAdmin>(`admin/artists/${id}`);
    console.log("response", response);
    setArtist(response.result);
  }, [id]);

  const onDeleteClick = React.useCallback(async () => {
    if (
      window.confirm(
        `Are you sure you want to delete artist ${artist?.name}? This action cannot be undone.`
      )
    ) {
      await api.delete(`admin/artists/${id}`);
      snackbar(`Artist ${artist?.name} deleted`, { type: "success" });
      navigate("/admin/artists");
    }
  }, [id, artist?.name]);

  React.useEffect(() => {
    callback();
  }, [callback]);

  if (!artist) {
    return null;
  }

  return (
    <>
      <div>
        <SpaceBetweenDiv>
          <div>
            <h2
              className={css`
                display: flex;
                align-items: center;
                a {
                  margin-right: 0.3rem;
                }
              `}
            >
              <Link to="/admin/users">
                <FaArrowCircleLeft />
              </Link>
              Artist "{artist.name}"
            </h2>
          </div>
        </SpaceBetweenDiv>
        <div>
          <Table>
            <tbody>
              <tr>
                <td>name</td>
                <td>{artist.name}</td>
              </tr>

              <tr>
                <td>is enabled?</td>
                <td>
                  <div
                    className={css`
                      display: flex;
                      flex-direction: column;
                    `}
                  >
                    <Toggle
                      toggled={artist.enabled}
                      label=""
                      onClick={async (checked) => {
                        await api.put(`admin/artists/${id}`, {
                          enabled: checked,
                        });
                        callback();
                      }}
                    />
                    <small>
                      An artist who is enabled will have their music show up in
                      search results. Their profile page will still be visible
                      but only directly via URL.
                    </small>
                  </div>
                </td>
              </tr>
            </tbody>
          </Table>
          <Button onClick={onDeleteClick}>Delete artist</Button>
        </div>
      </div>
    </>
  );
};

export default AdminManageArtist;
