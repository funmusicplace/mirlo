import styled from "@emotion/styled";
import InstanceLogoImage from "components/common/InstanceLogoImage";
import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { Link } from "react-router-dom";

const InstanceName = styled.span`
  margin-block: -0.2em;
  padding-block: 0.2em;
`;

const HeaderLogo = () => {
  const { name, logo, mobileLogo, tintLogo } = useInstanceSettings();
  const [failedUrls, setFailedUrls] = React.useState<string[]>([]);
  const usable = (candidate?: InstanceLogo | null) =>
    candidate && !failedUrls.includes(candidate.url) ? candidate : undefined;

  const renderLogo = (
    candidate: InstanceLogo | undefined,
    sizes: { visibility: string; logo: string; text: string }
  ) =>
    candidate ? (
      <InstanceLogoImage
        logo={candidate}
        tint={tintLogo}
        onError={() => setFailedUrls((urls) => [...urls, candidate.url])}
        className={`w-auto ${sizes.logo} ${sizes.visibility}`}
      />
    ) : (
      <InstanceName
        className={`truncate font-heading leading-none text-(--mi-text-color) ${sizes.text} ${sizes.visibility}`}
      >
        {name}
      </InstanceName>
    );

  return (
    <Link
      to="/"
      aria-label={name}
      className="mt-[-.1rem] flex min-w-0 items-center justify-start no-underline!"
    >
      {renderLogo(usable(logo), {
        visibility: "max-md:hidden",
        logo: "h-[34px] max-w-[200px]",
        text: "text-2xl",
      })}
      {renderLogo(usable(logo) && (usable(mobileLogo) ?? usable(logo)), {
        visibility: "md:hidden",
        logo: "h-8 max-w-[40vw]",
        text: "text-xl",
      })}
    </Link>
  );
};

export default HeaderLogo;
