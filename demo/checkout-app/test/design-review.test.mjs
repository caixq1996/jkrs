import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const html = await readFile(new URL("../src/index.html", import.meta.url), "utf8");

test("mobile checkout uses 16px horizontal padding", () => {
  assert.match(css, /@media[\s\S]*\.checkout-card\s*\{[^}]*padding-inline:\s*16px;/u);
});

test("mobile price wraps below the title", () => {
  assert.match(css, /@media[\s\S]*grid-template-areas:\s*"title"\s*"price"\s*"description";/u);
});

test("the existing secondary button style is reused", () => {
  assert.match(html, /class="button button--secondary"/u);
});

test("desktop keeps a two-column title and price layout", () => {
  const desktopSection = css.split("@media")[0] ?? "";
  assert.match(desktopSection, /\.checkout-summary\s*\{[^}]*grid-template-columns:\s*1fr auto;/u);
});
