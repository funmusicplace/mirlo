import styled from "@emotion/styled";
import { bp } from "../../constants";

const FormComponent = styled.div<{ direction?: "row" | "column" }>`
  margin-bottom: 1.5rem;
  margin-top: 0.35rem;
  gap: 0.5rem;

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

  input {
    border: var(--mi-border);
    margin-bottom: 0.25rem;
  }

  .inline-button {
    display: flex;
    align-items: center;

    input {
      margin-bottom: 0;
    }
    margin-bottom: 0.25rem;
  }

  textarea {
    border: var(--mi-border);
  }

  label {
    font-size: 1rem;
    margin-bottom: 0.5rem;

    font-weight: 600;
  }

  .error {
    color: var(--mi-warning-color);
  }

  @media (max-width: ${bp.medium}px) {
    label {
      font-size: 1.1rem;
    }
  }
`;

export default FormComponent;
