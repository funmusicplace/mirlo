import { MetaCard } from "./common/MetaCard";
import { Link } from "react-router-dom";
import MarkdownWrapper from "./common/MarkdownWrapper";

const FAQ: React.FC = () => {
  return (
    <MarkdownWrapper>
      <MetaCard
        title="FAQ"
        description="Some frequently asked questions about Mirlo"
      />
      <Link to="/">&#8612; Home</Link>
      <h1>Frequently Asked Questions (FAQ)</h1>
      <h2>What we're building</h2>
      <h3>What is Mirlo?</h3>
      <p>
        Mirlo provides a user-friendly space to help musicians sell music,
        manage subscriptions, and share with their supporters.
      </p>
      <h3>How does Mirlo work?</h3>
      <p>
        Mirlo allows musicians to set up pages to host their music and set up
        tiers of monthly support. Fans can then purchase those albums or support
        musicians through monthly payments and get updates from them when they
        post on Mirlo.
      </p>
      <h3>How much does Mirlo cost?</h3>
      <p>
        Once incorporated, we’ll explore a number of funding structures. We’re
        aiming for musicians to get as much of the price of their albums and
        subscriptions as possible while still supporting the workers and
        infrastructure of the co-op. We will likely add ways for purchasers to
        support the platform directly.
      </p>
      <h3>What makes Mirlo different from other products?</h3>
      <p>
        Mirlo allows for direct and ongoing support of artists. It’s different
        from other crowdfunding platforms because it:{" "}
      </p>
      <ul>
        <li>
          is rooted in mutual aid and an explicitly anti-capitalist and
          anti-oppressive practice;{" "}
        </li>
        <li>
          is stewared by a worker co-op, which intends to exit-to-community as a
          multi-stakeholder cooperative;{" "}
        </li>
        <li>
          It’s open source and is working together with other similar products
          to build towards a standard-based and sustainable ecosystem.
        </li>
      </ul>
      <h3>What are the long term goals of Mirlo?</h3>
      <p>
        We believe that the community is the platform and our goals, informed by
        our{" "}
        <a href="https://funmusic.place/observations-and-intent/">
          Observations and Intent
        </a>
        , will grow and change along with the community. That said, we would
        like to make it easier for other groups (like music labels or other
        co-ops) to install the software. We’d also like to look into building
        plug-ins and other tools that are useful for artists (for example,
        plug-ins that help to make your music available on aggregators like
        Distrokids or other platforms).
      </p>
      <h3>What are the short term goals of Mirlo?</h3>
      <p>
        We’d like to release a minimum viable product that allows Artists to
        sell digital music in a few file formats People to become “patrons” of
        artists Compensate workers who are contributing to Mirlo's success To
        cover costs, we would aim to initially take a fairly small cut (if at
        all) via tips and patronage via our page on the platform (maybe with
        some fundraising releases).
      </p>
      <h3>What are the main blockers facing Mirlo?</h3>
      <p>
        Our main blocker is incorporation! If you are a lawyer or know someone
        who is a lawyer specialized in co-op law,{" "}
        <a href="mailto:mirlodotspace@protonmail.com">please reach out</a>!
      </p>
      <h3>What’s on your product roadmap?</h3>
      <p>
        We’re still aiming to get to a minimum viable product, for which you can
        track progress on{" "}
        <a href="https://github.com/funmusicplace/mirlo/issues">
          our GitHub issues tracker
        </a>
        .
      </p>
      <h3>Have you heard of "project x"?</h3>
      <p>
        Probably! As individuals we’ve worked with and in Resonate and Ampled,
        and we’re in touch with a couple of other projects that are doing very
        similar things like jam.coop, faircamp, and some others. We’re hoping to
        continue talking to these folks and build towards standardization of
        resources and tech APIs so that our services can talk to each other and
        musicians can easily switch between them. If there’s a project you want
        to talk about, bring it up in our{" "}
        <a href="https://discord.gg/XuV7F4YRqB">Discord</a>!
      </p>

      <h3>How do payouts work?</h3>
      <p>
        We use Stripe to process payments. Artists will have to create an
        account with Stripe, linking their bank account or debit card to the
        service to receive payouts. Then as users purchase their albums or
        subscribe to them, this money will be sent directly to their Stripe
        account.
      </p>

      <h2>The people doing it</h2>

      <h3>How are you structured?</h3>
      <p>
        Mirlo is currently a collective of people interested in building a
        worker-coop accountable to a community that uses its product. We’re a
        part of <a href="https://funmusic.place/">Fun Music Place</a>, which is
        a community having wider conversations about the music industry. We’re
        actively writing bylaws for incorporation, and will be a part of the US
        Federation of Worker Cooperatives when we’re done. As the product grows
        and proves to be sustainable we’re aiming to{" "}
        <a href="https://www.colorado.edu/lab/medlab/exit-to-community">
          Exit to Community
        </a>
        .
      </p>

      <h3>How are decisions made?</h3>
      <p>
        Mirlo is maintained by a worker co-operative heavily rooted in a
        community of musicians and other interested people. Every feature on the
        platform is developed with input and insights from the community.
      </p>
      <h3>How can I get in touch?</h3>
      <p>
        Our community is primarily hanging out on the{" "}
        <a href="https://discord.gg/XuV7F4YRqB">Discord</a> of our parent
        project <a href="https://funmusic.place/">Fun Music Place</a>. Come say
        hi!
      </p>

      <h2>Code</h2>
      <h3>Are you open source?</h3>
      <p>
        Yes! And we want your help 🙂.{" "}
        <a href="https://github.com/funmusicplace/mirlo/">Check out our code</a>
        .
      </p>

      <h3>Can I help with testing?</h3>
      <p>
        Yes please! Reach out to either LLK or Si on the{" "}
        <a href="https://discord.gg/XuV7F4YRqB">Discord</a> to get started.
      </p>
    </MarkdownWrapper>
  );
};

export default FAQ;
