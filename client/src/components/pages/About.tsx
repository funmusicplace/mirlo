import { Trans, useTranslation } from "react-i18next";
import { PageMarkdownWrapper } from "components/Post/index";
import { MetaCard } from "../common/MetaCard";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MarkdownWrapper from "../common/MarkdownWrapper";
import React from "react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { FaChevronRight, FaLink } from "react-icons/fa";
import { ButtonAnchor } from "components/common/Button";

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
            Mirlo is a community of musicians, listeners, cultural workers, and
            coders who are daring to do just that: taking lessons learned in
            working in the solidarity economy and applying them to our process
            and product.
          </p>
          <p>
            We are building an online audio distribution (think Bandcamp) and
            patronage (think Patreon) platform that aims to be radical,
            accessible, open source (free & libre), modular, and standards
            based.
          </p>
        </Trans>

        <div>
          <H2HashLink id="pricing-and-features">
            {t("pricingAndFeatures")}
          </H2HashLink>

          <Trans
            i18nKey="featuresText"
            t={t}
            components={{
              p: <p></p>,
              featuresLink: <Link to="/pages/features"></Link>,
            }}
          ></Trans>
          <Trans
            t={t}
            i18nKey="pricingText"
            components={{
              takeRate: <Link to="/team/posts/16"></Link>,
              p: <p></p>,
              giveDirectly: <Link to="/team/support"></Link>,
              i: <em></em>,
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
          <H2HashLink id="who">Who's doing this work</H2HashLink>

          <p>
            Our members have experience working both within Resonate and Ampled,
            other co-ops across several industries, mutual aid and community
            organizing efforts, and complex high-traffic web platforms. We
            envision this platform as a tool to support musicians in cultivating
            direct and reciprocal relationships and resources to sustain one
            another’s creative practice.
          </p>
          <p>
            While Mirlo is legally incorporated as an LLC recognized by the
            United States of America, our work is hugely dependent on a network
            of people who have helped us get to where we are. We're immensely
            grateful to everyone who is supporting us through labor or financial
            contributions to get us here.
          </p>
          <p>
            Mirlo is structured as a worker owned co-operative. Our three
            worker-owners are featured on <a href="/team">our team page</a>.
          </p>
          <p>
            We are still finalizing our Operating Agreement, but once it's
            finished we will share it here. We're pursuing a structure inspired
            by{" "}
            <a href="https://www.sociocracyforall.org/sociocracy/">
              Sociocracy
            </a>
            . Sociocracy is a governance system, just like democracy or
            corporate governance methods. It values self-governance based on the
            values of equality.
          </p>
          <h3 id="structure-faq">Structure FAQ</h3>
          <CollapsibleList>
            <CollapsibleLI
              title="What makes Mirlo different from other products?"
              id="different-from-other-products"
              answer={
                <>
                  Mirlo allows for direct and ongoing support of artists. It’s
                  different from other crowdfunding platforms because it:
                  <ul>
                    <li>
                      is rooted in mutual aid and is stewared by a worker co-op,
                      which intends to exit-to-community as a multi-stakeholder
                      cooperative;
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
              title="What are the long term goals of Mirlo?"
              id="long-term-goals"
              answer={
                <>
                  <p>
                    Our goals, informed by our{" "}
                    <a href="https://funmusic.place/observations-and-intent/">
                      Observations and Intent
                    </a>
                    , will grow and change along with the community.
                  </p>
                  <p>
                    That said, we would like to make it easier for other groups
                    (like music labels or other co-ops) to install the software.
                    We’d also like to look into building plug-ins and other
                    tools that are useful for artists (for example, plug-ins
                    that help to make your music available on aggregators like
                    Distrokids or other platforms).
                  </p>
                  <p>
                    Eventually, we hope to{" "}
                    <a href="https://blog.fracturedatlas.org/exit-to-community">
                      exit to our community
                    </a>
                    , by bringing in musicians and other key stakeholders into
                    the decision making process.
                  </p>
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
            <CollapsibleLI
              title="What are the main blockers facing Mirlo?"
              answer={
                <>
                  <p>
                    Our main blocker is paying our worker-owners to make space
                    to work on Mirlo. Since we don't take venture capital money
                    to fund our project we are almost entirely dependent on the
                    support of our community. Want to talk about this?{" "}
                    <a href="mailto:mirlodotspace@protonmail.com">via e-mail</a>{" "}
                    or on{" "}
                    <a href="https://discord.gg/XuV7F4YRqB">our Discord</a>.
                  </p>
                  <p>
                    Want to support us with a monthly gift? Do so on{" "}
                    <a href="/team/support">our team's</a> Mirlo profile.
                  </p>
                </>
              }
            />
          </CollapsibleList>
        </div>
        <div>
          <H2HashLink id="road-to-sustainability">
            Road to self-sustainability
          </H2HashLink>
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
        <div>
          <H2HashLink id="what-we-build">What we're building</H2HashLink>
          <p>
            Some frequently asked questions about what and how we're building it
          </p>
          <CollapsibleList>
            <CollapsibleLI
              title="Whats on your product roadmap?"
              id="product-roadmap"
              answer={
                <>
                  Check out our{" "}
                  <a href="https://github.com/funmusicplace/mirlo/issues">
                    GitHub issues tracker
                  </a>{" "}
                  for what we're working on, and what's on{" "}
                  <a href="https://github.com/funmusicplace/mirlo/discussions/categories/ideas">
                    our ideas list
                  </a>{" "}
                  to vote on what you'd like to see.
                </>
              }
            />
            <CollapsibleLI
              title="Tell me about your tech stack"
              id="tech-stack"
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
              title="Are you open source?"
              id="open-source"
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
              id="use-music-ai"
              answer={<>No!</>}
            />
            <CollapsibleLI
              title="Can I help with testing?"
              id="can-help-testing"
              answer={
                <>
                  Yes please! Reach out to either LLK or Si on the{" "}
                  <a href="https://discord.gg/XuV7F4YRqB">Discord</a> to get
                  started.
                </>
              }
            />

            <CollapsibleLI
              title="What file formats do you support?"
              id="file-formats-supported"
              answer={
                <>
                  For upload we support lossless file formats (flac, wav). We
                  convert files across formats to be available to purchasers, as
                  well as converting them to HLS and a couple of mp3 bitrates.
                </>
              }
            />
          </CollapsibleList>
        </div>
        <div>
          <H2HashLink id="support">Support, etc</H2HashLink>
          <p>Here's some common questions asked!</p>

          <CollapsibleList>
            <CollapsibleLI
              title="Do you have brand / logo guidelines?"
              id="brand-logo-guide"
              answer={
                <>
                  <p>
                    Yes! Check out our{" "}
                    <a href="/public/logo-guidelines-jun-30.pdf">
                      logo guidelines as of June 30, 2024
                    </a>
                    .{" "}
                  </p>
                  <p>
                    Logo downloads:{" "}
                    <a href="/public/Logo-With-Wordmark.svg">
                      SVG with wordmark
                    </a>
                    ,{" "}
                    <a href="/public/Logo_Mirlo_Transparent_RedCircle.svg">
                      SVG logo, red
                    </a>
                    ,{" "}
                    <a href="/public/android-chrome-512x512.png">
                      png logo, red (512x512)
                    </a>
                    ,{" "}
                    <a href="/public/Logo_Mirlo_Transparent_BlackCircle.png">
                      png logo, black and white (285x285)
                    </a>
                  </p>
                </>
              }
            />
            <CollapsibleLI
              title="Can an artist make a listener account, will that be a problem in the future?"
              answer={
                <>
                  <p>
                    There’s only one account type on Mirlo! Any user can make an
                    artist to upload music to at any point. To do so, click on
                    the top right menu and click on “Manage Artist”, this will
                    let you add new artists.
                  </p>
                  <p>
                    Whether or not you want to maintain a separation between
                    your artist account and your listening, is your call
                  </p>
                </>
              }
            />
            <CollapsibleLI
              title="How do I add support tiers?"
              answer={
                <>
                  <p>
                    You can add support tiers by going to your artist's profile,
                    clicking “edit page” (or navigating to it through the top
                    right dropdown menu), and then switching to the “Support
                    tiers” tab. There's an “+ add tier” button that will let you
                    create a support tier.
                  </p>
                  <p>
                    To enable this you'll need to sign up with our payment
                    processor Stripe first.
                  </p>
                </>
              }
            />
            <CollapsibleLI
              title="How can I sell individual tracks?"
              answer={
                <>
                  <p>
                    We currently don’t support selling of individual tracks, but
                    if you want to see this feature implemented,{" "}
                    <a href="https://github.com/funmusicplace/mirlo/discussions/509">
                      upvote it on our ideas tracker
                    </a>
                    .
                  </p>
                </>
              }
            />
            <CollapsibleLI
              title="Image support"
              answer={
                <>
                  <p>
                    For our album, avatar, and background images we encourage
                    people to upload higher resolution images. If you have
                    issues with your specific image, please contact us at{" "}
                    <a href="mailto:mirlodotspace@proton.me">
                      mirlodotspace@proton.me
                    </a>
                  </p>
                </>
              }
            />
          </CollapsibleList>
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
  id?: string;
}> = ({ title, answer, id }) => {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (id && hash === `#${id}`) {
      setIsOpen(true);
    }
  }, [hash, id]);

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
      id={id}
    >
      <button
        className={css`
          border: none;
          background: none;
          font-size: inherit;
          cursor: pointer;
          color: var(--mi-normal-foreground-color);
          font-weight: normal;
          width: 100%;
          text-align: left;

          display: flex;
          align-items: center;
          ${isOpen && `font-weight: bold;`}

          svg {
            margin-right: 0.5rem;

            ${isOpen && `transform: rotate(90deg)`}
          }
        `}
        onClick={() => {
          setIsOpen((val) => !val);
          if (id) {
            navigate(`#${id}`);
          }
        }}
      >
        <FaChevronRight />
        <span
          className={css`
            display: flex;
            width: 100%;
            justify-content: space-between;
          `}
        >
          {title}
          {id && <FaLink />}
        </span>
      </button>
      {isOpen && <div>{answer}</div>}
    </li>
  );
};

const H2HashLink: React.FC<{
  id: string;
  children: React.ReactElement | null | string;
}> = ({ id, children }) => {
  return (
    <Link
      to={`#${id}`}
      id={id}
      className={css`
        color: inherit;
        text-decoration: none;

        svg {
          margin-left: 1rem;
          font-size: 1rem;
        }
      `}
    >
      {" "}
      <H2>
        {children}
        <FaLink />{" "}
      </H2>
    </Link>
  );
};

export default About;
