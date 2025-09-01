export const POST_EXAMPLE: Post = {
  id: 1,
  title: "My New Post",
  content: `
	<p>Hi friends, here is my new post website where I will write my posts from now on.</p>
	<p>Please subscribe to my channel at <a href="https://example.com">example.com/ExampleUser2000</a> thanks!</p>
	`,
  publishedAt: "1999-09-09T09:09:09Z",
  isPublic: true,
  isDraft: false,
  isContentHidden: false,
  artist: {
    id: 1,
    userId: 1,
    name: "ExampleUser2000",
    bio: "",
    enabled: true,
    createdAt: "1999-09-09T09:09:09Z",
    trackGroups: [],
    posts: [],
    subscriptionTiers: [],
    merch: [],
    activityPub: false,
    isLabelProfile: false,
  },
};
