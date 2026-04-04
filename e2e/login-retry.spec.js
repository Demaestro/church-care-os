import { expect, test } from "@playwright/test";

test("login keeps the email filled after one failed password attempt", async ({ page }) => {
  const email = "pastor.lagos@firstlove.demo";
  const password = "PastorDemo!2026";

  await page.goto("/login");

  await page.locator('form.space-y-5 input[name="email"]').fill(email);
  await page.locator('form.space-y-5 input[name="password"]').fill("WrongPassword123");
  await page.locator('form.space-y-5 button[type="submit"]').click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('form.space-y-5 input[name="email"]')).toHaveValue(
    email
  );
  await expect(page.locator("body")).toContainText(
    "We could not sign you in with those credentials."
  );

  await page.locator('form.space-y-5 input[name="password"]').fill(password);
  await page.locator('form.space-y-5 button[type="submit"]').click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toContainText("Pastor Emmanuel");
});
