import styled from "@emotion/styled";

const FormComponent = styled.div`
  margin-bottom: 0.75rem;

  input[type="checkbox"] + label {
    display: flex;
    flex-direction: column;
    margin-left: 0.5rem;
  }
`;

export default FormComponent;
