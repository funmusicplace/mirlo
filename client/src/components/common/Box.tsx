import styled from "@emotion/styled";

const Box = styled.div`
  width: 100%;
  padding: 1rem 1.5rem 1rem;
  transition: 0.4s border-radius;
  background-color: var(--mi-lighter-background-color);

  input {
    background: var(--mi-lighter-background-color);
  }

  textarea {
    background: var(--mi-lighter-background-color);
  }

  @media screen and (max-width: 800px) {
    // background-color: var(--mi-normal-background-color);
    padding: 0.5rem 0.7rem;
  }
`;

export default Box;
