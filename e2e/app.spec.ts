import { devices, expect, test, type Page } from "@playwright/test";

/** Replaces the CodeMirror document with `text`. */
async function setEditor(page: Page, text: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(text);
}

test("redirects / to Thai, and remembers English after switching", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/th$/);
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("playground: forward chaining runs to quiescence and explains HOW", async ({ page }) => {
  await page.goto("/en/playground?example=animal");
  await page.getByRole("button", { name: "Run to end" }).click();
  await expect(page.getByText("No rule can fire any more")).toBeVisible();
  await page.getByRole("cell", { name: "cheetah", exact: true }).click();
  await expect(page.getByRole("heading", { name: /HOW: cheetah/ })).toBeVisible();
  await expect(page.getByText(/Z9 contributed 1/)).toBeVisible();
});

test("playground: backward chaining proves the car diagnosis", async ({ page }) => {
  await page.goto("/en/playground?example=car");
  await page.getByRole("button", { name: "Run to end" }).click();
  await expect(page.getByText("battery_dead: proven (CF 0.9)")).toBeVisible();
});

test("playground: syntax errors block the engine and are listed", async ({ page }) => {
  await page.goto("/en/playground?example=animal");
  await setEditor(page, "rule R IF a THEN b");
  await expect(page.getByText("1 error(s)")).toBeVisible();
  await expect(page.getByText("Expected ':' after rule name")).toBeVisible();
});

test("lessons: a correct answer is remembered on the lessons index", async ({ page }) => {
  await page.goto("/en/lessons/what-is-an-expert-system");
  const quiz = page.locator("section:has(fieldset)").first();
  await quiz.getByText("Inference engine", { exact: true }).click();
  await quiz.getByRole("button", { name: "Check answer" }).click();
  await expect(quiz.getByRole("status")).toHaveText("Correct!");
  await page.goto("/en/lessons");
  await expect(page.getByText("1 / 3 quizzes")).toBeVisible();
});

test("exercises: a correct solution passes every test and is marked solved", async ({ page }) => {
  await page.goto("/en/exercises/combine-evidence");
  await setEditor(page, "rule F1: IF fever THEN flu CF 0.6\nrule F2: IF cough THEN flu CF 0.5");
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByRole("status")).toHaveText("All tests passed. Exercise solved!");
  await page.goto("/en/exercises");
  await expect(page.getByRole("link", { name: /Combine evidence with CFs/ })).toContainText("Solved");
});

test("exercises: declaring facts is rejected", async ({ page }) => {
  await page.goto("/en/exercises/combine-evidence");
  await setEditor(page, "fact flu\nrule F1: IF fever THEN flu CF 0.6");
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByText("Line 1 declares a fact.")).toBeVisible();
});

test.describe("touch devices", () => {
  // Emulate a phone in Chromium; the full iPhone preset would also switch the browser to WebKit.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["iPhone 13"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("see the desktop-only notice instead of the app", async ({ page }) => {
    await page.goto("/en/playground");
    await expect(page.getByText("Please open InferLab on a computer")).toBeVisible();
    await expect(page.locator(".app-shell")).toBeHidden();
  });
});
