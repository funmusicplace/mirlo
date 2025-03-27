import styled from "@emotion/styled";
import { css } from "@emotion/css";

type Sizes = "full" | "big" | "medium" | "small";

const FlexWrapper = styled.div`
  display: flex;
  width: 100%;
`;

export const WidthWrapper = styled.div<{
  variant?: Sizes;
  hasPaddings?: boolean;
}>`
  ${(props) => {
    switch (props.variant) {
      case "full":
        return `
        max-width: var(--mi-container-full);
        `;
      case "big":
        return `
        max-width: var(--mi-container-big);
        `;
      case "medium":
        return `
        max-width: var(--mi-container-medium);
        `;
      case "small":
        return `
        max-width: var(--mi-container-small);
        `;
      default:
        return `
        max-width: var(--mi-container-big);
        `;
    }
  }}

  width: 100%;
  margin: 0 auto;
`;

export const WidthContainer: React.FC<{
  children: React.ReactNode;
  variant: Sizes;
  justify?: string;
  className?: string;
}> = ({ children, className, variant, justify }) => {
  return (
    <WidthWrapper
      variant={variant}
      className={
        css`
          width: 100%;
          justify-content: ${justify ?? "flex-start"};
        ` +
        " " +
        className
      }
    >
      {children}
    </WidthWrapper>
  );
};

export default WidthContainer;
