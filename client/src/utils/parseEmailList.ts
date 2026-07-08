/**
 * Parses a comma- or newline-separated list of emails (as pasted into
 * admin bulk forms) into the `{ email }[]` shape the API expects.
 */
const parseEmailList = (text: string): { email: string }[] =>
  text
    .split(/,|\r?\n/)
    .map((email) => email.trim())
    .filter((email) => !!email)
    .map((email) => ({ email }));

export default parseEmailList;
