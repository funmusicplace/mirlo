import announcePublishPost from "./announce-post-published";

const everyMinuteTasks = async () => {
  await announcePublishPost();
};

everyMinuteTasks();
