import { Trans, useTranslation } from "react-i18next";
import { PageMarkdownWrapper } from "components/Post/index";
import { MetaCard } from "../common/MetaCard";
import { Link } from "react-router-dom";
import MarkdownWrapper from "../common/MarkdownWrapper";
import React from "react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { FaChevronRight } from "react-icons/fa";

const H2 = styled.h2`
  margin-top: 2rem !important;
  margin-bottom: 1rem;
`;

const About: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "about" });

  return (
    <PageMarkdownWrapper>
      <MarkdownWrapper>
        <MetaCard
          title="About"
          description="Mirlo is a community of musicians, listeners, and coders who are
        daring to re-imagine the music industry: taking lessons learned in working in the
        solidarity economy and applying them to our process and product."
        />
        <Link to="/">&#8612; {t("home")}</Link>
        <h1>{t("about")}</h1>
        <p>{t("intro")}</p>
        <H2>{t("ourMission")}</H2>
        <Trans i18nKey="missionStatement" t={t}>
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

        <div>
          <H2>{t("pricingAndFeatures")}</H2>

          <Trans
            i18nKey="featuresText"
            t={t}
            components={{ 1: <p></p>, a: <Link to="/pages/features"></Link> }}
          ></Trans>
          <Trans
            t={t}
            i18nKey="pricingText"
            components={{
              takeRate: <Link to="/team/posts/16"></Link>,
              p: <p></p>,
              giveDirectly: <Link to="/team/support"></Link>,
            }}
          ></Trans>
          <p>{t("morePricing")}</p>
          <h3>Pricing FAQ</h3>
          <CollapsibleList>
            <CollapsibleLI
              title="How do payouts work?"
              answer={
                <>
                  We use <a href="https://stripe.com/">Stripe</a> to process
                  payments. Artists will have to create an account with Stripe,
                  linking their bank account or debit card to the service to
                  receive payouts. Then as users purchase their albums or
                  subscribe to them, this money will be sent directly to their
                  Stripe account.
                </>
              }
            />
          </CollapsibleList>
        </div>
        <div>
          <H2>Who's doing this work</H2>

          <p>
            Our members have experience working both within Resonate and Ampled,
            other co-ops across several industries, and complex high-traffic web
            platforms. We envision this platform as a tool to support musicians
            in cultivating direct and reciprocal relationships and resources to
            sustain one another’s creative practice.
          </p>
          <p>
            While Mirlo is legally incorporated as an LLC recognized by the
            United States of America, our work is hugely dependent on a network
            of people who have helped us with get to where we are. We're
            immensely grateful to everyone who is supporting us through labor or
            financial contributions to get us here.
          </p>
          <p>
            Mirlo is structured as a worked owned co-operative. Our three
            worker-owners are featured on <a href="/team">our team page</a>.
          </p>
          <p>
            We are still finalizing our Operating Agreement, but once it's
            finished we will share it here. We're pursuing a structure inspired
            by Sociocracy.
          </p>
          <h3>Structure FAQ</h3>
          <CollapsibleList>
            <CollapsibleLI
              title="What makes Mirlo different from other products?"
              answer={
                <>
                  Mirlo allows for direct and ongoing support of artists. It’s
                  different from other crowdfunding platforms because it:
                  <ul>
                    <li>
                      is rooted in mutual aid and an explicitly anti-capitalist
                      and anti-oppressive practice;
                    </li>
                    <li>
                      is stewared by a worker co-op, which intends to
                      exit-to-community as a multi-stakeholder cooperative;
                    </li>
                    <li>
                      It’s open source and is working together with other
                      similar products to build towards a standard-based and
                      sustainable ecosystem.
                    </li>
                  </ul>
                </>
              }
            />
            <CollapsibleLI
              title="How are decisions made?"
              answer={
                <>
                  Mirlo is maintained by a worker co-operative heavily rooted in
                  a community of musicians and other interested people. Every
                  feature on the platform is developed with input and insights
                  from the community.
                </>
              }
            />
            <CollapsibleLI
              title="How can I get in touch?"
              answer={
                <>
                  Our community is primarily hanging out on the{" "}
                  <a href="https://discord.gg/XuV7F4YRqB">Discord</a> of our
                  parent project. Come say hi!
                </>
              }
            />
            <CollapsibleLI
              title="Have you heard of &lt;project x>?"
              answer={
                <>
                  Probably! As individuals we’ve worked with and in Resonate and
                  Ampled, and we’re in touch with a couple of other projects
                  that are doing very similar things like jam.coop, faircamp,
                  ampwall, patrontape, tone.audio, and some others. We’re hoping
                  to continue talking to these folks and build towards
                  standardization of resources and tech APIs so that our
                  services can talk to each other and musicians can easily
                  switch between them. If there’s a project you want to talk
                  about, bring it up in our{" "}
                  <a href="https://discord.gg/XuV7F4YRqB">Discord</a>!
                </>
              }
            />
          </CollapsibleList>
        </div>
        <H2>What we're building</H2>
        <CollapsibleList>
          <CollapsibleLI
            title="Whats on your product roadmap?"
            answer={
              <>
                Check out our{" "}
                <a href="https://github.com/funmusicplace/mirlo/issues">
                  GitHub issues tracker
                </a>{" "}
                for what we're working on
              </>
            }
          />
          <CollapsibleLI
            title={"Tell me about your tech stack"}
            answer={
              <>
                Our front-end is a TypeScript react app and our back-end is a
                node TypeScript express app. We’re hosted on
                <a href="https://render.com/">Render</a>. You can see all of{" "}
                <a href="https://github.com/funmusicplace/mirlo/">
                  our code on GitHub
                </a>
              </>
            }
          />
          <CollapsibleLI
            title={"Are you open source?"}
            answer={
              <>
                Yes! And we want your help 🙂.{" "}
                <a href="https://github.com/funmusicplace/mirlo">
                  Check out our code
                </a>
                .
              </>
            }
          />
          <CollapsibleLI
            title="Will you use my music for AI training purposes?"
            answer={<>No!</>}
          />
          <CollapsibleLI
            title="Can I help with testing?"
            answer={
              <>
                Yes please! Reach out to either LLK or Si on the{" "}
                <a href="https://discord.gg/XuV7F4YRqB">Discord</a> to get
                started.
              </>
            }
          />
          <CollapsibleLI
            title="What are the main blockers facing Mirlo?"
            answer={
              <>
                Our main blocker is getting the word out! If you want to help
                out with marketing,{" "}
                <a href="mailto:mirlodotspace@protonmail.com">
                  please reach out
                </a>
                !
              </>
            }
          />
          <CollapsibleLI
            title="What file formats do you support?"
            answer={
              <>
                For upload we support lossless file formats (flac, wav). We
                convert files across formats to be available to purchasers, as
                well as converting them to HLS and a couple of mp3 bitrates.
              </>
            }
          />
        </CollapsibleList>
        <div>
          <H2>Road to self-sustainability</H2>
          <p>
            Mirlo is an ambitious project, and to pull it off we will need money
            to pay ourselves for our time as well as for all the material costs
            of running a business at this scale.
          </p>
          <p>
            As outlined above, Mirlo takes a small percentage from each
            transaction on the platform. However, for that to make us
            sustainable, we will need over 100s of thousands of dollars moving
            through the platform on any given month (see our{" "}
            <a href="/team/posts/16/">take rate discussion</a>). So we need to
            get creative. But before we dive into how we do that, consider
            supporting some artists on Mirlo!
          </p>
          <p>
            In May / June of 2024 we{" "}
            <a href="https://www.kickstarter.com/projects/mirlo/mirlo">
              ran a successful kickstarter
            </a>{" "}
            which gave us some runway for the rest of 2024. It would cover our
            basic costs including legal fees, server fees, travel fees, and
            more. We will link to our budget for the second half of 2024 once
            it's available.
          </p>
          <p>
            We are also running an ongoing crowdfunding campaign on Mirlo
            itself. You can pitch in to that campaign on{" "}
            <a href="/team/support">our team's</a> support page.
          </p>
          <p>
            We've received a grant from the Greater Washington Center for
            Employee Ownership to{" "}
            <a href="/team/posts/72/">further cooperative education in DC</a>{" "}
            and put on an event in the area.
          </p>
        </div>
      </MarkdownWrapper>
    </PageMarkdownWrapper>
  );
};

const CollapsibleList = styled.ul`
  list-style: none;
  margin-left: 0;
  padding-left: 0;
`;

const CollapsibleLI: React.FC<{
  title: string;
  answer: React.ReactElement;
}> = ({ title, answer }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <li
      className={css`
        border-bottom: 1px solid var(--mi-darken-x-background-color);
        margin: 0 !important;
        padding: 0.5rem 1rem;

        > div {
          margin-bottom: 0.75rem;
          margin-top: 0.5rem;
        }
      `}
    >
      <button
        className={css`
          border: none;
          background: none;
          font-size: inherit;
          cursor: pointer;
          width: 100%;
          text-align: left;

          display: flex;
          align-items: center;

          svg {
            margin-right: 0.5rem;
          }
        `}
        onClick={() => setIsOpen((val) => !val)}
      >
        <FaChevronRight />
        <strong>{title}</strong>
      </button>
      {isOpen && <div>{answer}</div>}
    </li>
  );
};

export default About;
