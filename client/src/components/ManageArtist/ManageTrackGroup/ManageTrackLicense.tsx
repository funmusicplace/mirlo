import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import LicenseForm from "components/common/LicenseForm";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import { queryLicenses } from "queries/licenses";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
            <ArtistButton
              variant="dashed"
              onClick={() => setIsModalOpen(true)}
              type="button"
              size="compact"
              className={css`
                margin-left: 0.25rem;
              `}
            >
              {t("addIt")}
            </ArtistButton>
          </small>
        </div>
      </FormComponent>
    </>
  );
};

export default ManageTrackLicense;
