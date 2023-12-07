import { Trans, useTranslation } from "react-i18next";
import { pageMarkdownWrapper } from "components/Post/index";
import { MetaCard } from "../common/MetaCard";
import { Link } from "react-router-dom";
import MarkdownWrapper from "../common/MarkdownWrapper";

const About: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "about" });

  return (
    <div className={pageMarkdownWrapper}>
      <MarkdownWrapper>
        <MetaCard
          title="About"
          description="Mirlo is a community of musicians, listeners, and coders who are
        daring to re-imagine the music industry: taking lessons learned in working in the
        solidarity economy and applying them to our process and product."
        />
        <Link to="/">&#8612; Home</Link>
        <h1>{t("about")}</h1>
        <p>{t("intro")}</p>
        <h2>{t("ourMission")}</h2>
        <Trans t={t}>
          <p>
            The music industry does not work for musicians or listeners and
            needs a radical re-imagination.
          </p>
          <p>
            Mirlo is a community of musicians, listeners, and coders who are
            daring to do just that: taking lessons learned in working in the
            solidarity economy and applying them to our process and product.
          </p>
          <p>
            We are building an online audio distribution (think Bandcamp) and
            patronage (think Patreon) platform that aims to be radical,
            accessible, open source (free & libre), modular, and standards
            based.
          </p>
        </Trans>
        <h2>{t("behindThePlatform")}</h2>
        <p>{t("behindThePlatformText")}</p>
      </MarkdownWrapper>
    </div>
  );
};

export default About;
