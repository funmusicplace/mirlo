import styled from "@emotion/styled";

export default styled.ul`
  border: 1px dashed var(--mi-darken-x-background-color);
  list-style: none;
  width: 100%;
  background-color: var(--mi-lighten-background-color);

  li {
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  li:not(:first-child) {
    border-top: 1px dashed var(--mi-darken-x-background-color);
  }
`;
