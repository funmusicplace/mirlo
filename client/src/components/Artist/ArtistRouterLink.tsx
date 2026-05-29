import { css } from "@emotion/css";
import { Link, LinkProps } from "react-router-dom";

const ArtistRouterLink = (props: LinkProps) => {
  return (
    <Link
      {...props}
      className={`${props.className} ${css`
        color: var(--mi-button-color) !important;
      `}`}
    />
  );
};

export default ArtistRouterLink;
