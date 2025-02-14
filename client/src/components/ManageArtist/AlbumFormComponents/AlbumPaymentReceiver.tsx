import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";

const AlbumPaymentReceiver = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const searchUsers = React.useCallback(async (search: string) => {
    const options = await api.getMany<User>(`users?email=${search}`);
    return options.results.map((r) => ({ id: r.id, name: r.email }));
  }, []);
  return (
    <div>
      <FormComponent>
        <label>{t("emailAddressOfMirloAccountReceivesPayment")}</label>
      </FormComponent>
    </div>
  );
};

export default AlbumPaymentReceiver;
