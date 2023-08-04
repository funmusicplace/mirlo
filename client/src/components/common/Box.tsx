import styled from "@emotion/styled";

const Box = styled.div`
  width: 100%;
  border-radius: var(--mi-border-radius);
  padding: 1rem 1.5rem;
  transition: 0.4s border-radius;

  &:nth-child(2n) {
    background-color: #daffff;
    border: 1px solid #b8eeee;
    border-top-right-radius: 0;
  }
  &:nth-child(2n + 1) {
    background-color: #fff4da;
    border: 1px solid #eee3c9;
    border-bottom-right-radius: 0;
  }
  &:nth-child(3n) {
    background-color: #f7ffda;
    border: 1px solid #e5eeb8;
    border-bottom-left-radius: 0;
  }
  &:hover {
    border-radius: var(--mi-border-radius-focus);
  }

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
