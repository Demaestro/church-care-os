import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
  scenarios: {
    public_pages: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 300,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },
  },
};

export default function smokeScenario() {
  const routes = ["/health", "/login", "/register/church", "/requests/new", "/member"];

  for (const route of routes) {
    const response = http.get(`${baseUrl}${route}`, {
      headers: {
        "Cache-Control": "no-store",
      },
      tags: { route },
    });

    check(response, {
      [`${route} returned 200`]: (res) => res.status === 200,
    });
  }

  sleep(1);
}
