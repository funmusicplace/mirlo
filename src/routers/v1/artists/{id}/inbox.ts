import { confirmArtistIdExists } from "../../../../utils/artist";
import inboxPOST from "../../../../activityPub/inboxPOST";

export default function () {
  const operations = {
    POST: [confirmArtistIdExists, inboxPOST],
  };

  return operations;
}
