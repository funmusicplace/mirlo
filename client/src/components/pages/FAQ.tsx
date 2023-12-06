import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { MetaCard } from "../common/MetaCard";
import { Link } from "react-router-dom";
import MarkdownWrapper from "../common/MarkdownWrapper";
import { pageMarkdownWrapper } from "components/Post";

const FAQ: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "faq" });

  return (
    <div className={pageMarkdownWrapper}>
      <MarkdownWrapper>
        <MetaCard
          title={t("title")}
          description="Some frequently asked questions about Mirlo"
        />
        <Link to="/">&#8612; {t("home")}</Link>
        <h1>
          <Trans t={t} i18nKey="title" />
        </h1>
        <h2>{t("whatWeBuilding")}</h2>
        <h3>{t("questions.whatIsMirlo.question")}</h3>
        <p>{t("questions.whatIsMirlo.answer")}</p>
        <h3>{t("questions.howDoesMirloWork.question")}</h3>
        <p>{t("questions.howDoesMirloWork.answer")}</p>
        <h3>{t("questions.howMuchDoesMirloCost.question")}</h3>
        <p>{t("questions.howMuchDoesMirloCost.answer")}</p>
        <h3>{t("questions.whatMakesMirloDifferent.question")}</h3>
        <p>{t("questions.whatMakesMirloDifferent.answer")}</p>
        <ul>
          <li>{t("questions.whatMakesMirloDifferent.answerBulletpoint1")} </li>
          <li>{t("questions.whatMakesMirloDifferent.answerBulletpoint2")} </li>
          <li>{t("questions.whatMakesMirloDifferent.answerBulletpoint3")}</li>
        </ul>
        <h3>{t("questions.longTermGoals.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.longTermGoals.answer"
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              1: <a href="https://funmusic.place/observations-and-intent/" />,
            }}
          />
        </p>
        <h3>{t("questions.shortTermGoals.question")}</h3>
        <p>
          <Trans t={t} i18nKey="questions.shortTermGoals.answer" />
        </p>
        <h3>{t("questions.mainBlockers.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.mainBlockers.answer"
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            components={{ 1: <a href="mailto:mirlodotspace@protonmail.com" /> }}
          />
        </p>
        <h3>{t("questions.productRoadmap.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.productRoadmap.answer"
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              1: <a href="https://github.com/funmusicplace/mirlo/issues" />,
            }}
          />
        </p>
        <h3>{t("questions.heardOfProjectX.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.heardOfProjectX.answer"
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            components={{ 1: <a href="https://discord.gg/XuV7F4YRqB" /> }}
          />
        </p>
        <h3>{t("questions.howDoPayoutsWork.question")}</h3>
        <p>
          <Trans t={t} i18nKey="questions.howDoPayoutsWork.answer" />
        </p>
        <h2>{t("people")}</h2>
        <h3>{t("questions.howAreYouStructured.question")}</h3>
        <Trans
          t={t}
          i18nKey="questions.howAreYouStructured.answer"
          components={{
            1: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a href="https://www.colorado.edu/lab/medlab/exit-to-community" />
            ),
          }}
        />
        <h3>{t("questions.howAreDecisionsMade.question")}</h3>
        <p>{t("questions.howAreDecisionsMade.answer")}</p>
        <h3>{t("questions.howCanIGetInTouch.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.howCanIGetInTouch.answer"
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              1: <a href="https://discord.gg/XuV7F4YRqB" />,
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              2: <a href="https://funmusic.place" />,
            }}
          />
        </p>
        <h3>{t("questions.areYouOpenSource.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.areYouOpenSource.answer"
            components={{
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              1: <a href="https://github.com/funmusicplace/mirlo" />,
            }}
          />
        </p>
        <h3>{t("questions.canIHelpWithTesting.question")}</h3>
        <p>
          <Trans
            t={t}
            i18nKey="questions.canIHelpWithTesting.answer"
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            components={{ 1: <a href="https://discord.gg/XuV7F4YRqB" /> }}
          />
        </p>
      </MarkdownWrapper>
    </div>
  );
};

export default FAQ;
