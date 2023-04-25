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

  @media screen and (max-width: 800px) {
    // background-color: var(--mi-normal-background-color);
    padding: 0.5rem 0.7rem;
  }
`;

export default Box;
