import styled from "@emotion/styled";

const FormComponent = styled.div<{ direction?: "row" | "column" }>`
  margin-bottom: 1rem;
  margin-top: 0.75rem;

  display: flex;
  flex-direction: column;
  align-items: flex-start;

  ${(props) =>
    props.direction === "row" &&
    `
    flex-direction: row;
    align-items: center;
  `}

  input[type="checkbox"] + label {
    display: flex;
    flex-direction: column;
    margin-left: 0.5rem;
    margin-bottom: 0.25rem;
  }

  label {
    margin-bottom: 0.35rem;
  }

  .error {
    color: var(--mi-warning-color);
  }

  > div > div {
    margin-bottom: 1rem;
  }
`;

export default FormComponent;
