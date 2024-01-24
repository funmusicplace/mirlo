import styled from "@emotion/styled";

const Pill = styled.span`
  display: inline-flex;
  background-color: var(--mi-darken-x-background-color);
  border-radius: var(--mi-border-radius-x);
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  margin: 0 0.3rem;
  align-items: center;

  button {
    margin-left: 0.25rem;
    padding: 0;
  }
`;

export default Pill;
