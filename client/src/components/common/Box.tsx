import styled from "@emotion/styled";

const Box = styled.div`
  width: 100%;
  background-color: #f5f5f5;
  border-radius: ${(props) => props.theme.borderRadius};
  padding: 1rem 1.5rem;

  input {
    background: white;
  }
`;

export default Box;
