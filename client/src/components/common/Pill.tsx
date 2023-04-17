import styled from "@emotion/styled";

const Pill = styled.span`
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: ${(props) => props.theme.borderRadius};
  padding: 0.25rem 0.5rem;
  color: white;
  margin: 0 0.25rem;
`;

export default Pill;
