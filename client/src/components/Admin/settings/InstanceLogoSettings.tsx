import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import InstanceLogoField from "./InstanceLogoField";
import { FormSettings } from "./settingsForm";
import { useDisplayedLogo } from "./useDisplayedLogo";

const InstanceLogoSettings: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, setValue, watch } = useFormContext<FormSettings>();
  const tintLogo = watch("instanceCustomization.tintLogo");
  const buttonColor = watch("instanceCustomization.colors.button");
  const main = useDisplayedLogo("main");
  const mobile = useDisplayedLogo("mobile");
  const [useMobileLogo, setUseMobileLogo] = React.useState(mobile.hasSavedLogo);

  React.useEffect(() => {
    if (mobile.hasSavedLogo) {
      setUseMobileLogo(true);
    }
  }, [mobile.hasSavedLogo]);

  const onUseMobileLogoChange = (checked: boolean) => {
    setUseMobileLogo(checked);
    setValue(
      "pendingMobileLogo",
      !checked && mobile.hasSavedLogo ? null : undefined,
      { shouldDirty: true }
    );
  };

  return (
    <>
      <InstanceLogoField
        kind="main"
        tint={tintLogo}
        buttonColor={buttonColor}
      />

      {(main.hasLogo || mobile.hasLogo) && (
        <FormComponent direction="row">
          <InputEl
            id="input-tint-logo"
            type="checkbox"
            aria-describedby="hint-tint-logo"
            {...register("instanceCustomization.tintLogo")}
          />
          <div className="flex flex-col">
            <label htmlFor="input-tint-logo">{t("tintLogo")}</label>
            <small id="hint-tint-logo" className="max-w-md">
              {t("tintLogoHint")}
            </small>
          </div>
        </FormComponent>
      )}

      <FormComponent direction="row">
        <InputEl
          id="input-use-mobile-logo"
          type="checkbox"
          aria-describedby="hint-use-mobile-logo"
          checked={useMobileLogo}
          onChange={(event) => onUseMobileLogoChange(event.target.checked)}
        />
        <div className="flex flex-col">
          <label htmlFor="input-use-mobile-logo">{t("useMobileLogo")}</label>
          <small id="hint-use-mobile-logo" className="max-w-md">
            {t("useMobileLogoHint")}
          </small>
        </div>
      </FormComponent>

      {useMobileLogo && (
        <InstanceLogoField
          kind="mobile"
          tint={tintLogo}
          buttonColor={buttonColor}
        />
      )}
    </>
  );
};

export default InstanceLogoSettings;
