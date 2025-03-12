import * as http from "http";

const options: http.RequestOptions = {
  host: "localhost",
  headers: { "health-check": 1 },
  port: process.env.PORT,
  path: "/health",
  timeout: 2000,
};

const request = http.request(options, (res) => {
  console.log(res.statusCode);
  process.exit(res.statusCode == 200 ? 0 : 1);
});

request.on("error", (e) => {
  console.log(e);
  process.exit(1);
});

request.end();
