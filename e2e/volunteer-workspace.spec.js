import { expect, test } from "@playwright/test";

async function login(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForFunction(
    () =>
      !window.location.pathname.startsWith("/login") ||
      document.body.innerText.includes("Signed in as"),
    null,
    { timeout: 15000 }
  );
}

test("volunteer sees the privacy-scoped task workspace", async ({ page }) => {
  await login(page, "volunteer.lagos@firstlove.demo", "VolunteerDemo!2026");

  await page.goto("/volunteer");
  await expect(page.locator("body")).toContainText("Your care tasks");
  await expect(page.locator("body")).toContainText("Assigned");
  await expect(page.locator("body")).not.toContainText("Regions and shared supervision");
});
