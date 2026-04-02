export default async function globalSetup() {
  // Each Playwright run now gets a unique database/uploads path from the config,
  // so there is no shared test state to clean up before the server starts.
}
