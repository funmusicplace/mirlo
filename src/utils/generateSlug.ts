import { slug } from "github-slugger";

const generateSlug = (input: string, backupString?: string) => {
  return slug(input?.toLowerCase() ?? slug(backupString ?? ""));
};

export const generateUniqueSlug = async (
  name: string,
  fallback: string,
  isTaken: (candidate: string) => Promise<boolean>
) => {
  const base = generateSlug(name) || fallback;
  let candidate = base;
  for (let suffix = 2; await isTaken(candidate); suffix++) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
};

export default generateSlug;
