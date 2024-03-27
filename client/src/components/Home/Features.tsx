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

const Feature = styled.div`
  max-width: 100%;
  padding: 1rem 2rem 1rem 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;

  strong {
    padding-bottom: 0.75rem;
    display: block;
  }

  p {
    &:not(:last-child) {
      margin-bottom: 1rem;
    }
  }

  .description {
    max-width: 60%;
    padding: 2rem;
  }

  img {
    max-width: 30%;
  }
`;

const Features = () => {
  return (
    <WidthWrapper variant="full" className={css``}>
      <Container
        variant="full"
        className={css`
          height: 64vh;
          display: flex;
          align-items: center;
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
            src="/images/MirloPaintBird.svg"
            className={css`
              max-width: 100%;
              // margin-right: -25rem;
              max-width: 300px;
              margin-top: 2rem;
            `}
          />
        </WidthWrapper>
      </Container>

      <Container
        variant="full"
        className={css`
          padding: 2rem;
          background: var(--mi-pink);
          color: var(--mi-white);
        `}
      >
        <WidthWrapper
          variant="medium"
          className={css`
            display: flex;
            flex-wrap: wrap;
          `}
        >
          <Feature>
            <div className="description">
              <strong>
                Have aliases, several bands or unrelated projects?
              </strong>{" "}
              <p>
                From a single user account login, you can generate as many
                artist pages as you need or want.
              </p>
            </div>
            <img
              src="/images/multiple-artist-accounts.png"
              alt="multiple artist accounts"
            />
          </Feature>
          <Feature>
            <img src="/images/bulk-upload.png" alt="upload tracks in bulk" />

            <div className="description">
              <strong>Have a lot of music to upload?</strong>
              <p>
                You're prolific! We get it. Or you're a label! Batch upload an
                album in one click just drag and drop the content of your album
                folder and you're good to go! The upload process is quick and
                painless to make it easy for you to upload your catalogue. Want
                to upload more than 10 albums?{" "}
                <a
                  className={css`
                    color: white;
                    text-decoration: underline;
                  `}
                  href="mailto:mirlodotspace@proton.me"
                >
                  Get in touch with us!
                </a>
              </p>
            </div>
          </Feature>
          <Feature>
            <div className="description">
              <strong>
                Need your work to appear somewhere else than on Mirlo?
              </strong>{" "}
              <p>
                Embed your tracks and albums on your own website or anywhere
                else.
              </p>
            </div>
            <img src="/images/embed-2.png" alt="page control" />
          </Feature>
          <Feature>
            <img src="/images/embed-1.png" alt="embed" />

            <div className="description">
              <strong>Want control over what your page looks like?</strong>
              <p>
                Style your page! Mirlo's default theme is designed to work well
                even without adding any visual should you want to keep things
                minimalistic, but feel free to personalize your page by adding
                custom backgrounds and changing the default colors.
              </p>
            </div>
          </Feature>
          <Feature>
            <div className="description">
              <strong>
                Have a community of supporters you want to stay in touch with?
              </strong>
              <p>
                Let your community know where you are on the internet. Add links
                to social media and an email address to let people contact you.
              </p>
              <p>
                Keep your community engaged through blogposts that appear
                directly on your artist page, and are RSS feed compatible. Blog
                posts can be made public or sent to specific supporter tiers.
                You can embed music hosted on Mirlo directly in your blog posts.
              </p>
            </div>
            <img src="/images/community-share.png" alt="community share" />
          </Feature>
          <Feature>
            <img src="/images/monthly-donations.png" alt="monthly donations" />

            <div className="description">
              <strong>Want to have a predictable source of income?</strong>
              <p>
                Setup subscriptions so people can support your work, add
                multiple tiers for premium exclusive contents, or just keep it
                light and easy with a simple newsletter that your listeners can
                subscribe to for free even if they don't have a Mirlo account.
              </p>
            </div>
          </Feature>
          <Feature>
            <div className="description">
              <strong>Need to interact with an international audience?</strong>
              <p>
                We can support artists from 46 countries around the world. If
                you're one of these countries you can sell to people anywhere in
                the world
              </p>
            </div>
            <img src="/images/international.png" alt="map" />
          </Feature>
          {/* <h2>Listener Features</h2>
        <p>
          Subscribe and support artists and access their content directly from
          your Mirlo account, or through emails or RSS feeds.
        </p>
        <p>
          Browse and listen to your collection of purchases or wishlested albums
          easily, on mobile or desktop with a simple and elegant interface.
        </p> */}
        </WidthWrapper>
      </Container>
    </WidthWrapper>
  );
};

export default Features;
