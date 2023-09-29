import styled from "@emotion/styled";

const Box = styled.div`
  width: 100%;
  padding: 1rem 1.5rem 1.5rem;
  transition: 0.4s border-radius;
  border-bottom: 1px solid var(--mi-lighter-foreground-color);

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
