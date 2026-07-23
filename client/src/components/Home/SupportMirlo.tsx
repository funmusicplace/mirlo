import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "components/common/Button";
import { useInstanceSettings } from "queries/instanceSettings";
import { queryInstanceArtist } from "queries/settings";
import { useTranslation } from "react-i18next";
import { getArtistUrl } from "utils/artist";

import {
  SplashButtonWrapper,
  SplashTitle,
  SplashWrapper,
  TextWrapper,
} from "./Splash";

const SupportMirlo = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });
  const { data: instanceArtist } = useQuery(queryInstanceArtist());
  const { showCustomSplash } = useInstanceSettings();

  if (showCustomSplash) {
    return null;
  }

  return (
    <div className="w-full bg-(--mi-button-color)! text-(--mi-white) max-md:m-0 [[data-mi-high-contrast]_&]:bg-(--mi-button-color)! [[data-mi-high-contrast]_&]:text-(--mi-button-text-color)">
      <SplashWrapper className="py-16 min-h-auto! max-md:p-0 max-md:min-h-[calc(100vh-60px)]! max-md:flex-col-reverse">
        <TextWrapper className="max-md:pt-0 max-sm:p-(--mi-side-paddings-normal)">
          <div className="flex flex-col gap-6">
            <SplashTitle as="h2">{t("sustainedBy")}</SplashTitle>
            <SplashButtonWrapper>
              <ButtonLink
                to={
                  instanceArtist
                    ? getArtistUrl(instanceArtist) + "/support"
                    : ""
                }
                size="big"
                rounded
                className="block no-underline text-center bg-(--mi-black)! text-(--mi-white)! hover:underline [@media(prefers-color-scheme:dark)]:bg-(--mi-white)! [@media(prefers-color-scheme:dark)]:text-(--mi-black)! [[data-mi-high-contrast]_&]:bg-(--mi-button-text-color)! [[data-mi-high-contrast]_&]:text-(--mi-button-color)! [[data-mi-high-contrast]_&]:[&_svg]:fill-(--mi-button-color)!"
              >
                {t("supportTeam")}
              </ButtonLink>
            </SplashButtonWrapper>
          </div>
        </TextWrapper>
        <div className="block w-[90%] h-[30vh] bg-[url('/static/images/flock.svg')] bg-contain bg-no-repeat md:w-[370px] md:h-[285px] md:mr-[60px] [[data-mi-high-contrast=light]_&]:invert" />
      </SplashWrapper>
    </div>
  );
};

export default SupportMirlo;
