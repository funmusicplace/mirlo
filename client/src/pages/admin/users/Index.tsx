import AddUsersModal from "components/Admin/AddUsersModal";
import useAdminFilters from "components/Admin/useAdminFilters";
import Button, { ButtonLink } from "components/common/Button";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEdit, FaPlus } from "react-icons/fa";
import { Link, useSearchParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";

const pageSize = 100;

export const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const [results, setResults] = React.useState<User[]>([]);
  const [showAddUsers, setShowAddUsers] = React.useState(false);

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
    <WidthContainer variant="big" justify="center" className="p-4 grow">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3>{t("users")}</h3>
        <Button startIcon={<FaPlus />} onClick={() => setShowAddUsers(true)}>
          {t("addUsers")}
        </Button>
      </div>
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
              <th>Stripe account ID</th>
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
                <td>{user.stripeAccountId ?? ""}</td>
                <td className="alignRight">
                  <ButtonLink
                    variant="transparent"
                    startIcon={<FaEdit />}
                    to={`/admin/content/users/${user.id}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
      <AddUsersModal
        open={showAddUsers}
        onClose={() => setShowAddUsers(false)}
        onDone={callback}
      />
    </WidthContainer>
  );
};

export default Index;
