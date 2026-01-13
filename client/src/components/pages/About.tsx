import { Trans, useTranslation } from "react-i18next";
import { PageMarkdownWrapper } from "components/Post/index";
import { MetaCard } from "../common/MetaCard";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

  p {
    margin-top: -0.25rem;
  }
`;

const PersonPicture = styled.span`
  display: inline-block;
  flex: none;
  width: 10rem;
  height: 10rem;
  overflow: clip;
  border-radius: 100%;
  margin-right: 2rem;
  img {
    max-width: 10rem;
    margin-right: 2rem;
    border-radius: var(--mi-border-radius);
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
            featuresLink: <Link to="https://docs.mirlo.space/features/"></Link>,
          }}
        />

        <H2HashLink id="FAQ">{t("faq")}</H2HashLink>
        <Trans
          t={t}
          i18nKey="linkToDocumentation"
          components={{
            faq: <a href="https://docs.mirlo.space"></a>,
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
        <H2HashLink id="team">Our team</H2HashLink>
        <p>
          Behind the platform Our member stewards have experience working both
          within Resonate and Ampled, other co-ops across several industries,
          and complex high-traffic web platforms. We envision this platform as a
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
            . The company is managed by its{" "}
            <Link to="/team/posts/285/">member stewards</Link>, listed below.
          </p>
          <p>
            Decisions on behalf of the company are made by consent of member
            stewards, meaning that no member steward objects to the decision
            taken. Feel free to{" "}
            <a href="https://www.sociocracyforall.org/consent-decision-making/">
              learn more here
            </a>{" "}
            about consent-based decision-making from our friends at Sociocracy
            for All.
          </p>
          <p>
            Stewards are the people who, through their contributions, help move
            Mirlo forward; we want to ensure that anyone doing this work has an
            opportunity to contribute meaningfully to the decisions that impact
            how the platform runs itself. When someone joins Mirlo as a Steward,
            they can also become legal owners; however, that is not a
            requirement. Either way, Stewards are invited to the regular member
            meetings and consent to decisions that impact the overall ecosystem
            alongside legal members. To read more about how member stewards slot
            operate within Mirlo, read our{" "}
            <Link to="/team/posts/285/">blog post about it</Link>.
          </p>
          <p>
            Work at Mirlo is done in circles, defined teams that can include
            both stewards and organizer volunteers. Those circles can make
            decisions within their delegated domain by consent, without having
            to run it by the full members' circle.{" "}
            <a href="https://www.sociocracyforall.org/organizational-circle-structure-in-sociocracy/">
              This article from Sociocracy for All
            </a>{" "}
            offers a good introduction to the organizational logic behind
            circles, based on the principles of effectiveness, equivalence, and
            transparency.
          </p>
        </div>
        <h3>The member stewards</h3>
        <Person>
          <PersonPicture>
            <img
              src="https://mirlo.space/static/images/owner-pictures/alex-photo.png"
              alt="alex photo"
            />
          </PersonPicture>

          <p>
            Alex is a writer, organizer, and trombonist working at the
            confluences of music and social transformation. His writing on the
            contemporary jazz world has appeared in The Newark Star-Ledger, NPR
            Music, LA Weekly, and DownBeat, among other outlets. Alex has also
            worked in the solidarity economy movement as co-founder of the
            mental health worker cooperative, Catalyst Cooperative Healing, as
            facilitator for the Sociocracy for All Cooperatives Circle, and as
            an Artist-Owner of Ampled. Alex is a legal owner of Mirlo.
          </p>
        </Person>

        <Person>
          <PersonPicture>
            <img
              src="https://mirlo.space/static/images/owner-pictures/llk.webp"
              alt="LLK photo"
            />
          </PersonPicture>

          <p>
            Louis-Louise Kay is a French musician and organizer, who has been
            creating music for games, movies, animation, and as a solo artist
            under the moniker <Link to="/mowukis">MOWUKIS</Link>. LLK has
            contributed to code, design, community engagement, and business
            strategy since Mirlo's beginnings.
          </p>
        </Person>
        <Person>
          <PersonPicture>
            <img
              src="https://mirlo.space/static/images/owner-pictures/roberta.gif"
              alt="Roberta photo"
            />
          </PersonPicture>
          <div>
            <p>
              Roberta is a musician, video maker and amateur puppeteer from the
              Isle of Wight, UK, making “wildly maximalist, mildly-anarchic pop
              music” and has appeared on The Guardian, The Independent and KEXP.
            </p>
            <p>
              She has also previously worked as a designer and marketer,
              occasional stage manager and been involved in an independent
              makers group support network as a co-organiser and social media
              manager, securing funding for events and creating an online
              community hub.
            </p>
          </div>
        </Person>
        <Person>
          <PersonPicture>
            <img
              src="https://mirlo.space/static/images/owner-pictures/simon-photo.jpg"
              alt="Simon photo"
            />
          </PersonPicture>

          <p>
            Simon is a mutual aid, solidarity economy, and dual power organizer
            in DC. In his free time he plays soccer and doodles. He used to have
            a weekly radio slot on public radio, and has done music journalism
            in a past life. As a wage laborer he has worked as a software
            developer for UN organizations, fortune 500 companies, user
            experience agencies, fast growing start-ups, and not-for-profit
            organizations. Simon is a legal owner of Mirlo.
          </p>
        </Person>
        <Person>
          <PersonPicture>
            <img
              src="https://mirlo.space/static/images/owner-pictures/tim-photo.jpg"
              alt="A portrait of Tim in a colorful sweater with a background of lush, green foliage"
            />
          </PersonPicture>
          <p>
            Tim is a software designer and programmer, drummer, audio engineer,
            electronics-tinkerer, and lover of music. Tim has made software in
            the media industry and has played various instruments at local
            venues including radio stations such as WPTS and regionally on the
            Saturday Light Brigade show. With Mirlo, Tim is focused on driving
            accessibility, usability, creativity, and community.
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
    </PageMarkdownWrapper>
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
      <H2>
        {children}
        <FaLink className="inline" />
      </H2>
    </Link>
  );
};

export default About;
