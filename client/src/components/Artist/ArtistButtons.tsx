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

const ArtistRouterLink: React.FC<LinkProps> = (props) => {
  const { artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const colors = artist?.properties?.colors;
  return (
    <Link
      {...props}
      className={
        colors &&
        css`
          color: ${colors?.primary} !important;
        ` +
          " " +
          props.className
      }
    />
  );
};

export const ArtistButton: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ onClick, ...props }) => {
  const { artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const colors = artist?.properties?.colors;

  let variantStyles = () => {
    switch (props.variant) {
      case "link":
        return `
        color: ${colors?.primary} !important;

        svg {
          fill: ${colors?.primary} !important;
        }
      `;
      case "outlined":
      case "dashed":
        return `
        color: ${colors?.primary} !important;
        border: 1px ${props.variant === "outlined" ? "solid" : props.variant} ${colors?.primary} !important;

        svg {
          fill: ${colors?.primary} !important;
        }

        &:hover:not(:disabled) {
          color: ${colors?.primary} !important;
          background-color: ${colors?.secondary} !important;

          svg {
            fill: ${colors?.primary} !important;
          }
        }
      `;
      case "transparent":
        return `color: ${colors?.primary} !important;

        svg {
          fill: ${colors?.primary} !important;
        }

        &:hover:not(:disabled) {
          color: ${colors?.primary} !important;
          background-color: ${colors?.secondary} !important;

          svg {
            fill: ${colors?.primary} !important;
          }
        }`;
      default:
        return `
        background-color: ${colors?.primary} !important;
        color: ${colors?.secondary} !important;

        svg {
          fill: ${colors?.secondary} !important;
           
          @media (prefers-color-scheme: dark) {
            fill: ${colors?.secondary} !important;
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
