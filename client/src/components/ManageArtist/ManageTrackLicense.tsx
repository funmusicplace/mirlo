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

  return (
    <>
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("addALicense")}
      >
        <LicenseForm callback={refetch} />
      </Modal>
      <FormComponent>
        <label
          className={css`
            display: flex;
            align-items: center;

            button {
              margin-left: 0.5rem;
            }
          `}
        >
          {t("license")}

          <InfoModal
            info={
              <Trans
                t={t}
                i18nKey={"whatMeanLicense"}
                components={{ a: <a></a> }}
              />
            }
          />
        </label>
        <SelectEl {...methods.register("licenseId")}>
          {licenses?.results.map((license) => (
            <option value={license.id}>{license.short}</option>
          ))}
        </SelectEl>
        <small
          className={css`
            display: flex;
            align-items: center;
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
      </FormComponent>
    </>
  );
};

export default ManageTrackLicense;
