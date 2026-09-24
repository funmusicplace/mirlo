import Modal from "components/common/Modal";
import Table from "components/common/Table";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { TRUST_LEVEL_CHANGE_REASON_LABELS } from "utils/trustLevel";

const TrustLevelHistoryModal: React.FC<{
  open: boolean;
  onClose: () => void;
  changes: UserTrustLevelChange[];
  trustLevelNames: string[];
}> = ({ open, onClose, changes, trustLevelNames }) => {
  const { i18n } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trust level history"
      size="small"
    >
      {changes.length === 0 ? (
        <p>No changes yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Change</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id}>
                <td>{formatDate({ date: change.createdAt, i18n })}</td>
                <td>
                  {trustLevelNames[change.fromLevel]} to{" "}
                  {trustLevelNames[change.toLevel]}
                </td>
                <td>
                  {TRUST_LEVEL_CHANGE_REASON_LABELS[change.reason]}
                  {change.changedBy ? ` (${change.changedBy.email})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Modal>
  );
};

export default TrustLevelHistoryModal;
