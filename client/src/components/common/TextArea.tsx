import styled from "@emotion/styled";

export const TextArea = styled.textarea`
  border: 1px solid ${(props) => props.theme.colors.translucentShade};
  padding: 0.5rem;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  width: 100%;
  background-color: ${(props) => props.theme.colors.translucentTint};
  border-radius: ${(props) => props.theme.borderRadius};
  color: ${(props) => props.theme.colors.text};
`;

export default TextArea;
