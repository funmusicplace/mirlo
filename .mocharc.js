const inCI = process.env.CI === "true" ? true : false;

console.log("in CI: ", inCI);

module.exports = {
  extension: ["ts"],
  spec: "test/**/*.spec.ts",
  require: "ts-node/register",
  forbidOnly: inCI,
  // watch: !inCI,
  "watch-files": ["test/**/*.ts", "src/**/*.ts"],
  "watch-ignore": ["node_modules"],
};
