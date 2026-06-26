import styled from "@emotion/styled";

import { bp } from "../../constants";

export const SectionHeader = styled.div<{ userId?: number }>`
  padding-bottom: 0;
  line-height: 1rem;
  z-index: 5;
  margin-top: 2rem;
  margin-bottom: 0.25rem;
  width: 100%;
  ${(props) =>
    !props.userId ? "top: -0.1rem; padding: .85rem 0 .65rem 0;" : ""}

  .section-header__heading {
    text-transform: uppercase;
    margin: var(--mi-side-paddings-xsmall);
    font-weight: normal;
    color: var(--mi-button-color);
    padding-bottom: 0 !important;
    display: inline-block;
  }

  @media screen and (max-width: ${bp.medium}px) {
    top: -0.1rem;
    .section-header__heading {
      margin: var(--mi-side-paddings-xsmall);
    }
  }
`;
