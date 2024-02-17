import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { FaCheck, FaEdit } from "react-icons/fa";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import api from "services/api";

export const AdminUsers: React.FC = () => {
  // const [q, setQ] = React.useState("");
  const navigate = useNavigate();
  const { userId } = useParams();
  const [openModal, setOpenModal] = React.useState(false);
  const [results, setResults] = React.useState<User[]>([]);

  // const { LoadingButton, results } = usePagination<AdminUser>({
  //   apiCall: React.useCallback(fetchUsers, []),
  //   options: React.useMemo(
  //     () => ({
  //       limit: 50,
  //       ...(members === "members" ? { members: true } : {}),
  //       ...(q !== "" ? { q } : {}),
  //     }),
  //     [members, q]
  //   ),
  // });

  React.useEffect(() => {
    const callback = async () => {
      const { results } = await api.getMany<User>("users");
      setResults(results);
    };
    callback();
  }, []);

  React.useEffect(() => {
    if (userId) {
      setOpenModal(true);
    }
  }, [userId]);

  const onClickQueue = React.useCallback(
    (id: number) => {
      navigate(`/admin/users/${id}`);
    },
    [navigate]
  );

  // const downloadCSV = React.useCallback(async () => {
  //   // await fetchCSVAndDownload(fetchUsers, {
  //   //   ...(members === "members" ? { members: true } : {}),
  //   //   ...(filterString !== "" ? { q: filterString } : {}),
  //   // });
  // }, [members, filterString]);

  // const onChangeMember: React.ChangeEventHandler<HTMLSelectElement> =
  //   React.useCallback((e) => {
  //     setMembers(e.target.value);
  //   }, []);

  // const onClickFilter: React.MouseEventHandler<HTMLButtonElement> =
  //   React.useCallback(() => {
  //     setQ(filterString);
  //   }, [filterString]);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Users</h3>
      <div
        className={css`
          margin-bottom: 1rem;
        `}
      >
        <div
          className={css`
            display: flex;
            margin-bottom: 1rem;
          `}
        >
          {/* <Input
            value={filterString}
            name="filter"
            style={{ marginBottom: "0" }}
            placeholder="filter"
            onChange={(e) => setFilterString(e.target.value)}
          /> */}
          {/* <Button compact onClick={onClickFilter}>
            Filter
          </Button> */}
        </div>
        <div
          className={css`
            display: flex;
            justify-content: space-between;
          `}
        >
          {/* <Select
            value={members}
            style={{ marginRight: "1rem" }}
            onChange={onChangeMember}
            options={[
              { label: "Members", value: "members" },
              { label: "All", value: "all" },
            ]}
          /> */}
          {/* <Button compact onClick={downloadCSV}>
            Download CSV
          </Button> */}
        </div>
      </div>
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Name</th>
              <th>Email</th>
              <th>Created at</th>
              {/* <th>Email confirmed?</th> */}
              {/* <th>Full name</th> */}
              {/* <th className="alignRight">Member</th> */}
              {/* <th>Role</th> */}
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
                {/* <td>{user.emailConfirmed}</td> */}
                {/* <td>{user.fullName}</td> */}
                {/* <td className="alignRight">{user.member && <FaCheck />}</td> */}
                {/* <td>{user.role.name}</td> */}
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
                  <Button
                    compact
                    onClick={() => onClickQueue(user.id)}
                    startIcon={<FaEdit />}
                  />
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
          navigate("/admin/users");
        }}
      >
        <Outlet />
      </Modal>
    </div>
  );
};

export default AdminUsers;
