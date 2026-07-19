import { copyFile } from "node:fs/promises";

const root = new URL("../demo/checkout-app/src/", import.meta.url);
await copyFile(new URL("index.before.html", root), new URL("index.html", root));
await copyFile(new URL("styles.before.css", root), new URL("styles.css", root));
console.log("Demo reset to the intentionally flawed before state.");
