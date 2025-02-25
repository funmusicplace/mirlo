import inboxPOST from "../../../../activityPub/inboxPOST";

export default function () {
  const operations = {
    POST: [inboxPOST],
  };

  return operations;
}
