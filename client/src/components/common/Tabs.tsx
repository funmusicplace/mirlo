import styled from "@emotion/styled";
import { bp } from "../../constants";

const Tabs = styled.ul`
  list-style: none;
  margin: 1.1rem 0.5rem 0 0;

  > li {
    display: inline-flex;
    margin-right: 1rem;
    margin-top: 0.5rem;

    > a:not(.edit),
    button {
      border-radius: none;
      text-decoration: none;
      padding: 0rem 0.25rem calc(0.9rem - 4px) 0.25rem;
      line-height: 1rem;
      display: block;
      font-size: 1.2rem;
      transition: 0.1s border-bottom;
      border-bottom: 4px solid transparent;
      color: var(--mi-normal-foreground-color);

      @media screen and (max-width: ${bp.medium}px) {
        padding: 0rem 0.25rem calc(0.9rem - 4px) 0.25rem;
      }

      &.active {
        border-bottom: 4px solid var(--mi-primary-color);
      }

      &:hover {
        border-bottom: 4px solid var(--mi-primary-color);
      }
    }
  }
`;

export const ArtistTabs = styled(Tabs)<{ color?: string }>`
  margin: 0rem 0.5rem 0 0;

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    margin-bottom: 0.5rem;
    margin-top: 0.5rem;
  }

  > li {
    > a:not(.edit),
    button {
      &.active {
        border-bottom: 4px solid
          ${(props) => props.color ?? `var(--mi-primary-color)`} !important;
      }
      &:hover {
        border-bottom: 4px solid
          ${(props) => props.color ?? `var(--mi-primary-color)`} !important;
      }
    }
  }
`;

export default Tabs;
