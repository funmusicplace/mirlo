import FormComponent from "components/common/FormComponent";
import { Toggle } from "components/common/Toggle";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

const FederatedStreamingToggle: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { watch, setValue } = useFormContext<{
    federatedStreaming: boolean;
  }>();
  const federatedStreaming = watch("federatedStreaming");

  return (
    <FormComponent>
      <Toggle
        ariaDescribedBy="hint-enable-federated-streaming"
        label={t("enableFederatedStreaming")}
        toggled={federatedStreaming}
        onClick={(value) => setValue("federatedStreaming", value)}
      />
      <small id="hint-enable-federated-streaming">
        <Trans
          i18nKey="makeStreamable"
          t={t}
          components={{
            link: (
              <a
                href="https://docs.mirlo.space/how-tos/social-web-and-discovery#discovery"
                target="_blank"
                rel="noreferrer"
              ></a>
            ),
          }}
        />
      </small>
    </FormComponent>
  );
};

export default FederatedStreamingToggle;
