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

async function assertSecurityPromptIfShown(page) {
  if (!page.url().includes("/security")) {
    return;
  }

  const body = page.locator("body");
  await expect(body).toContainText("MFA setup required for your role");
  await expect(body).toContainText("Protect branch and headquarters access.");
}

test("owner can access headquarters oversight surfaces", async ({ page }) => {
  await login(page, "owner@firstlove.demo", "OwnerDemo!2026");
  await assertSecurityPromptIfShown(page);

  await page.goto("/hq");
  await expect(page.locator("body")).toContainText("HQ Command Centre");

  await page.goto("/regions");
  await expect(page.locator("body")).toContainText(
    "Regions and shared supervision"
  );

  await page.goto("/transfers");
  await expect(page.locator("body")).toContainText("Member transfer centre");

  await page.goto("/security");
  await expect(page.locator("body")).toContainText(
    "Protect branch and headquarters access."
  );

  await page.goto("/reports");
  const reportMain = page.getByRole("main");
  await expect(reportMain.getByRole("link", { name: /^branches$/i })).toBeVisible();
  await expect(reportMain.getByRole("link", { name: /^transfers$/i })).toBeVisible();
  await expect(reportMain.getByRole("link", { name: /^jobs$/i })).toBeVisible();
});
