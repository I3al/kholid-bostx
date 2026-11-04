import { pingSearchEngines } from "../lib/indexnow.mts";

// Event-triggered: Netlify runs this automatically after every successful deploy.
export default async () => {
  const msg = await pingSearchEngines();
  return new Response(msg);
};
