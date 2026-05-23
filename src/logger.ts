import winston from "winston";

console.log("process.env", process.env.LOG_LEVEL || "info");
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "api" },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
  ],
});

export default logger;
