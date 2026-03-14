import app from "./app";
import { startAutoScheduler } from "./services/matchEngine.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  // Start auto-scheduler after DB connects (connectDB fires in app.ts)
  setTimeout(() => {
    startAutoScheduler();
  }, 3000);
});
