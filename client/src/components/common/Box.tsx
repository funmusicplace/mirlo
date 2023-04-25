import styled from "@emotion/styled";

const Box = styled.div`
  width: 100%;
  background-color: var(--mi-shade-background-color);
  border-radius: ${(props) => props.theme.borderRadius};
  padding: 1rem 1.5rem;

  input {
    background: var(--mi-normal-background-color);
  }

  textarea {
    background: var(--mi-normal-background-color);
  }
`;

export default Box;
