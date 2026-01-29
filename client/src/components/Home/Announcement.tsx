import { css } from "@emotion/css";
import { ButtonAnchor } from "components/common/Button";
import React from "react";
import { FaArrowRight } from "react-icons/fa";

const Announcement: React.FC = () => {
  return (
    <div
      className={css`
        background: var(--mi-primary-color);
        color: white;
        padding: 1rem;
        border-radius: 5px;
        width: 100%;
        border-radius: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      `}
    >
      Join the beta test for mirlo's upcoming iOS app!
      <ButtonAnchor
        variant="outlined"
        startIcon={<FaArrowRight />}
        target="_blank"
        href="https://testflight.apple.com/join/SjkPHPqp"
        className={css`
          background-color: black !important;
          border: 1px solid var(--mi-white) !important;
          color: var(--mi-white) !important;
          transition: box-shadow 0.25s;

          & svg {
            fill: var(--mi-white) !important;
          }

          &:hover {
            // filter: brightness(0.8);
            box-shadow: 2px 2px 0px rgb(255, 255, 255);
          }
        `}
      >
        Join Here
      </ButtonAnchor>
    </div>
  );
};

export default Announcement;
