import { css } from "@emotion/css";
import Button, { ButtonLink } from "components/common/Button";
import Table from "components/common/Table";
import TextArea from "components/common/TextArea";
import React from "react";
import { FaCheck, FaEdit } from "react-icons/fa";
import { Link, useSearchParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";
import useAdminFilters from "./useAdminFilters";
import { FormSection } from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/AlbumFormContent";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";

const pageSize = 100;

export const AdminUsers: React.FC = () => {
  const [results, setResults] = React.useState<User[]>([]);

  const { page, PaginationComponent } = usePagination({ pageSize });
  const [searchParams] = useSearchParams();

  const callback = async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();

    if (params) {
      params.append("orderBy", "createdAt");
    }

    params.append("skip", `${pageSize * page}`);
    params.append("take", `${pageSize}`);
    const { results } = await api.getMany<User>(
      `admin/users?${params?.toString()}`
    );
    setResults(results);
  };

  React.useEffect(() => {
    callback();
  }, [page]);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["name", "email"],
  });

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <Filters />

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
                  <ButtonLink
                    size="compact"
                    startIcon={<FaEdit />}
                    to={`/admin/users/${user.id}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
    </div>
  );
};

export default AdminUsers;
