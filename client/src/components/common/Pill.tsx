import styled from "@emotion/styled";

const Pill = styled.span`
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: ${(props) => props.theme.borderRadius};
  padding: 0.25rem 0.4rem;
  // color: white;
  font-size: 0.9rem;
  margin: 0 0.25rem;
`;

export default Pill;
