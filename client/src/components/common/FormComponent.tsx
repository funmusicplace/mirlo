import styled from "@emotion/styled";

const FormComponent = styled.div`
  margin-bottom: 0.75rem;

  margin-top: 2rem;

  input[type="checkbox"] + label {
    display: flex;
    flex-direction: column;
    margin-left: 0.5rem;
    margin-bottom: 0.25rem;
  }

  input {
    margin-top: 0.25rem;
  }

  .error {
    color: var(--mi-warning-color);
  }
`;

export default FormComponent;
