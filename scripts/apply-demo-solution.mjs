import { copyFile } from "node:fs/promises";

const root = new URL("../demo/checkout-app/src/", import.meta.url);
await copyFile(new URL("index.after.html", root), new URL("index.html", root));
await copyFile(new URL("styles.after.css", root), new URL("styles.css", root));
console.log("Reference demo patch applied.");
