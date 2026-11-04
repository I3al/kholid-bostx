import type { Config } from "@netlify/functions";
import { pingSearchEngines } from "../lib/indexnow.mts";

// Runs automatically every day on the published site.
export default async () => {
  await pingSearchEngines();
};

export const config: Config = {
  schedule: "0 1 * * *",
};
