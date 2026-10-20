import Box from "components/common/Box";
import { WidthWrapper } from "components/common/WidthContainer";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function OAuthError() {
  const { t } = useTranslation("translation", { keyPrefix: "oauth" });
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const description = searchParams.get("error_description");

  return (
    <WidthWrapper variant="small" className="mt-8">
      <h1 className="text-xl mb-4">{t("errorTitle")}</h1>
      <Box>
        <p>{t("errorExplanation")}</p>
        {(description || error) && (
          <p className="mt-2 text-(--mi-lighten-foreground-color)">
            {description ?? error}
          </p>
        )}
      </Box>
    </WidthWrapper>
  );
}

export default OAuthError;
