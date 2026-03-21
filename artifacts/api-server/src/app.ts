import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { connectDB } from "./lib/mongodb.js";
import { User } from "./models/User.js";

const app: Express = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production the frontend is built alongside the backend.
// Resolve the path whether we're running from src/ (dev) or dist/ (prod).
const FRONTEND_DIST = path.resolve(__dirname, "../../football-betting/dist/public");

async function seedAdminAccount() {
  try {
    const adminEmail = "nutterxtech@gmail.com";
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        username: "nutterx",
        email: adminEmail,
        password: "BILLnutter001002",
        role: "admin",
        status: "active",
      });
      console.log("✅ Admin account created: nutterxtech@gmail.com");
    } else if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      console.log("✅ Admin role granted to nutterxtech@gmail.com");
    }
  } catch (err) {
    console.error("Admin seeding error:", err);
  }
}

// Connect to MongoDB on startup
connectDB()
  .then(() => seedAdminAccount())
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// API routes — must come before the static file middleware
app.use("/api", router);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

// Serve the React frontend in production
if (process.env.NODE_ENV === "production") {
  // Static assets (JS, CSS, images)
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback — any unmatched GET returns index.html so client-side routing works
  app.get("*", (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
