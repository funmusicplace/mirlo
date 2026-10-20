import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import Button from "components/common/Button";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryOAuthInteraction, useOAuthDecisionMutation } from "queries/oauth";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import ConsentScopes from "./ConsentScopes";

function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "oauth" });
  const { uid = "" } = useParams();
  const { data, isPending, isError } = useQuery(queryOAuthInteraction(uid));
  const {
    mutate: decide,
    isPending: isDeciding,
    isError: decisionFailed,
  } = useOAuthDecisionMutation(uid);

  const autoAllow = !!data?.loggedIn && !data.needsConsent;
  React.useEffect(() => {
    if (autoAllow) {
      decide("allow");
    }
  }, [autoAllow, decide]);

  if (isError || decisionFailed) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("expired")}</Box>
      </WidthWrapper>
    );
  }

  if (isPending || autoAllow) {
    return <FullPageLoadingSpinner />;
  }

  if (!data) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("expired")}</Box>
      </WidthWrapper>
    );
  }

  if (!data.loggedIn) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/oauth/${uid}`)}`}
        replace
      />
    );
  }

  return (
    <WidthWrapper variant="small" className="mt-8 mb-12">
      <div className="flex items-center gap-4 mb-4">
        {data.client.logoUri && (
          <img
            src={data.client.logoUri}
            alt=""
            className="w-12 h-12 rounded object-contain"
          />
        )}
        <h1 className="text-xl">
          {t("wantsAccess", { app: data.client.name })}
        </h1>
      </div>
      <p className="mb-4 text-(--mi-lighten-foreground-color)">
        {t("redirectsTo", { host: data.redirectHost })}
      </p>
      <ConsentScopes scopes={data.scopes} />
      <div className="flex gap-4 mt-6">
        <Button
          buttonRole="primary"
          onClick={() => decide("allow")}
          isLoading={isDeciding}
          disabled={isDeciding}
        >
          {t("allow")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => decide("deny")}
          disabled={isDeciding}
        >
          {t("deny")}
        </Button>
      </div>
    </WidthWrapper>
  );
}

export default Index;
