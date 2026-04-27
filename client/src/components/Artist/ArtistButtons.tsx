import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Button, { ButtonProps } from "components/common/Button";
import { queryArtist } from "queries";
import {
  Link,
  LinkProps,
  RelativeRoutingType,
  useHref,
  useLinkClickHandler,
  useParams,
} from "react-router-dom";

export const useGetArtistColors = () => {
  const { artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  return { colors: artist?.properties?.colors, isLoadingArtist };
};

const ArtistRouterLink: React.FC<LinkProps> = (props) => {
  const { colors } = useGetArtistColors();
  return (
    <Link
      {...props}
      className={`
          ${props.className} ${
            colors &&
            css`
              color: ${colors?.button} !important;
            `
          }`}
    />
  );
};

export const ArtistButton: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ onClick, ...props }) => {
  const { colors } = useGetArtistColors();

  let variantStyles = () => {
    let primaryColor = colors?.button ?? `var(--mi-primary-color)`;
    let secondaryColor = colors?.buttonText ?? `var(--mi-secondary-color)`;

    if (props.color === "foreground") {
      primaryColor = colors?.text ?? `var(--mi-foreground-color)`;
    }
    switch (props.variant) {
      case "link":
        return `
        display: inline-flex !important;
        color: ${primaryColor} !important;

        svg {
          fill: ${primaryColor} !important;
        }

      `;
      case "outlined":
      case "dashed":
        return `
        color: ${primaryColor} !important;
        border: 1px ${props.variant === "outlined" ? "solid" : props.variant} ${primaryColor} !important;

        svg {
          fill: ${primaryColor} !important;
        }

        &:hover:not(:disabled) {
          color: ${primaryColor} !important;
          background-color: ${secondaryColor} !important;

          svg {
            fill: ${primaryColor} !important;
          }
        }
      `;
      case "transparent":
        return `color: ${primaryColor} !important;

        svg {
          fill: ${primaryColor} !important;
        }

        &:hover:not(:disabled) {
          color: ${secondaryColor} !important;
          background-color: transparent !important;

          svg {
            fill: ${secondaryColor} !important;
          }
        }`;
      default:
        return `
        background-color: ${primaryColor} !important;
        color: ${secondaryColor} !important;
        border: 1px solid ${primaryColor} !important;

        svg {
          fill: ${secondaryColor} !important;
           
          @media (prefers-color-scheme: dark) {
            fill: ${secondaryColor} !important;
          }
        }
      `;
    }
  };

  return (
    <Button
      onClick={onClick}
      {...props}
      className={
        css`
          ${variantStyles()}
        ` +
        " " +
        props.className
      }
    />
  );
};

export const ArtistButtonAnchor: React.FC<
  ButtonProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ ...props }) => {
  return (
    /*
    // @ts-ignore Because of as="a", we can pass anchor attributes here - the types just don't like it. */
    <ArtistButton as="a" {...props} />
  );
};

export const ArtistButtonLink: React.FC<
  ButtonProps & {
    to: string;
    relative?: RelativeRoutingType;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ to, relative, ...props }) => {
  const handleClick = useLinkClickHandler(to, { relative });
  const href = useHref(to, { relative });
  return <ArtistButtonAnchor onClick={handleClick} href={href} {...props} />;
};

export default ArtistRouterLink;
