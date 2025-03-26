import { Trans, useTranslation } from "react-i18next";
import { PageMarkdownWrapper } from "components/Post/index";
import { MetaCard } from "../common/MetaCard";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MarkdownWrapper from "../common/MarkdownWrapper";
import React from "react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { FaChevronRight, FaLink } from "react-icons/fa";

const H2 = styled.h2`
  margin-top: 2rem !important;
  margin-bottom: 1rem;
`;

const Person = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 2rem;

  img {
    max-width: 10rem;
    margin-right: 2rem;
    border-radius: var(--mi-border-radius);
  }

  p {
    margin-top: -0.25rem;
  }
`;

const About: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "about" });

  return (
    <PageMarkdownWrapper
      className={css`
        margin-top: 2rem !important;

        h1 {
          margin-top: 1rem;
          font-family: "Cubano", var(--mi-font-family-stack);
        }

        h2 {
          font-family: "Cubano", var(--mi-font-family-stack);
        }

        p {
          margin-bottom: 1.25rem;
        }
      `}
    >
      <MetaCard
        title="About"
        description="Mirlo provides a user-friendly space to help artists sell digital music, receive financial support, manage mailing lists, and share with their supporters."
      />
      <Link to="/">&#8612; {t("home")}</Link>
      <h1>{t("about")}</h1>
      <p>{t("intro")}</p>
      <H2>{t("ourMission")}</H2>
      <Trans i18nKey="missionStatement" t={t}>
        <p>
          The music industry does not work for artists or listeners and needs a
          radical re-imagining.
        </p>
        <p>
          Mirlo hosts a community of artists, listeners, organizers, and coders
          who are daring to do just that: taking lessons learned from working in
          the solidarity economy and applying them to our platform.
        </p>
        <p>
          We are building an online audio distribution and patronage platform
          that aims to be radical, accessible, open source (free & libre),
          modular, and standards based.
        </p>
      </Trans>

      <div>
        <H2HashLink id="features">{t("features")}</H2HashLink>
        <Trans
          i18nKey="featuresText"
          t={t}
          components={{
            p: <p></p>,
            featuresLink: <Link to="/pages/features"></Link>,
          }}
        />

        <H2HashLink id="pricing">{t("pricing")}</H2HashLink>
        <Trans
          t={t}
          i18nKey="pricingText"
          components={{
            takeRate: <Link to="/team/posts/204"></Link>,
            p: <p></p>,
            giveDirectly: <Link to="/team/support"></Link>,
            i: <em></em>,
            proportionally: (
              <a href="https://nham.co.uk/2025/03/musicians-how-to-receive-more-money-for-each-track-sold/"></a>
            ),
          }}
        />
      </div>
      <div>
        <H2HashLink id="story">Our story</H2HashLink>

        <p>
          The idea of Mirlo grew out of conversations that began in late 2022 as
          a handful of musicians, technologists, and mutual aid organizers began
          to find each other and reflect on their experiences working with two
          ongoing music cooperative initiatives at the time,{" "}
          <a href="https://ampled.com/">Ampled</a> and{" "}
          <a href="https://resonate.coop/">Resonate</a>. Through those
          conversations, we began to develop a shared analysis of today’s
          precarious music industry and invited others to join us in the
          conversations we published online at{" "}
          <a href="https://funmusic.place">Fun Music Place</a>. We also started
          to{" "}
          <a href="https://funmusic.place/blog/the-spotify-ai-blues/">
            dream together
          </a>{" "}
          about what alternatives that foregrounded mutual aid and the value of
          musical creativity might actually look like. Two of the group members,
          LLK and Si, wrote code for an initial software product.
        </p>
        <p>
          As these conversations unfolded, Bandcamp was sold again, firing half
          of their employees in the process. We realized the heightened need for
          viable alternatives to the corporate giants. Ultimately, three of us
          who were based in the United States{" "}
          <a href="https://mirlo.space/team/posts/10/"> formed an LLC</a> and
          became the <a href="#team">official co-founders and worker-owners</a>{" "}
          , with other contributors continuing to offer support internationally.
          We joined the{" "}
          <a href="https://www.usworker.coop/en/">
            US Federation of Worker Cooperatives
          </a>{" "}
          as a startup member and are currently finalizing our operating
          agreement to incorporate consent-based cooperative governance into our
          foundational protocols, inspired by the principles of{" "}
          <a href="https://www.sociocracyforall.org/sociocracy/">Sociocracy</a>.
        </p>
      </div>
      <div>
        <H2HashLink id="media">In the media</H2HashLink>
        <h3>Podcasts</h3>
        <ul
          className={css`
            margin-left: 0 !important;
            list-style: none;
            list-decoration: none;

            & li {
              margin-left: 0;
              display: inline-block;
              margin-right: 1rem;

              img {
                width: 100px;
                height: 100px;
                border-radius: var(--mi-border-radius);
              }
            }
          `}
        >
          <li>
            <a
              href="https://pca.st/53x15cjf"
              title="Interview on It Could Happen Here"
            >
              <img
                alt="It could happen here"
                src="/static/images/media/ichh.jpg"
              />
            </a>
          </li>
          <li>
            <a
              title="Second interview on Everything Co-op"
              href="https://everything.coop/episodes/simon-vansintjan-alex-rodr%C3%ADguez-highlight-advancements-and-future-endeavors-for-music-platform-mirlo/"
            >
              <img
                alt="Everything Co-op"
                src="/static/images/media/everything-co-op.png"
              />
            </a>
          </li>
          <li>
            <a
              title="An Interview with Alex Rodríguez of Mirlo"
              href="https://www.youtube.com/watch?v=HjumzWRTR7U"
            >
              <img
                alt="Grassroots Economic Organizing"
                src="/static/images/media/geo-logo-sun-road.png"
              />
            </a>
          </li>
          <li>
            <a
              title="Simon Vansintjan on Mirlo"
              href="https://podcast.sustainoss.org/234"
            >
              <img alt="Sustain" src="/static/images/media/sustain.jpg" />
            </a>
          </li>
          <li>
            <a
              title="The music industry is dependent on underpaid workers"
              href="https://podcasts.apple.com/us/podcast/the-music-industry-is-dependent-on-underpaid-workers/id1375082413?i=1000678928151"
            >
              <img
                alt="Power Station"
                src="/static/images/media/power-station.webp"
              />
            </a>
          </li>
        </ul>
        <p>
          Want to to talk to us? Contact us at{" "}
          <a href="mailto:hi@mirlo.space">hi@mirlo.space</a>.
        </p>
      </div>
      <div>
        <H2HashLink id="team">Our team</H2HashLink>
        <p>
          Behind the platform Our members have experience working both within
          Resonate and Ampled, other co-ops across several industries, and
          complex high-traffic web platforms. We envision this platform as a
          tool to support musicians in cultivating direct and reciprocal
          relationships and resources to sustain one another’s creative
          practice.
        </p>
        <p>
          While Mirlo is legally incorporated as an entity recognized by the
          United States of America, our work is hugely dependent on a network of
          people who have helped us with get to where we are.
        </p>
        <p>
          We're immensely grateful to everyone who is supporting us through
          labor or financial contributions to get us here.
        </p>
        <h3>Our operating agreement</h3>
        <div>
          <p>
            We're delighted to publicly share{" "}
            <a href="https://mirlo.space/static/Mirlo-Bylaws.pdf">
              our operating agreement
            </a>
            . The company is managed by its members, listed below.
          </p>
          <p>
            Decisions on behalf of the company are made by consent of members,
            meaning that no member objects to the decision taken. Feel free to{" "}
            <a href="https://www.sociocracyforall.org/consent-decision-making/">
              learn more here
            </a>{" "}
            about consent-based decision-making from our friends at Sociocracy
            for All.
          </p>
          <p>
            Members can also delegate specific domains of decision-making to
            circles, defined teams that can include both members and
            non-members. Those circles can make decisions within their delegated
            domain by consent, without having to run it by the full members'
            circle.{" "}
            <a href="https://www.sociocracyforall.org/organizational-circle-structure-in-sociocracy/">
              This article from Sociocracy for All
            </a>{" "}
            offers a good introduction to the organizational logic behind
            circles, based on the principles of effectiveness, equivalence, and
            transparency.
          </p>
        </div>
        <h3>The worker owners</h3>
        <Person>
          <span
            className={css`
              display: inline-block;
              width: 10rem;
              height: 10rem;
              overflow: clip;
              border-radius: 100%;
              margin-right: 2rem;
            `}
          >
            <img
              src="https://mirlo.space/static/images/owner-pictures/alex-photo.png"
              alt="alex photo"
              className={css`
                margin-top: -2rem;
              `}
            />
          </span>

          <p>
            Alex (he / him) is a writer, organizer, and trombonist working at
            the confluences of music and social transformation. He holds a PhD
            in Ethnomusicology from UCLA, where his research focused on jazz
            clubs and the communities that sustain them in Los Angeles, USA;
            Santiago, Chile; and Novosibirsk, Siberia. His writing on the
            contemporary jazz world has appeared in The Newark Star-Ledger, NPR
            Music, LA Weekly, and DownBeat, among other outlets. He has also
            trained in Deep Listening through the Center for Deep Listening and
            is currently preparing his debut album project, Somewhere Else!!!!,
            with three Chilean collaborators. Alex has worked in the solidarity
            economy movement as co-founder of the mental health worker
            cooperative, Catalyst Cooperative Healing, as a working member of
            Sociocracy for All, and as an Artist-Owner of Ampled.{" "}
          </p>
        </Person>
        <Person>
          <span
            className={css`
              display: inline-block;
              width: 10rem;
              height: 10rem;
              overflow: clip;
              border-radius: 100%;
              margin-right: 2rem;
            `}
          >
            <img
              src="https://mirlo.space/static/images/owner-pictures/simon-photo.jpg"
              alt="si photo"
              className={css`
                margin-top: -2rem;
              `}
            />{" "}
          </span>

          <p>
            Simon (he / him) is a mutual aid, solidarity economy, and dual power
            organizer in DC. In his free time he plays soccer and doodles. He
            used to have a weekly radio slot on public radio, and has done music
            journalism in a past life. As a wage laborer he has worked as a
            software developer for UN organizations, fortune 500 companies, user
            experience agencies, fast growing start-ups, and not-for-profit
            organizations.
          </p>
        </Person>

        <h3>Previous member owners</h3>
        <ul>
          <li>
            <strong>jodi</strong>, one of our original co-owners, who helped
            guide the direction and culture of mirlo during its first year
          </li>
        </ul>

        <h3>Everyone else</h3>

        <p>
          It's impossible to list everyone who—through their unpaid labor—has
          made this project a success, but we want to give a special shout out
          to:
          <ul>
            <li>
              <strong>
                <a href="https://mowukis.com">Louis-Louise Kay</a>
              </strong>
              , who has tirelessly advocated, worked on, and given feedback on
              the platform
            </li>
            <li>
              <strong>Han</strong>, who has been a stalwart of our community,
              our insights, and collective education
            </li>
            <li>
              <strong>Diane</strong>, who has helped with facilitation,
              brainstorming, and general support and insights
            </li>
            <li>
              <strong>
                <a href="https://medium.com/@daspitzberg">Danny</a>
              </strong>
              , who has connected us with people across the co-operative
              movement, and provided valuable insights and history
            </li>
            <li>
              <strong>
                Obigre, <a href="https://viiii.neocities.org/">viiii</a>, and
                many others
              </strong>
              , who have been instrumental in translation efforts of the Mirlo
              website
            </li>
            <li>
              James, who has helped significantly push forward the Mirlo code.
            </li>
          </ul>
        </p>
      </div>
      <div>
        <H2HashLink id="need-support">We need your support</H2HashLink>
        <p>
          Since our soft launch earlier this year, we have been amazed by the
          influx of support from open source developers, musicians, listeners,
          cultural workers, and cooperative proponents. Still, Mirlo is an
          ambitious project.
        </p>

        <p>
          We need your help to make it a reality. To pull it off we need money
          to pay ourselves for our time as well as for all the material costs of
          running a business at this scale. In May, we{" "}
          <a href="https://www.kickstarter.com/projects/mirlo/mirlo">
            ran a successful kickstarter
          </a>{" "}
          which gave us some runway for the rest of this year. It would cover
          our basic costs including legal fees, server fees, travel fees, etc.
          Our estimated budget can be viewed{" "}
          <a href="link to spreadsheet">here</a>.
        </p>
        <p>
          In the meantime, we are seeking ongoing financial support on Mirlo
          itself. Please pitch in on{" "}
          <a href="https://mirlo.space/team/support">our team's</a> support
          page!
        </p>
        <p>
          We've also received a grant from the Greater Washington Center for
          Employee Ownership to{" "}
          <a href="https://mirlo.space/team/posts/72/">
            further cooperative education in DC
          </a>{" "}
          and put on an event in the area next year. If you're in the DMV region
          and would like to participate, please get in touch.
        </p>
      </div>
      <div>
        <H2HashLink id="vision">Our vision</H2HashLink>
        <p>
          Mirlo aims to bring about a vibrant ecosystem that values creative
          work and ensures that artists don't have to sacrifice basic needs in
          order to follow their inspiration. We believe that in order to bring
          that world about, we need tools to help connect one another through
          music, grounded in the material challenges of musicians struggling
          through the drudgery of isolation and hyperindividualism---especially
          those who come from working-class backgrounds and people of the global
          majority, who are disproportionately impacted by today’s dominant
          systems.
        </p>
        <p>
          Given how much music is mediated through the internet, musicians need
          to have a say in how those tools are built and maintained. We believe
          that an approach that prioritizes long-term sustainability, emphasizes
          transparency, practices informed consent, and welcomes serendipity
          through open standards will offer a path towards these goals.
        </p>
        <p>
          We also recognize that some of these ideals will have to be negotiated
          through intense contradictions as they come into conflict with the
          ruins of the market-driven music industry we're living in today. To
          work through those contradictions, we prioritize building trust,
          sharing joy, and fostering resilient relationships to find creative
          pathways towards this vision together.
        </p>
      </div>
      <div>
        <H2HashLink id="faq">FAQ</H2HashLink>
        <h3 id="pricing-faq">Pricing</h3>
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
        <h3 id="structure-faq">Structure</h3>
        <CollapsibleList>
          <CollapsibleLI
            title="What makes Mirlo different from other products?"
            id="different-from-other-products"
            answer={
              <>
                <p>
                  Mirlo allows for direct and ongoing support of artists. It’s
                  different from other crowdfunding platforms because it:
                </p>
                <ul>
                  <li>
                    is rooted in mutual aid and is stewared by a worker co-op,
                    which intends to exit-to-community as a multi-stakeholder
                    cooperative;
                  </li>
                  <li>
                    It’s open source and is working together with other similar
                    products to build towards a standard-based and sustainable
                    ecosystem.
                  </li>
                </ul>
                <table
                  cellSpacing={0}
                  className={css`
                    min-width: 1080px;
                    margin-left: -200px;
                    padding: 2rem 0;
                    font-size: 0.9rem;

                    th,
                    td {
                      text-align: center;
                      padding: 0.5rem;
                      line-height: 1.3;
                    }

                    .comparison td,
                    .comparison th {
                      border-right: 1px solid black;
                      text-align: center;
                      max-width: 6rem;

                      &:last-child {
                        border-right: none;
                      }
                    }

                    th:first-child {
                      text-align: right;
                      padding-right: 1rem;
                    }
                  `}
                >
                  <tr>
                    <td></td>
                    <th>Mirlo</th>
                    <th>Bandcamp</th>
                    <th>Patreon</th>
                    {/* <th>Ampwall</th> */}
                    {/* <th>Bandwagon</th> */}
                    {/* <th>Subvert</th> */}
                  </tr>
                  <tr className="comparison">
                    <th>Pricing</th>
                    <td>You decide</td> {/* Mirlo */}
                    <td>%15 of sales</td> {/* Bandcamp */}
                    <td>%8 of support</td> {/* Patreon */}
                    {/* <td>$10/year, 5% of sales</td> Ampwall */}
                    {/* <td>Free</td> Bandwagon */}
                    {/* <td>?</td> Subvert */}
                  </tr>
                  <tr className="comparison">
                    <th>Upload music and sell music</th>
                    <td>✅</td> {/* Mirlo */}
                    <td>✅</td> {/* Bandcamp */}
                    <td>❌</td> {/* Patreon */}
                    {/* <td>✅</td> Ampwall */}
                    {/* <td>✅ sales is being worked on</td> Bandwagon */}
                    {/* <td>Presumably</td> Subvert */}
                  </tr>
                  <tr className="comparison">
                    <th>Merch sales</th>
                    <td>✅</td>
                    <td>✅</td>
                    <td>
                      ❌ <br />
                      but you can link merch sales to your audience
                    </td>{" "}
                    {/* Patreon */}
                    {/* <td>✅</td> */}
                    {/* <td>❌</td> */}
                    {/* <td>❌</td> */}
                  </tr>
                  <tr className="comparison">
                    <th>Monthly support</th>
                    <td>✅</td>
                    <td>✅</td>
                    <td>✅</td> {/* Patreon */}
                    {/* <td>✅</td> */}
                    {/* <td>❌</td> */}
                    {/* <td>❌</td> */}
                  </tr>
                  <tr className="comparison">
                    <th>Blog posts to audience segments</th>
                    <td>✅</td> {/* Mirlo */}
                    <td>✅</td> {/* Bandcamp */}
                    <td>✅</td> {/* Patreon */}
                    {/* <td>❌</td> Ampwall */}
                    {/* <td>❌</td> Bandwagon */}
                    {/* <td>❌</td> Subvert */}
                  </tr>
                  <tr className="comparison">
                    <th>Download codes and press kits</th>
                    <td>✅</td> {/* Mirlo */}
                    <td>✅</td> {/* Bandcamp */}
                    <td>❌</td> {/* Patreon */}
                    {/* <td>❌</td> Ampwall */}
                    {/* <td>❌</td> Bandwagon */}
                    {/* <td>❌</td> Subvert */}
                  </tr>
                  <tr className="comparison">
                    <th>Tip jar</th>
                    <td>✅</td> {/* Mirlo */}
                    <td>❌</td> {/* Bandcamp */}
                    <td>❌</td> {/* Patreon */}
                    {/* <td>❌</td> Ampwall */}
                    {/* <td>❌</td> Bandwagon */}
                    {/* <td>❌</td> Subvert */}
                  </tr>
                  <tr className="comparison">
                    <th>Embed music</th>
                    <td>✅</td> {/* Mirlo */}
                    <td>✅</td> {/* Bandcamp */}
                    <td>✅</td> {/* Patreon */}
                    {/* <td>✅</td> Ampwall */}
                    {/* <td>❌</td> Bandwagon */}
                    {/* <td>❌</td> Subvert */}
                  </tr>
                  <tr className="comparison">
                    <th>Open Source</th>
                    <td>✅</td>
                    <td>❌</td> <td>❌</td>
                    {/* <td>❌</td> */}
                    {/* <td>✅</td> */}
                    {/* <td>❌</td> */}
                  </tr>
                  <tr className="comparison">
                    <th>Worker owned</th>
                    <td>✅</td> {/* Mirlo */}
                    <td>❌</td> {/* Bandcamp */}
                    <td>❌</td>
                    {/* <td>❌</td> Ampwall */}
                    {/* <td>❌</td> Bandwagon */}
                    {/* <td>❌</td> Subvert */}
                  </tr>
                </table>
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
                  We’d also like to look into building plug-ins and other tools
                  that are useful for artists (for example, plug-ins that help
                  to make your music available on aggregators like Distrokids or
                  other platforms).
                </p>
                <p>
                  Eventually, we hope to{" "}
                  <a href="https://blog.fracturedatlas.org/exit-to-community">
                    exit to our community
                  </a>
                  , by bringing in musicians and other key stakeholders into the
                  decision making process.
                </p>
              </>
            }
          />
          <CollapsibleLI
            title="How are decisions made?"
            answer={
              <>
                Mirlo is maintained by a worker co-operative heavily rooted in a
                community of musicians and other interested people. Every
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
                Ampled, and we’re in touch with a couple of other projects that
                are doing very similar things like jam.coop, faircamp, ampwall,
                patrontape, tone.audio, and some others. We’re hoping to
                continue talking to these folks and build towards
                standardization of resources and tech APIs so that our services
                can talk to each other and musicians can easily switch between
                them. If there’s a project you want to talk about, bring it up
                in our <a href="https://discord.gg/XuV7F4YRqB">Discord</a>!
              </>
            }
          />
          <CollapsibleLI
            title="What are the main blockers facing Mirlo?"
            answer={
              <>
                <p>
                  Our main blocker is paying our worker-owners to make space to
                  work on Mirlo. Since we don't take venture capital money to
                  fund our project we are almost entirely dependent on the
                  support of our community. Want to talk about this?{" "}
                  <a href="mailto:mirlodotspace@protonmail.com">via e-mail</a>{" "}
                  or on <a href="https://discord.gg/XuV7F4YRqB">our Discord</a>.
                </p>
                <p>
                  Want to support us with a monthly gift? Do so on{" "}
                  <a href="/team/support">our team's</a> Mirlo profile.
                </p>
              </>
            }
          />
        </CollapsibleList>
        <h3 id="product">Product</h3>
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
        <h3 id="support">Support, etc</h3>
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
                  <a href="/public/Logo-With-Wordmark.svg">SVG with wordmark</a>
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
                  artist to upload music to at any point. To do so, click on the
                  top right menu and click on “Manage Artist”, this will let you
                  add new artists.
                </p>
                <p>
                  Whether or not you want to maintain a separation between your
                  artist account and your listening, is your call
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
                  people to upload higher resolution images. If you have issues
                  with your specific image, please contact us at{" "}
                  <a href="mailto:mirlodotspace@proton.me">
                    mirlodotspace@proton.me
                  </a>
                </p>
              </>
            }
          />
        </CollapsibleList>
      </div>
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
