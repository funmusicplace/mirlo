import AddUsersModal from "components/Admin/AddUsersModal";
import Button from "components/common/Button";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";

const pageSize = 100;

export const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const [results, setResults] = React.useState<Invite[]>([]);
  const [showSendInvites, setShowSendInvites] = React.useState(false);

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
    <WidthContainer variant="big" justify="center" className="p-4 grow">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3>{t("invites")}</h3>
        <Button startIcon={<FaPlus />} onClick={() => setShowSendInvites(true)}>
          {t("sendInvites")}
        </Button>
      </div>
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Email</th>
              <th>Invited by</th>
              <th>Created at</th>
              <th>Used by</th>
              <th>Used at</th>
            </tr>
          </thead>
          <tbody>
            {results.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.email}</td>
                <td>{user.invitedBy?.name}</td>
                <td>{user.createdAt?.split("T")[0]}</td>
                <td>{user.usedBy?.name ?? user.usedBy?.email}</td>
                <td>{user.usedAt?.split("T")[0]}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
      <AddUsersModal
        open={showSendInvites}
        onClose={() => setShowSendInvites(false)}
        onDone={callback}
        lockedMode="invite"
      />
    </WidthContainer>
  );
};

export default Index;
