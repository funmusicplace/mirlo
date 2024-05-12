import React from "react";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import PostCard from "./PostCard";

const PostGridWrapper = styled.ul<{}>`
  display: grid;
  grid-template-columns: repeat(3, 31.6%);
  gap: 4% 2.5%;
  max-width: 100%;
  list-style-type: none;

  @media screen and (max-width: ${bp.large}px) {
    grid-template-columns: repeat(2, 48.75%);
  }

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: repeat(1, 100%);
    gap: 2%;
  }
`;

interface PostGridProps {
  posts?: Post[];
  ariaLabelledBy: string;
}

export default function PostGrid(props: PostGridProps) {
  return (
    <PostGridWrapper role="list" aria-labelledby={props.ariaLabelledBy}>
      {props.posts?.map((post) => <PostCard key={post.id} p={post} />)}
    </PostGridWrapper>
  );
}
