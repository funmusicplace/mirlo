import React from "react";

import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import { bp } from "../../constants";
import {
  RelativeRoutingType,
  useHref,
  useLinkClickHandler,
} from "react-router-dom";

export interface Sizable {
  transparent?: boolean;
  size?: "big" | "compact";
  wrap?: boolean;
  rounded?: boolean;
  collapsible?: boolean;
  buttonRole?: "primary" | "secondary" | "warning";
  variant?: "link" | "outlined" | "dashed" | "transparent";
  uppercase?: boolean;
  onlyIcon?: boolean;
}

function lightOrDark(color: string) {
  let matchedColor: string | RegExpMatchArray | null | number = color;

  // Variables for red, green, blue values
  var r, g, b, hsp;

  // Check the format of the color, HEX or RGB?
  if (color.match(/^rgb/)) {
    // If RGB --> store the red, green, blue values in separate variables
    matchedColor = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
    );

    if (matchedColor) {
      r = matchedColor[1];
      g = matchedColor[2];
      b = matchedColor[3];
    }
  } else if (typeof color === "string") {
    // If hex --> Convert it to RGB: http://gist.github.com/983661
    matchedColor = +(
      "0x" + color.slice(1).replace(color.length < 5 ? /./g : "", "$&$&")
    );

    r = matchedColor >> 16;
    g = (matchedColor >> 8) & 255;
    b = matchedColor & 255;
  }

  if (typeof r === "number" && typeof g === "number" && typeof b === "number") {
    const rSquared = r * r;
    // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
    hsp = Math.sqrt(0.299 * rSquared + 0.587 * (g * g) + 0.114 * (b * b));
  }
  // Using the HSP value, determine whether the color is light or dark
  if (hsp && hsp > 127.5) {
    return "light";
  } else {
    return "dark";
  }
}

const CustomButton = styled.button<Sizable>(
  {},
  ({ buttonRole, size, ...props }) => {
    const bodyStyles = window.getComputedStyle(document.body);
    let cssColorVariable = `--mi-${buttonRole ?? "primary"}-color`;
    var backgroundColor = bodyStyles.getPropertyValue(cssColorVariable); //get
    let foregroundColor = bodyStyles.getPropertyValue(
      `--mi-light-background-color`
    );

    const backgroundIsLight = lightOrDark(backgroundColor) === "light";
    if (backgroundIsLight) {
      foregroundColor = bodyStyles.getPropertyValue(
        "--mi-normal-foreground-color"
      );
    }

    const isOnlyIcon = props.onlyIcon
      ? `
      padding: .5rem;
      height: 2rem;
      width: 2rem;

      @media screen and (max-width: ${bp.small}px) {
        ${
          size === "compact"
            ? `
            height: 1.7rem; 
            width: 1.7rem; 
            font-size: var(--mi-font-size-xsmall);
            `
            : ""
        };
      }
    `
      : "";

    const sizeVariables = () => {
      if (size === "compact") {
        return `
          line-height: 1.2rem;
          padding: .3rem .5rem;
          font-size: .8rem;
        `;
      } else if (size === "big") {
        return `
          line-height: 1.2rem;
          padding: 1rem 1.3rem;
          font-size: 1.2rem;
        `;
      } else {
        return `
          padding: .5rem .7rem;
          font-size: 1rem;
        `;
      }
    };

    const collapsible = props.collapsible
      ? `
        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 100%;
          height: auto;
          min-width: auto;
          > p,
          .children {
            display: none;
          }
          .startIcon, .endIcon {margin: auto !important;}
        }
      `
      : "";

    let variantStyles = () => {
      switch (props.variant) {
        case "link":
          return `
          color: ${backgroundColor};
          margin-left: .3rem;
          font-weight: bold;
          padding: 0 !important;
          background-color: transparent !important;
          text-decoration: underline;
          line-height: inherit;

          svg {
            fill: ${backgroundColor};
          }

          &:hover:not(:disabled) {
            filter: brightness(150%);
          }
        `;
        case "outlined":
        case "dashed":
          return `
          color: ${backgroundColor};
          background-color: transparent;
          border: 1px ${props.variant === "outlined" ? "solid" : props.variant} ${backgroundColor};
          font-weight: bold;

          svg {
            fill: ${backgroundColor};
          }

          &:hover:not(:disabled) {
            color: ${foregroundColor};
            background-color: ${backgroundColor};

            svg {
              fill: ${foregroundColor};
            }
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }
        `;
        case "transparent":
          return `color: ${backgroundColor};
          background-color: transparent;
          font-weight: bold;

          svg {
            fill: ${backgroundColor};
          }

          &:hover:not(:disabled) {
            color: ${foregroundColor};
            background-color: ${backgroundColor};

            svg {
              fill: ${foregroundColor};
            }
          }

          &[disabled] {
            color: #ddd;
            border-color: #ddd;
          }`;
        default:
          return `
          background-color: ${backgroundColor};
          color: ${foregroundColor};

          ${
            props.transparent
              ? `background-color:  transparent; 
                 font-weight: bold;
                 color: var(--mi-normal-foreground-color);`
              : ""
          };

          svg {
            fill: ${foregroundColor};
          }

          &:hover:not(:disabled) {
            filter: brightness(150%);
          }
          
          @media screen and (max-width: ${bp.small}px) {
            font-size: var(--mi-font-size-normal);
            padding: ${props.transparent ? ".5rem .25rem .5rem .25rem" : ""};
          }
        `;
      }
    };

    const style = `
    ${sizeVariables()}
    ${isOnlyIcon}
    ${props.rounded ? `border-radius: 99999px !important;` : ""}
     ${
       props.wrap
         ? `white-space: normal !important;
                   height: auto;
                   width: 94%;
                   word-break: break-word;
                   hyphens: auto;`
         : "white-space: nowrap;"
     }
    
    background: none;
    border: none;
    transition:
      0.25s background-color,
      0.25s color,
      0.25s border-radius,
      0.25s opacity,
      0.25s filter;
    text-decoration: none;
  
    &:hover:not(:disabled) {
      cursor: pointer;
    }
  
    ${collapsible}
  
    ${props.uppercase ? "text-transform: uppercase;" : ""}
    ${variantStyles()}
  
    align-items: center;
    display: inline-flex;
    border-radius: ${props.onlyIcon ? "100%" : "var(--mi-border-radius)"};
    justify-content: center;
  
    &[disabled] {
      opacity: 0.6;
    }
  
    & .startIcon {
      margin-top: ${props.onlyIcon ? "0px" : "0.1rem"};
      margin-right: ${props.onlyIcon ? "0px" : "0.5rem"};
      line-height: 0.785rem;
      font-size: ${props.onlyIcon ? ".9rem" : "0.785rem"};
      
  
      @media screen and (max-width: ${bp.small}px) {
        font-size: ${props.onlyIcon ? "var(--mi-font-size-xsmall)" : ""};
      }
    }
  
    & .endIcon {
      margin-top: ${props.onlyIcon ? "0px" : "0.1rem"};
      margin-right: ${props.onlyIcon ? "0px" : "0.5rem"};
      line-height: 0.785rem;
      font-size: ${props.onlyIcon ? ".9rem" : "0.785rem"};
    }
  `;

    return style;
  }
);

export interface ButtonProps extends Sizable {
  children?: React.ReactNode;
  startIcon?: React.ReactElement;
  endIcon?: React.ReactElement;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  isLoading?: boolean;
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
}

export const Button: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({
  children,
  onClick,
  startIcon,
  endIcon,
  disabled,
  isLoading,
  onlyIcon,
  role,
  ...props
}) => {
  return (
    <CustomButton
      onClick={onClick}
      disabled={disabled}
      onlyIcon={!children || onlyIcon}
      {...props}
    >
      {isLoading && (
        <span className="startIcon" aria-hidden>
          <LoadingSpinner />
        </span>
      )}
      {!isLoading && startIcon ? (
        <span className="startIcon" aria-hidden>
          {startIcon}
        </span>
      ) : (
        ""
      )}
      {!onlyIcon && <span className="children">{children}</span>}
      {endIcon ? (
        <span className="endIcon" aria-hidden>
          {endIcon}
        </span>
      ) : (
        ""
      )}
    </CustomButton>
  );
};

export const ButtonAnchor: React.FC<
  ButtonProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ ...props }) => {
  return (
    /*
    // @ts-ignore Because of as="a", we can pass anchor attributes here - the types just don't like it. */
    <Button as="a" {...props} />
  );
};

export const ButtonLink: React.FC<
  ButtonProps & {
    to: string;
    relative?: RelativeRoutingType;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ to, relative, ...props }) => {
  const handleClick = useLinkClickHandler(to, { relative });
  const href = useHref(to, { relative });
  return <ButtonAnchor onClick={handleClick} href={href} {...props} />;
};

export default Button;
