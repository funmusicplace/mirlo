const shouldWatch = process.env.CI === "true" ? false : true;

console.log("Watching... ", shouldWatch);

module.exports = {
  extension: ["ts"],
  spec: "test/**/*.spec.ts",
  require: "ts-node/register",
  watch: shouldWatch,
  "watch-files": ["test/**/*.ts", "src/**/*.ts"],
  "watch-ignore": ["node_modules"],
};
