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

export const AdminInvitesList: React.FC = () => {
  const [results, setResults] = React.useState<Invite[]>([]);

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
    const { results } = await api.getMany<Invite>(
      `admin/invites?${params?.toString()}`
    );
    setResults(results);
  };

  React.useEffect(() => {
    callback();
  }, [page]);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Email</th>
              <th>Invited by</th>
              <th>Created at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.email}</td>
                <td>{user.invitedBy?.name}</td>
                <td>{user.createdAt?.split("T")[0]}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
    </div>
  );
};

export default AdminInvitesList;
