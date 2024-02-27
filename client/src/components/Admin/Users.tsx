import { css } from "@emotion/css";
import Button from "components/common/Button";
import Table from "components/common/Table";
import React from "react";
import { FaCheck, FaEdit } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "services/api";

export const AdminUsers: React.FC = () => {
  const [results, setResults] = React.useState<User[]>([]);

  React.useEffect(() => {
    const callback = async () => {
      const { results } = await api.getMany<User>("users");
      setResults(results);
    };
    callback();
  }, []);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h2>Users</h2>

      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Name</th>
              <th>Email</th>
              <th>Created at</th>
              <th>Updated at</th>
              <th>Artists</th>
              <th>Stripe set up</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>

                <td>{user.createdAt?.split("T")[0]}</td>
                <td>{user.updatedAt?.split("T")[0]}</td>
                <td>
                  {user.artists.map((artist, i) => (
                    <React.Fragment key={artist.id}>
                      <Link to={`/${artist.urlSlug}`}>{artist.name}</Link>
                      {i < user.artists.length - 1 ? ", " : ""}
                    </React.Fragment>
                  ))}
                </td>
                <td>{user.stripeAccountId ? <FaCheck /> : ""}</td>
                <td className="alignRight">
                  <Link to={`/admin/users/${user.id}`}>
                    <Button compact startIcon={<FaEdit />} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AdminUsers;
