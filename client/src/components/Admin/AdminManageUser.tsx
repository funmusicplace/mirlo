import { css } from "@emotion/css";
import Button from "components/common/Button";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import React from "react";
import { FaArrowCircleLeft, FaCheck, FaTimes } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import api from "services/api";

const AdminManageUser = () => {
  const { id } = useParams();
  const [user, setUser] = React.useState<UserFromAdmin>();

  const callback = React.useCallback(async () => {
    const response = await api.get<UserFromAdmin>(`users/${id}`);
    setUser(response.result);
  }, [id]);

  const onConfirmationEmailClick = React.useCallback(async () => {
    await api.post(`users/${id}/confirmEmail`, {});
    callback();
  }, [callback, id]);

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
          <table>
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
                <td>artists</td>
                <td>{user.artists.length}</td>
              </tr>
              <tr>
                <td>isAdmin</td>
                <td>{user.isAdmin}</td>
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
                <td>stripe linked</td>
                <td>{user.stripeAccountId ? <FaCheck /> : <FaTimes />}</td>
              </tr>
              <tr>
                <td>receive mailing list</td>
                <td>{user.receiveMailingList ? <FaCheck /> : <FaTimes />}</td>
              </tr>
            </tbody>
          </table>
          <Button onClick={onConfirmationEmailClick}>Confirm user email</Button>
        </div>
      </div>
    </>
  );
};

export default AdminManageUser;
