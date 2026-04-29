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
  return (
    <Link
      {...props}
      className={`
          ${props.className} ${css`
            color: var(--mi-button-color) !important;
          `}`}
    />
  );
};

export const ArtistButton: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ onClick, ...props }) => {
  let variantStyles = () => {
    const accentColor =
      props.color === "foreground"
        ? "var(--mi-text-color)"
        : "var(--mi-button-color)";
    const contrastColor = "var(--mi-button-text-color)";

    switch (props.variant) {
      case "link":
        return `
        display: inline-flex !important;
        color: ${accentColor} !important;

        svg {
          fill: ${accentColor} !important;
        }

      `;
      case "outlined":
      case "dashed":
        return `
        color: ${accentColor} !important;
        border: 1px ${props.variant === "outlined" ? "solid" : props.variant} ${accentColor} !important;

        svg {
          fill: ${accentColor} !important;
        }

        &:hover:not(:disabled) {
          color: ${accentColor} !important;
          background-color: ${contrastColor} !important;

          svg {
            fill: ${accentColor} !important;
          }
        }
      `;
      case "transparent":
        return `color: ${accentColor} !important;

        svg {
          fill: ${accentColor} !important;
        }

        &:hover:not(:disabled) {
          color: ${contrastColor} !important;
          background-color: transparent !important;

          svg {
            fill: ${contrastColor} !important;
          }
        }`;
      default:
        return `
        background-color: ${accentColor} !important;
        color: ${contrastColor} !important;
        border: 1px solid ${accentColor} !important;

        svg {
          fill: ${contrastColor} !important;

          @media (prefers-color-scheme: dark) {
            fill: ${contrastColor} !important;
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
