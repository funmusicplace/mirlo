import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { MetaCard } from "components/common/MetaCard";
import { WidthWrapper } from "components/common/WidthContainer";
import { FaArrowDown } from "react-icons/fa";
import { bp } from "../../constants";
import Button from "components/common/Button";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

const Container = styled(WidthWrapper)`
  h2 {
    font-size: 3rem;
    line-height: 3rem;
  }

  @media (prefers-color-scheme: dark) {
    background-color: #be3455;
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
  }
`;

const Feature = styled.div`
  max-width: 100%;
  padding: 1rem 2rem 3.5rem 2rem;
  font-size: 1.2rem;
  display: grid;
  align-items: center;

  &:nth-child(even) {
    grid-template-columns: max(30%) max(60%);
  }
  &:nth-child(odd) {
    grid-template-columns: max(60%) max(30%);
  }
  gap: 5%;
  justify-content: space-between;

  strong {
    padding-bottom: 1.6rem;
    display: block;
    font-size: 1.6rem;
  }

  p {
    &:not(:last-child) {
      margin-bottom: 1rem;
    }
  }

  .description {
    padding: 2rem;
    margin: auto;
  }

  img {
    max-width: 100%;
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: 1rem 1rem 3.5rem 1rem;
    display: flex;
    &:nth-child(even) {
      flex-direction: column;
    }
    &:nth-child(odd) {
      flex-direction: column-reverse;
    }
    .description {
      padding: 2rem 0 0 0;
      margin: auto;
    }
    img {
      max-width: 80%;
      margin: auto;
    }
  }

  @media screen and (max-width: ${bp.small}px) {
    padding: 0 0 1rem 0;
    flex-direction: column-reverse;

    &.reverse {
      flex-direction: column-reverse;
    }

    & .description {
      padding: 1rem;
      max-width: 100%;
    }
  }
`;

const Features = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <WidthWrapper
      variant="full"
      className={css`
        background-color: #f5f0f0 !important;
        @media (prefers-color-scheme: dark) {
          background-color: #161616 !important;
        }
      `}
    >
      <MetaCard
        title="Features"
        description="What's packaged with a Mirlo account? Here's some of our features"
      />
      <Container
        variant="full"
        className={css`
          min-height: 64vh;
          display: flex;
          align-items: center;
          background-color: #f5f0f0 !important;

          @media (prefers-color-scheme: dark) {
            background-color: #161616 !important;
            height: auto;
            padding: 1rem;
            & > div {
              flex-direction: column-reverse;
            }
          }
        `}
      >
        <WidthWrapper
          variant="big"
          className={css`
            display: flex;
            overflow: hidden;
            padding: 2rem;
            gap: 5%;
            justify-content: center;

            @media screen and (max-width: ${bp.medium}px) {
              flex-direction: column;
              padding: 1rem;
            }
            @media (orientation: landscape) {
              min-height: calc(100vh - 125px);
            }
            @media screen and (max-width: ${bp.medium}px) and (orientation: portrait) {
              min-height: calc(100vh - 125px);
            }
          `}
        >
          <div
            className={css`
              padding-left: 2rem;
              padding-top: 2rem;
              display: flex;
              flex-direction: column;
              justify-content: center;

              @media screen and (max-width: ${bp.medium}px) {
                padding: 0.5rem;
              }

              @media screen and (max-width: ${bp.small}px) {
                padding: 1rem 0;
              }
              }
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
            <div>
              <Link to="#features">
                <Button
                  variant="big"
                  className={css`
                    display: flex;

                    svg {
                      margin-left: 0.5rem;
                    }
                  `}
                  onClick={() => {
                    const features = document.getElementById("features");
                    if (features) {
                      features.scrollIntoView({
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  Learn more <FaArrowDown />
                </Button>
              </Link>
            </div>
          </div>

          <img
            alt="Mowukis Cover Page"
            src="/images/MirloPaintBird.svg"
            className={css`
              max-width: 100%;
              // margin-right: -25rem;
              max-width: 38%;
              margin-top: 2rem;

              @media screen and (max-width: ${bp.medium}px) {
                margin-top: 5%;
                max-width: 70%;
              }
            `}
          />
        </WidthWrapper>
      </Container>

      <Container
        id="features"
        variant="full"
        className={css`
          padding: 2rem;
          background: var(--mi-pink);
          color: var(--mi-white);

          @media screen and (max-width: ${bp.small}px) {
            padding: 0;
            flex-direction: column;
          }
        `}
      >
        <WidthWrapper
          variant="big"
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
            <img
              src="/images/bulk-upload.png"
              alt="upload tracks in bulk"
              className={css`
                width: 80%;
                margin: auto;

                @media screen and (max-width: ${bp.medium}px) {
                  width: 65%;
                }
              `}
            />
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
            </div>{" "}
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
            <img
              src="/images/embed-2.png"
              alt="page control"
              className={css`
                width: 60%;
                margin: auto;

                @media screen and (max-width: ${bp.medium}px) {
                  width: 45%;
                }
              `}
            />
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
              <p>
                Don't want to manage another mailing list? Us neither. You can
                migrate your current supporters' emails to Mirlo and do
                everything from one platform.
              </p>
            </div>
            <img src="/images/community-share.png" alt="community share" />
          </Feature>
          <Feature className="reverse">
            <img
              src="/images/monthly-donations.png"
              alt="monthly donations"
              className={css`
                width: 80%;
                margin: auto;

                @media screen and (max-width: ${bp.medium}px) {
                  width: 50%;
                }
              `}
            />
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
          <Feature className="reverse">
            <img src="/images/downloads.png" alt="map" />

            <div className="description">
              <strong>
                Want to share your music with press or close family and friends?
              </strong>
              <p>
                Use download codes to share your music for free with press or
                your proud family members and friends. You can generate an
                unlimited set of codes for download of your music. Distribute it
                with your merch or send it to your press contacts.
              </p>
            </div>
          </Feature>
          <Feature>
            <div className="description">
              <strong>Transparent and consistent pricing.</strong>
              <p>
                Mirlo uses a transparent and consistent pricing model. We charge
                you 7% of your sale, and our payment processor (Stripe) takes a
                roughly 3% cut.
              </p>
            </div>
            <img src="/images/percentage.png" alt="map" />
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
      <Container
        className={css`
          min-height: 34vh;
          display: flex;
          align-items: center;
          background-color: #f5f0f0 !important;

          @media (prefers-color-scheme: dark) {
            background-color: #161616 !important;
            height: auto;
            padding: 1rem;
            & > div {
              flex-direction: column-reverse;
            }
          }
        `}
      >
        <WidthWrapper
          variant="big"
          className={css`
            display: flex;
            overflow: hidden;
            align-items: center;
            gap: 5%;
            justify-content: center;
            font-size: 1.4rem;
            flex-direction: column;
          `}
        >
          <div>
            Excited to get started?{" "}
            <Link to="/signup">
              <Button variant="big">Join Mirlo!</Button>
            </Link>
          </div>
          <div
            className={css`
              margin-top: 1rem;
            `}
          >
            <Trans
              t={t}
              i18nKey="officeHours"
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                features: <a href="/pages/features"></a>,

                office: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a href=" https://calendly.com/mirloofficehours/schedule"></a>
                ),
              }}
            />{" "}
          </div>
        </WidthWrapper>
      </Container>
    </WidthWrapper>
  );
};

export default Features;
