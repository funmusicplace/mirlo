import { Artist, Post } from "@prisma/client";

export default {
  single: (post: Post, isUserSubscriber?: boolean) => ({
    ...post,
    content: isUserSubscriber || !post.forSubscribersOnly ? post.content : "",
  }),
};
