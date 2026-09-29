// Online connection: the Cloudflare Worker that stores the shared figures.
// Access rules (Chairman, controller, staff) are enforced by the server in server/src/worker.js.
// Leave apiUrl empty to keep figures on this device only.
window.FINANCE_CONFIG = {
  apiUrl: "https://klever-finance-api.ewkena2.workers.dev",
};
