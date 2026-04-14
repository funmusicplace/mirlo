import styled from "@emotion/styled";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { openOutsideLinkAfter } from "components/Merch/IncludesDigitalDownload";
import SavingInput from "./SavingInput";

interface BulkUpdateTracksProps {
  trackGroup: TrackGroup;
  reload: () => void;
}

const ToggleFormComponent = styled("div")`
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  flex-direction: row;
`;

const ManageTrackDefaults: React.FC<BulkUpdateTracksProps> = ({
  trackGroup,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useForm<TrackGroup>({ defaultValues: trackGroup });

  return (
    <div>
      <FormProvider {...methods}>
        <ToggleFormComponent>
          <SavingInput
            type="checkbox"
            formKey="defaultAllowMirloPromo"
            url={`manage/trackGroups/${trackGroup.id}`}
            timer={0}
            width="auto"
          />
          <label htmlFor="allowMirloPromo">
            <Trans
              t={t}
              i18nKey={"allowMirloPromo"}
              components={{
                hype: (
                  <Link
                    className={openOutsideLinkAfter}
                    to="/team/posts/236/"
                    target="_blank"
                  ></Link>
                ),
              }}
            />
          </label>
        </ToggleFormComponent>
        <ToggleFormComponent>
          <SavingInput
            type="checkbox"
            formKey="defaultIsPreview"
            url={`manage/trackGroups/${trackGroup.id}`}
            timer={0}
            width="auto"
          />
          <label htmlFor="defaultIsPreview">
            {t("defaultIsPreview")}
          </label>
        </ToggleFormComponent>
      </FormProvider>
    </div>
  );
};

export default ManageTrackDefaults;
