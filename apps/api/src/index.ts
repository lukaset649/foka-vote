import "dotenv/config";

import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = createApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});