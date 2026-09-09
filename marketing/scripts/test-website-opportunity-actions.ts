import { buildWebsiteActionRecommendations } from "../src/website-opportunity-actions";

async function main() {
  const result = await buildWebsiteActionRecommendations();
  if (!Array.isArray(result)) throw new Error("Website action recommendations must be an array");
  if (!result[0] || typeof result[0].action !== "string") throw new Error("Website action recommendation is missing action");
  console.log("Website opportunity action tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
