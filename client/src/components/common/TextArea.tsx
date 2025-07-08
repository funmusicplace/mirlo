import styled from "@emotion/styled";

export const TextArea = styled.textarea<{
  colors?: { background: string; foreground: string };
}>`
  padding: 0.5rem;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  width: 100%;
  border-radius: var(--mi-border-radius);
  color: ${(props) =>
    props.colors?.foreground ?? "var(--mi-normal-foreground-color)"};
  background-color: ${(props) =>
    props.colors?.background ?? "var(--mi-lighten-x-background-color)"};
  border: 1px solid
    ${(props) =>
      props.colors?.foreground ?? "var(--mi-normal-foreground-color)"};
`;

export default TextArea;
