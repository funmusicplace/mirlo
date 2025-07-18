import { useFormContext } from "react-hook-form";
import { SelectEl } from "components/common/Select";
import { queryLicenses } from "queries/licenses";
import { useQuery } from "@tanstack/react-query";
import FormComponent from "components/common/FormComponent";
import { Trans, useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import Modal from "components/common/Modal";
import React from "react";
import LicenseForm from "components/common/LicenseForm";
import Tooltip from "components/common/Tooltip";
import { FaInfoCircle } from "react-icons/fa";
import { IconOnly } from "components/common/Button.stories";
import InfoModal from "components/common/InfoModal";

const ManageTrackLicense = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useFormContext();

  const { data: licenses, refetch } = useQuery(queryLicenses());

  const callback = React.useCallback(() => {
    refetch();
    setIsModalOpen(false);
  }, [refetch]);

  return (
    <>
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("addALicense")}
      >
        <LicenseForm callback={callback} />
      </Modal>
      <FormComponent>
        <SelectEl {...methods.register("licenseId")}>
          <option value="">{t("selectALicense")}</option>
          {licenses?.results.map((license) => (
            <option value={license.id}>{license.short}</option>
          ))}
        </SelectEl>
        <div
          className={css`
            display: flex;
          `}
        >
          <small
            className={css`
              display: flex;
              align-items: center;
              flex-direction: row;
            `}
          >
            {t("dontSeeTheLicenseYouWant")}
            <Button
              variant="dashed"
              onClick={() => setIsModalOpen(true)}
              type="button"
              size="compact"
              className={css`
                margin-left: 0.25rem;
              `}
            >
              {t("addIt")}
            </Button>
          </small>
        </div>
      </FormComponent>
    </>
  );
};

export default ManageTrackLicense;
