import styled from "@emotion/styled";
import React from "react";

import { bp } from "../../constants";

export type SideNavItem = {
  key: string;
  label: React.ReactNode;
  isActive: boolean;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
};

export const SideNavLayout = styled.div<{ navWidth: string }>`
  display: grid;
  grid-template-columns: ${(props) => props.navWidth} minmax(0, 1fr);
  gap: 2.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const Nav = styled.nav<{ topOffset: string }>`
  position: sticky;
  top: calc(var(--header-cover-sticky-height) + ${(props) => props.topOffset});
  align-self: start;

  h2 {
    margin: 0 0 0.6rem 0.625rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.6;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  ol a,
  ol button {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.375rem 0.625rem;
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0 var(--mi-border-radius) var(--mi-border-radius) 0;
    background: none;
    color: var(--mi-normal-foreground-color);
    font: inherit;
    text-align: left;
    text-decoration: none;
    opacity: 0.75;
    cursor: pointer;

    &:hover,
    &[aria-current] {
      opacity: 1;
      background: var(--mi-darken-background-color);
    }

    &[aria-current] {
      border-left-color: var(--mi-button-color);
      font-weight: 600;
    }
  }

  .extra {
    margin: 1.25rem 0 0 calc(0.625rem + 3px);
  }

  @media screen and (max-width: ${bp.medium}px) {
    position: static;

    h2,
    .extra {
      display: none;
    }

    ol {
      flex-direction: row;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid var(--mi-tint-x-color);
    }

    ol a,
    ol button {
      white-space: nowrap;
      border-left: 0;
      border-bottom: 3px solid transparent;
      border-radius: 0;

      &[aria-current] {
        background: none;
        border-bottom-color: var(--mi-button-color);
      }
    }
  }
`;

const SideNav: React.FC<{
  ariaLabel: string;
  items: SideNavItem[];
  ariaCurrentValue?: "location" | "step";
  heading?: string;
  topOffset?: string;
  children?: React.ReactNode;
}> = ({
  ariaLabel,
  items,
  ariaCurrentValue = "location",
  heading,
  topOffset = "1rem",
  children,
}) => (
  <Nav aria-label={ariaLabel} topOffset={topOffset}>
    {heading && <h2>{heading}</h2>}
    <ol>
      {items.map((item) => (
        <li key={item.key}>
          {item.href ? (
            <a
              href={item.href}
              aria-current={item.isActive ? ariaCurrentValue : undefined}
            >
              {item.label}
              {item.trailing}
            </a>
          ) : (
            <button
              type="button"
              aria-current={item.isActive ? ariaCurrentValue : undefined}
              onClick={item.onClick}
            >
              {item.label}
              {item.trailing}
            </button>
          )}
        </li>
      ))}
    </ol>
    {children && <div className="extra">{children}</div>}
  </Nav>
);

export default SideNav;
