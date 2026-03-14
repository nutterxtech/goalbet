import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import matchesRouter from "./matches.js";
import betsRouter from "./bets.js";
import leaderboardRouter from "./leaderboard.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/matches", matchesRouter);
router.use("/bets", betsRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/admin", adminRouter);

export default router;
