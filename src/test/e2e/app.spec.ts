import { expect, test } from "@playwright/test";

test("manual typed flow to checklist", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Type it instead" }).click();

  const addInput = page.getByPlaceholder("Add item");
  await addInput.fill("bananas");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Build checklist" }).click();

  await expect(page.getByRole("heading", { name: "Produce" })).toBeVisible();
  await page.getByLabel("Toggle bananas").check();
  await expect(page.getByText("Done!")).toBeVisible();
});

test("text size slider persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Text size" }).click();

  const slider = page.getByLabel("Adjust text size");
  await slider.fill("1.4");
  await page.locator(".sheet-header").getByRole("button", { name: "Close" }).click();
  await page.reload();

  const prefsRaw = await page.evaluate(() => localStorage.getItem("cl:prefs"));
  expect(prefsRaw).toContain("1.4");
});

test("ocr processes test_list.jpg and extracts grocery names", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/");

  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose a photo" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles("testdata/test_list.jpg");

  await expect
    .poll(
      () => {
        return new URL(page.url()).pathname;
      },
      {
        timeout: 120_000
      }
    )
    .toBe("/list");

  await page.getByRole("button", { name: "Open list actions" }).click();
  await page.getByRole("button", { name: "Edit list" }).click();

  await expect
    .poll(
      () => {
        return new URL(page.url()).pathname;
      },
      {
        timeout: 30_000
      }
    )
    .toBe("/review");

  const rowInputs = page.locator("ul.edit-list input.edit-input");
  await expect(rowInputs.first()).toBeVisible({ timeout: 20_000 });

  const names = await rowInputs.evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLInputElement).value.trim().toLowerCase())
      .filter(Boolean)
  );

  expect(names.length).toBeGreaterThan(2);

  const sessionItems = await page.evaluate(() => {
    const raw = localStorage.getItem("cl:lastSession");
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as { items?: Array<{ canonicalName: string; categoryId: string }> };
      return parsed.items ?? [];
    } catch {
      return [];
    }
  });

  const knownGroceryItems = sessionItems.filter((item) => item.categoryId && item.categoryId !== "other");
  expect(knownGroceryItems.length).toBeGreaterThan(1);

  const keywords = [
    "fruit",
    "green",
    "greens",
    "chocolate",
    "egg",
    "eggs",
    "lemon",
    "lemons",
    "oat",
    "oatmeal",
    "cholula",
    "coriander",
    "halls",
    "parm",
    "rotel",
    "earl",
    "grey"
  ];

  const hasExpectedKeyword = names.some((name) => keywords.some((keyword) => name.includes(keyword)));
  if (!hasExpectedKeyword) {
    const debugText = await page.evaluate(() => window.__clDebug?.getText?.() ?? "No debug text available");
    throw new Error(
      `OCR did not extract expected grocery keywords. Parsed names: ${JSON.stringify(names)}; known grocery items: ${JSON.stringify(
        knownGroceryItems
      )}\\nDebug log:\\n${debugText}`
    );
  }
});
