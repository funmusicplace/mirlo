// @ts-ignore: Ignore import errors for github-slugger
import { slug } from "github-slugger";

const generateSlug = (input: string, backupString?: string) => {
  return slug(input?.toLowerCase() ?? slug(backupString));
};

export default generateSlug;
