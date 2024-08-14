import { css } from "@emotion/css";

import LicenseForm from "components/common/LicenseForm";
import Modal from "components/common/Modal";
import Table from "components/common/Table";
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import api from "services/api";

export const AdminLicenses: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = React.useState<License[]>([]);
  const [openModal, setOpenModal] = React.useState(false);

  const callback = React.useCallback(async () => {
    const { results } = await api.getMany<License>("licenses");
    setResults(results);
  }, []);

  React.useEffect(() => {
    callback();
  }, []);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Licenses</h3>
      <LicenseForm callback={callback} />
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Short</th>
              <th>URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((license, index) => (
              <tr key={license.short}>
                <td>{index + 1}</td>

                <td>{license.short}</td>
                <td>{license.link}</td>
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

export default AdminLicenses;
