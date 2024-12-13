import { Job } from "bullmq";
import path from "path";
import { readdirSync, stat, statSync, unlink } from "fs";

function walkDir(dir: string, callback: (filePath: string) => void) {
  readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

export default async (job: Job) => {
  try {
  } catch (e) {
    walkDir("/data/media/trackGroup", function (filePath) {
      stat(filePath, function (err, stat) {
        var now = new Date().getTime();
        var endTime = new Date(stat.mtime).getTime() + 86400000; // 1days in miliseconds

        if (err) {
          return console.error(err);
        }

        if (now > endTime) {
          console.log("DEL:", filePath);
          return unlink(filePath, function (err) {
            if (err) return console.error(err);
          });
        }
      });
    });
  }
};
