import { expect, test } from "@playwright/test";

test("public request flow continues into status and member portal", async ({ page }) => {
  await page.goto("/requests/new");

  await page.getByText("Prayer", { exact: true }).click();
  await page.locator('[name="summary"]').fill("Please pray for my family this week.");
  await page.locator('[name="submittedBy"]').fill("Test Member");
  await page.locator('[name="contactEmail"]').fill("test.member@example.com");
  await page.locator('[name="contactPhone"]').fill("+2348010000001");
  await page.locator('[name="preferredContact"]').fill("Phone call");
  await page.getByRole("button", { name: /submit care request/i }).click();

  await expect(page.getByText(/Tracking code/i)).toBeVisible();
  const bodyText = await page.locator("body").textContent();
  const trackingCode = bodyText?.match(/CCO-[A-Z0-9]{8}/)?.[0] || "";
  expect(trackingCode).toBeTruthy();

  await page.getByRole("link", { name: /track this request/i }).click();
  await expect(page).toHaveURL(new RegExp(`/requests/status\\?code=${trackingCode}`));
  await expect(page.locator("body")).toContainText(trackingCode);

  await page.goto("/member");
  await page.locator('[name="code"]').fill(trackingCode);
  await page.locator('[name="contact"]').fill("test.member@example.com");
  await page.getByRole("button", { name: /open member portal/i }).click();

  await expect(page.getByLabel("Your name")).toHaveValue("Test Member");
  await expect(page.locator("body")).toContainText(trackingCode);
});
