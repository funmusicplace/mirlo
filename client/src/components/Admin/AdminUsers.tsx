import { css } from "@emotion/css";
import Button from "components/common/Button";
import TextArea from "components/common/TextArea";
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import api from "services/api";
import { FormSection } from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/AlbumFormContent";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import Tabs from "components/common/Tabs";
import { useTranslation } from "react-i18next";

const pageSize = 100;

export const AdminUsers: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  const [newUsers, setNewUsers] = React.useState("");
  const [type, setType] = React.useState("LISTENER");

  const uploadUsers = async (
    users: { email: string }[],
    inviteType: "add" | "invite"
  ) => {
    if (inviteType === "invite") {
      await api.post(`admin/invites`, { users, inviteType: type });
      return;
    }
    await api.post(`admin/users`, { users, inviteType });
  };

  const processTextArea = React.useCallback(
    (inviteType: "add" | "invite") => {
      const emailsAsList =
        newUsers
          ?.split(/,|\r?\n/)
          .map((email) => email.replaceAll(" ", ""))
          .filter((email) => !!email) ?? [];
      const users = emailsAsList?.map((email) => ({ email }));
      uploadUsers(users, inviteType);
    },
    [newUsers, uploadUsers]
  );

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h2>Users</h2>

      <FormSection>
        <FormComponent>
          <label>Enter comma or newline separated e-mails here:</label>
          <TextArea
            onChange={(e) => setNewUsers(e.target.value)}
            value={newUsers}
          />
        </FormComponent>
        <FormComponent>
          <label>Type of invite to send:</label>
          <SelectEl value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ARTIST">Artist</option>
            <option value="LABEL">Label</option>
            <option value="LISTENER">Listener</option>
          </SelectEl>
        </FormComponent>
        <div
          className={css`
            display: flex;
            gap: 10px;
          `}
        >
          <Button type="button" onClick={() => processTextArea("add")}>
            Bulk add emails as users directly
          </Button>
          <Button type="button" onClick={() => processTextArea("invite")}>
            Invite e-mails
          </Button>
        </div>
      </FormSection>
      <Tabs>
        <li>
          <NavLink to="" end>
            {t("users")}
          </NavLink>
        </li>
        <li>
          <NavLink to="invites">{t("invites")}</NavLink>
        </li>
      </Tabs>
      <Outlet />
    </div>
  );
};

export default AdminUsers;
