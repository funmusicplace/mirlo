import { css } from "@emotion/css";
import CanCreateArtists from "components/CanCreateArtists";
import Button from "components/common/Button";
import { Select, SelectEl } from "components/common/Select";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import React from "react";
import { FaArrowCircleLeft, FaCheck, FaTimes } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";

const AdminManageUser = () => {
  const { id } = useParams();
  const [user, setUser] = React.useState<UserFromAdmin>();
  const [featureFlags, setFeatureFlags] = React.useState<string[]>([]);
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  console.log("user", user);

  const callback = React.useCallback(async () => {
    const response = await api.get<UserFromAdmin>(`admin/users/${id}`);
    setUser(response.result);
    setFeatureFlags(response.result.featureFlags);
  }, [id]);

  const onConfirmationEmailClick = React.useCallback(async () => {
    await api.post(`users/${id}/confirmEmail`, {});
    callback();
  }, [callback, id]);

  const onDeleteClick = React.useCallback(async () => {
    if (
      window.confirm(
        `Are you sure you want to delete user ${user?.email}? This action cannot be undone.`
      )
    ) {
      await api.delete(`admin/users/${id}`);
      snackbar(`User ${user?.email} deleted`, { type: "success" });
      navigate("/admin/users");
    }
  }, [id, user?.email]);

  React.useEffect(() => {
    callback();
  }, [callback]);

  if (!user) {
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
              User "{user.email}"
            </h2>
          </div>
        </SpaceBetweenDiv>
        <div>
          <Table>
            <tbody>
              <tr>
                <td>email</td>
                <td>{user.email}</td>
              </tr>
              <tr>
                <td>name</td>
                <td>{user.name}</td>
              </tr>
              <tr>
                <td>Trust level</td>
                <td>{user.trustLevel}</td>
              </tr>
              <tr>
                <td>artists</td>
                <td>
                  {user.artists.map((a) => (
                    <Link to={getArtistUrl(a)} key={a.id}>
                      {a.name}
                    </Link>
                  ))}
                </td>
              </tr>
              <tr>
                <td>is admin?</td>
                <td>
                  <Toggle
                    toggled={user.isAdmin}
                    label=""
                    onClick={async (checked) => {
                      await api.put(`admin/users/${id}`, {
                        isAdmin: checked,
                      });
                      callback();
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td>Can create artists?</td>
                <td>
                  <div
                    className={css`
                      display: flex;
                      flex-direction: column;
                    `}
                  >
                    <Toggle
                      toggled={user.canCreateArtists}
                      label=""
                      onClick={async (checked) => {
                        await api.put(`admin/users/${id}`, {
                          canCreateArtists: checked,
                        });
                        callback();
                      }}
                    />
                    <small>
                      Disabling the ability to create artists for a user also
                      prevents them from creating releases, merch, etc and will
                      unlist their music from public view.
                    </small>
                  </div>
                </td>
              </tr>
              <tr>
                <td>currency</td>
                <td>{user.currency}</td>
              </tr>
              <tr>
                <td>email confirmed?</td>
                <td>
                  {user.emailConfirmationToken ? <FaTimes /> : <FaCheck />}
                </td>
              </tr>
              <tr>
                <td>is label account?</td>
                <td>
                  <Toggle
                    toggled={user.isLabelAccount}
                    label=""
                    onClick={async (checked) => {
                      await api.put(`admin/users/${id}`, {
                        isLabelAccount: checked,
                      });
                      callback();
                    }}
                  />
                </td>
              </tr>

              <tr>
                <td>Feature flags</td>
                <td>
                  <SelectEl
                    multiple
                    defaultValue={featureFlags}
                    onChange={(e) => {
                      const selectedOptions = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setFeatureFlags(selectedOptions);
                    }}
                  >
                    {[
                      "label",
                      "activityPub",
                      "subscriptionFulfillment",
                      "fundraiser",
                    ].map((flag) => (
                      <option key={flag} value={flag}>
                        {flag}
                      </option>
                    ))}
                  </SelectEl>
                </td>
                <td>
                  <Button
                    onClick={async () => {
                      await api.put(`admin/users/${id}`, {
                        featureFlags: featureFlags,
                      });
                      callback();
                    }}
                  >
                    Save
                  </Button>
                </td>
              </tr>
              <tr>
                <td>stripe linked</td>
                <td>{user.stripeAccountId ? <FaCheck /> : <FaTimes />}</td>
              </tr>
              <tr>
                <td>receive mailing list</td>
                <td>{user.receiveMailingList ? <FaCheck /> : <FaTimes />}</td>
              </tr>
            </tbody>
          </Table>
          <Button onClick={onConfirmationEmailClick}>Confirm user email</Button>
          <Button onClick={onDeleteClick}>Delete user</Button>
        </div>
      </div>
    </>
  );
};

export default AdminManageUser;
