import prisma from "../../../prisma/prisma";
import { NotificationType } from "@prisma/client";
import { flatten } from "lodash";

// This will only be run-able once. We'll maybe want to
// change it so that we can run it after adding a new
// notification level for users
const initiateUserNotifcations = async () => {
  try {
    const users = await prisma.user.findMany({});

    // FIXME
    // await prisma.userNotification.createMany({
    //   data: flatten(
    //     users.map((user) =>
    //       Object.values(NotificationType).map((obj) => ({
    //         userId: user.id,
    //         notification: obj,
    //         isEnabled: true,
    //       }))
    //     )
    //   ),
    // });
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export default initiateUserNotifcations;
