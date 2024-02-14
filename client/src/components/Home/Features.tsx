import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { WidthWrapper } from "components/common/WidthContainer";
import { FaArrowDown } from "react-icons/fa";

const Container = styled(WidthWrapper)`
  padding-top: 2rem;
  margin-bottom: 4rem;

  h2 {
    font-size: 3rem;
    line-height: 3rem;
  }
`;

const Features = () => {
  return (
    <WidthWrapper variant="full">
      <Container
        variant="full"
        className={css`
          background: var(--mi-pink);
          color: var(--mi-white);
          height: 64vh;
        `}
      >
        <WidthWrapper
          variant="medium"
          className={css`
            display: flex;
            overflow: hidden;
          `}
        >
          <div
            className={css`
              padding-left: 2rem;
              padding-top: 2rem;
              padding-right: 1rem;
            `}
          >
            <h2>Mirlo for Artists</h2>
            <p
              className={css`
                font-size: 1.6rem;
                padding-top: 0.5rem;
                padding-bottom: 0.5rem;
              `}
            >
              Mirlo provides a user-friendly space to help musicians sell music,
              manage subscriptions, and share with their supporters.
            </p>
            <span
              className={css`
                display: flex;

                svg {
                  margin-left: 0.5rem;
                }
              `}
            >
              Learn more <FaArrowDown />
            </span>
          </div>

          <img
            alt="Mowukis Cover Page"
            src="/images/features/artist-page-sample-1.png"
            className={css`
              max-width: 100%;
              margin-right: -25rem;
              margin-top: 2rem;
            `}
          />
        </WidthWrapper>
      </Container>

      <Container
        variant="medium"
        className={css`
          padding: 2rem;

          p {
            margin: 4rem 1rem;
            max-width: 40%;
            display: inline-block;
          }
        `}
      >
        <p>
          Have aliases, several bands or unrelated projects? From a single user
          account login, you can generate as many artist pages as you need or
          want.
        </p>
        <p>
          Batch upload an album in one click: just drag and drop the content of
          your album folder and you're good to go! The upload process is quick
          and painless to make it easy for you to upload your catalogue.
        </p>
        <p>
          Need your work to appear somewhere else than on Mirlo? Embed your
          tracks and albums on your own website or anywhere else.
        </p>
        <p>
          Style your page: Mirlo's default theme is designed to work well even
          without adding any visual should you want to keep things minimalistic,
          but feel free to personalize your page by adding custom backgrounds
          and changing the default colors.
        </p>
        <p>
          Let your community know where you are on the internet. Add links to
          social media and an email address to let people contact you
        </p>
        <p>
          Keep your community engaged through blogposts that appear directly on
          your artist page, and are RSS feed compatible. Blog posts can be made
          public or sent to specific supporter tiers. You can embed music hosted
          on Mirlo directly in your blog posts.
        </p>
        <p>
          Setup subscriptions so people can support your work, add multiple
          tiers for premium exclusive contents, or just keep it light and easy
          with a simple newsletter that your listeners can subscribe to for free
          even if they don't have a Mirlo account.
        </p>
        <p>We currently support payments from 46 countries.</p>
        {/* <h2>Listener Features</h2>
        <p>
          Subscribe and support artists and access their content directly from
          your Mirlo account, or through emails or RSS feeds.
        </p>
        <p>
          Browse and listen to your collection of purchases or wishlested albums
          easily, on mobile or desktop with a simple and elegant interface.
        </p> */}
      </Container>
    </WidthWrapper>
  );
};

export default Features;
