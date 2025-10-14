import styled from "@emotion/styled";
import { bp } from "../../constants";
import React from "react";
import { css } from "@emotion/css";
import { useParams } from "react-router-dom";
import { queryArtist } from "queries";
import { useQuery } from "@tanstack/react-query";

export const ArtistBox: React.FC<{
  variant?: "success" | "info" | "warning";
  compact?: boolean;
  small?: boolean;
  children: React.ReactNode;
}> = (props) => {
  const { artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const colors = artist?.properties?.colors;
  const styles = () => {
    switch (props.variant) {
      case "success":
        return `
        background: ${colors?.foreground} !important;
        color: ${colors?.background} !important;
        `;
      case "warning":
        return `
        background: ${colors?.primary} !important;
        color: ${colors?.background} !important;

        a {
          color: ${colors?.background} !important;
          filter: hue-rotate(90deg);
        }
        `;
      default:
        return "";
    }
  };

  return (
    <Box
      {...props}
      className={css`
        ${styles()}

        p {
          margin-bottom: 0.5rem;
        }
      `}
    />
  );
};

const Box = styled.div<{
  variant?: "success" | "info" | "warning";
  compact?: boolean;
  noPadding?: boolean;
  small?: boolean;
}>`
  width: 100%;
  padding: ${(props) =>
    props?.noPadding ? "0" : props.compact ? ".25rem .5rem" : "1.25rem"};
  margin-bottom: 0.5rem;
  border-radius: 5px;

  ${(props) => {
    switch (props.variant) {
      case "success":
        return `
            background: var(--mi-success-background-color);
            border: var(--mi-success-background-color) 1px solid;
            color: var(--mi-normal-foreground-color); 
        `;
      case "info":
        return `
          background-color: var(--mi-info-background-color);
          color: var(--mi-normal-foreground-color);
        `;
      case "warning":
        return `
            background: var(--mi-warning-background-color);
            border: var(--mi-warning-background-color) 1px solid;
            color: var(--mi-normal-foreground-color);

            a { 
              color: var(--mi-white);
            }
          `;
      default:
        return `
          // background-color: var(--mi-lighten-background-color);
        `;
    }
  }}

  ${(props) => (props.small ? "font-size: .85rem" : "")}

  input {
    background: var(--mi-lighten-background-color);
  }

  textarea {
    background: var(--mi-lighten-background-color);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: 0.5rem 0.7rem;
  }
`;

export default Box;
