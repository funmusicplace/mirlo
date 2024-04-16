See: [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) in the TanStack Query docs.

Query keys need to be unique to each query and its arguments that are performed. In this project, keys are assumed to match the following structure:

```js
["queryName", { ...args }, "tag1", "tag2"];
```

Providing a unique query name is required for TanStack Query to distinguish it from queries with similar arguments.

When queries are invalidated, the second item is looked at to determine if it is affected by a particular mutation. For example, a mutation modifying the artist `id=1` should invalidate every query with a parameter of `artistId: 1`. This is done by using lodash `_.isMatch(queryKey[1], { artistId: 1 })` as the invalidateQueries predicate.

Currently, the following query arguments are used for invalidating:

- `artistId: number`
- `artistSlug: string`

For non-parameterized queries, such as a list of artists, any amount of query "tags" can be appended to the key. These can be invalidated by checking if `queryKey.includes(tag)`.
