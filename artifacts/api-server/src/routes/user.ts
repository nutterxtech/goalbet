import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Bet } from "../models/Bet.js";
import { BetSlip } from "../models/BetSlip.js";
import { Notification } from "../models/Notification.js";
import { Match } from "../models/Match.js";
import { getConfig } from "../models/PlatformConfig.js";
import { initiateSTKPush, querySTKPush } from "../services/darajaService.js";
import { submitPesapalOrder, getPesapalOrderStatus } from "../services/pesapalService.js";

const router = Router();

// Public callback endpoint — no auth (Safaricom calls this)
router.post("/deposit/mpesa/callback", async (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) { res.json({ ResultCode: 0, ResultDesc: "Accepted" }); return; }

    const resultCode = body.ResultCode;
    const checkoutRequestId: string = body.CheckoutRequestID;

    // Find pending transaction by mpesaCheckoutRequestId
    const tx = await Transaction.findOne({ mpesaCheckoutRequestId: checkoutRequestId, status: "pending" });
    if (!tx) { res.json({ ResultCode: 0, ResultDesc: "Accepted" }); return; }

    if (resultCode === 0) {
      // Payment successful
      const metadata = body.CallbackMetadata?.Item as Array<{ Name: string; Value: any }> | undefined;
      const getMeta = (name: string) => metadata?.find(i => i.Name === name)?.Value;
      const amount = getMeta("Amount") ?? tx.amount;
      const mpesaReceiptNumber = getMeta("MpesaReceiptNumber") ?? "";

      tx.status = "completed";
      tx.mpesaReceiptNumber = mpesaReceiptNumber;
      await tx.save();

      const user = await User.findByIdAndUpdate(
        tx.userId,
        { $inc: { balance: amount, totalDeposits: amount } },
        { new: true }
      );

      await Notification.create({
        userId: tx.userId,
        type: "deposit",
        message: `✅ M-Pesa deposit of KSh ${amount} confirmed (Ref: ${mpesaReceiptNumber}). Balance: KSh ${user!.balance.toFixed(2)}`,
        data: { amount, mpesaReceiptNumber },
      });
    } else {
      tx.status = "failed";
      await tx.save();
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("M-Pesa callback error:", err);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// Public IPN endpoint — no auth (Pesapal calls this)
router.post("/deposit/pesapal/ipn", async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body;
    if (!OrderTrackingId) { res.status(200).json({ status: 200 }); return; }

    const tx = await Transaction.findOne({ pesapalOrderTrackingId: OrderTrackingId, status: "pending" });
    if (!tx) { res.status(200).json({ status: 200 }); return; }

    const config = await getConfig();
    const statusResult = await getPesapalOrderStatus(
      { consumerKey: config.pesapalConsumerKey, consumerSecret: config.pesapalConsumerSecret, environment: config.pesapalEnvironment },
      OrderTrackingId
    );

    if (statusResult.status === "COMPLETED") {
      tx.status = "completed";
      await tx.save();

      const amount = statusResult.amount ?? tx.amount;
      const user = await User.findByIdAndUpdate(
        tx.userId,
        { $inc: { balance: amount, totalDeposits: amount } },
        { new: true }
      );

      await Notification.create({
        userId: tx.userId,
        type: "deposit",
        message: `✅ Pesapal deposit of KSh ${amount} confirmed (Ref: ${statusResult.confirmationCode ?? OrderMerchantReference}). Balance: KSh ${user!.balance.toFixed(2)}`,
        data: { amount, confirmationCode: statusResult.confirmationCode },
      });
    } else if (statusResult.status === "FAILED" || statusResult.status === "INVALID") {
      tx.status = "failed";
      await tx.save();
    }

    res.status(200).json({ status: 200 });
  } catch (err) {
    console.error("Pesapal IPN error:", err);
    res.status(200).json({ status: 200 });
  }
});

router.use(authenticate);

// GET /user/balance
router.get("/balance", async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id).select("balance");
  res.json({ balance: user?.balance ?? 0 });
});

// GET /user/payment-method — returns active payment gateway info (no secrets)
router.get("/payment-method", async (req: AuthRequest, res) => {
  const config = await getConfig();
  res.json({
    activePaymentMethod: config.activePaymentMethod ?? "auto",
    mpesaConfigured: config.mpesaConfigured,
    pesapalConfigured: config.pesapalConfigured,
  });
});

// POST /user/deposit/mpesa — initiates real STK push
router.post("/deposit/mpesa", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { amount, phone } = req.body;

    if (!amount || amount < config.minDeposit) {
      res.status(400).json({ message: `Minimum deposit is KSh ${config.minDeposit}` });
      return;
    }
    if (!phone) {
      res.status(400).json({ message: "Phone number is required" });
      return;
    }

    if (!config.mpesaConfigured || !config.mpesaConsumerKey) {
      res.status(503).json({ message: "M-Pesa is not configured yet. Contact support." });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }

    // Create a pending transaction before STK push
    const tx = await Transaction.create({
      userId: req.user!.id,
      type: "deposit",
      amount,
      fee: 0,
      netAmount: amount,
      status: "pending",
      description: `M-Pesa deposit`,
      mpesaPhone: phone,
    });

    const stkResult = await initiateSTKPush(
      {
        consumerKey: config.mpesaConsumerKey,
        consumerSecret: config.mpesaConsumerSecret,
        shortCode: config.mpesaShortCode,
        passkey: config.mpesaPasskey,
        callbackUrl: config.mpesaCallbackUrl,
        environment: config.mpesaEnvironment,
      },
      phone,
      amount,
      `GB-${tx.id}`,
      "GoalBet Deposit"
    );

    if (stkResult.ResponseCode !== "0") {
      tx.status = "failed";
      await tx.save();
      res.status(502).json({ message: stkResult.ResponseDescription || "STK push failed" });
      return;
    }

    tx.mpesaCheckoutRequestId = stkResult.CheckoutRequestID;
    tx.mpesaMerchantRequestId = stkResult.MerchantRequestID;
    await tx.save();

    res.json({
      success: true,
      message: "M-Pesa prompt sent to your phone. Enter your PIN to confirm.",
      checkoutRequestId: stkResult.CheckoutRequestID,
      transactionId: tx.id,
    });
  } catch (err: any) {
    console.error("STK push error:", err?.response?.data || err.message);
    res.status(500).json({ message: err?.response?.data?.errorMessage || "Failed to initiate M-Pesa payment" });
  }
});

// GET /user/deposit/mpesa/status/:transactionId — poll for STK push result
// If still pending after 30s, actively queries Safaricom to confirm payment
router.get("/deposit/mpesa/status/:transactionId", async (req: AuthRequest, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.transactionId, userId: req.user!.id });
    if (!tx) { res.status(404).json({ message: "Transaction not found" }); return; }

    // If already resolved, return immediately
    if (tx.status !== "pending") {
      res.json({ status: tx.status, amount: tx.amount });
      return;
    }

    // If pending and >30s old AND we have a CheckoutRequestID, query Safaricom directly
    const ageSeconds = (Date.now() - new Date(tx.createdAt).getTime()) / 1000;
    if (ageSeconds > 30 && tx.mpesaCheckoutRequestId) {
      try {
        const config = await getConfig();
        if (config.mpesaConfigured && config.mpesaConsumerKey) {
          const queryResult = await querySTKPush(
            {
              consumerKey: config.mpesaConsumerKey,
              consumerSecret: config.mpesaConsumerSecret,
              shortCode: config.mpesaShortCode,
              passkey: config.mpesaPasskey,
              callbackUrl: config.mpesaCallbackUrl,
              environment: config.mpesaEnvironment,
            },
            tx.mpesaCheckoutRequestId
          );

          if (queryResult.ResultCode === "0") {
            // Payment confirmed — credit the user
            tx.status = "completed";
            await tx.save();

            const user = await User.findByIdAndUpdate(
              tx.userId,
              { $inc: { balance: tx.amount, totalDeposits: tx.amount } },
              { new: true }
            );
            await Notification.create({
              userId: tx.userId,
              type: "deposit",
              message: `✅ M-Pesa deposit of KSh ${tx.amount} confirmed. Balance: KSh ${user!.balance.toFixed(2)}`,
              data: { amount: tx.amount },
            });
            res.json({ status: "completed", amount: tx.amount });
            return;
          } else if (["1032", "1037", "1025", "9999"].includes(queryResult.ResultCode)) {
            // Definitively cancelled/timed out
            tx.status = "failed";
            await tx.save();
            res.json({ status: "failed", amount: tx.amount, reason: queryResult.ResultDesc });
            return;
          }
          // Other codes = still processing, stay pending
        }
      } catch (queryErr: any) {
        // STK query failed (e.g. sandbox limitation) — just return current DB status
        console.warn("STK query failed, using DB status:", queryErr?.response?.data?.errorMessage || queryErr.message);
      }
    }

    res.json({ status: tx.status, amount: tx.amount });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /user/deposit/initiate — unified deposit initiation (picks gateway from activePaymentMethod)
router.post("/deposit/initiate", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { amount, phone } = req.body;

    if (!amount || amount < config.minDeposit) {
      res.status(400).json({ message: `Minimum deposit is KSh ${config.minDeposit}` });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }

    const method = config.activePaymentMethod ?? "auto";
    const usedaraja = method === "daraja" || (method === "auto" && config.mpesaConfigured && config.mpesaConsumerKey);
    const usePesapal = method === "pesapal" || (method === "auto" && !usedaraja && config.pesapalConfigured && config.pesapalConsumerKey);

    if (!usedaraja && !usePesapal) {
      res.status(503).json({ message: "No payment gateway is configured. Contact support." });
      return;
    }

    // ── Daraja STK push ──
    if (usedaraja) {
      if (!phone) { res.status(400).json({ message: "Phone number is required for M-Pesa" }); return; }

      const tx = await Transaction.create({
        userId: req.user!.id,
        type: "deposit",
        amount,
        fee: 0,
        netAmount: amount,
        status: "pending",
        description: "M-Pesa deposit",
        paymentGateway: "daraja",
        mpesaPhone: phone,
      });

      try {
        const stkResult = await initiateSTKPush(
          {
            consumerKey: config.mpesaConsumerKey,
            consumerSecret: config.mpesaConsumerSecret,
            shortCode: config.mpesaShortCode,
            passkey: config.mpesaPasskey,
            callbackUrl: config.mpesaCallbackUrl,
            environment: config.mpesaEnvironment,
          },
          phone,
          amount,
          `GB-${tx.id}`,
          "GoalBet Deposit"
        );

        if (stkResult.ResponseCode !== "0") {
          tx.status = "failed";
          await tx.save();
          // In auto mode, fallback to Pesapal if configured
          if (method === "auto" && config.pesapalConfigured && config.pesapalConsumerKey) {
            // fall through to Pesapal below
          } else {
            res.status(502).json({ message: stkResult.ResponseDescription || "STK push failed" });
            return;
          }
        } else {
          tx.mpesaCheckoutRequestId = stkResult.CheckoutRequestID;
          tx.mpesaMerchantRequestId = stkResult.MerchantRequestID;
          await tx.save();
          res.json({
            success: true,
            method: "daraja",
            message: "M-Pesa prompt sent to your phone. Enter your PIN to confirm.",
            checkoutRequestId: stkResult.CheckoutRequestID,
            transactionId: tx.id,
          });
          return;
        }
      } catch (darajaErr: any) {
        tx.status = "failed";
        await tx.save();
        // In auto mode, fallback to Pesapal
        if (method !== "auto" || !config.pesapalConfigured || !config.pesapalConsumerKey) {
          console.error("Daraja error:", darajaErr?.response?.data || darajaErr.message);
          res.status(500).json({ message: darajaErr?.response?.data?.errorMessage || "Failed to initiate M-Pesa payment" });
          return;
        }
        console.warn("Daraja failed, falling back to Pesapal:", darajaErr.message);
      }
    }

    // ── Pesapal order ──
    if (!config.pesapalConfigured || !config.pesapalConsumerKey) {
      res.status(503).json({ message: "Pesapal is not configured. Contact support." });
      return;
    }
    if (!config.pesapalIpnId) {
      res.status(503).json({ message: "Pesapal IPN not registered. Admin must register IPN first." });
      return;
    }

    const tx = await Transaction.create({
      userId: req.user!.id,
      type: "deposit",
      amount,
      fee: 0,
      netAmount: amount,
      status: "pending",
      description: "Pesapal deposit",
      paymentGateway: "pesapal",
    });

    const merchantRef = `GB-PP-${tx.id}`;
    const orderResult = await submitPesapalOrder(
      { consumerKey: config.pesapalConsumerKey, consumerSecret: config.pesapalConsumerSecret, environment: config.pesapalEnvironment },
      {
        merchantReference: merchantRef,
        amount,
        currency: "KES",
        description: "GoalBet Deposit",
        callbackUrl: config.pesapalCallbackUrl || `${req.headers.origin}/transactions`,
        ipnId: config.pesapalIpnId,
        email: user.email,
        phone: phone || user.phone || "",
        firstName: user.username,
        lastName: "User",
      }
    );

    tx.pesapalOrderTrackingId = orderResult.orderTrackingId;
    tx.pesapalMerchantReference = orderResult.merchantReference;
    await tx.save();

    res.json({
      success: true,
      method: "pesapal",
      message: "Click the link below to complete your payment via Pesapal.",
      redirectUrl: orderResult.redirectUrl,
      orderTrackingId: orderResult.orderTrackingId,
      transactionId: tx.id,
    });
  } catch (err: any) {
    console.error("Deposit initiate error:", err?.response?.data || err.message);
    res.status(500).json({ message: err?.response?.data?.error?.message || err.message || "Failed to initiate deposit" });
  }
});

// GET /user/deposit/pesapal/status/:trackingId — poll Pesapal order status
router.get("/deposit/pesapal/status/:trackingId", async (req: AuthRequest, res) => {
  try {
    const tx = await Transaction.findOne({ pesapalOrderTrackingId: req.params.trackingId, userId: req.user!.id });
    if (!tx) { res.status(404).json({ message: "Transaction not found" }); return; }

    // If already resolved, return DB status
    if (tx.status === "completed" || tx.status === "failed") {
      res.json({ status: tx.status, amount: tx.amount });
      return;
    }

    // Otherwise poll Pesapal API
    const config = await getConfig();
    const statusResult = await getPesapalOrderStatus(
      { consumerKey: config.pesapalConsumerKey, consumerSecret: config.pesapalConsumerSecret, environment: config.pesapalEnvironment },
      req.params.trackingId
    );

    if (statusResult.status === "COMPLETED") {
      tx.status = "completed";
      await tx.save();

      const amount = statusResult.amount ?? tx.amount;
      const user = await User.findByIdAndUpdate(
        tx.userId,
        { $inc: { balance: amount, totalDeposits: amount } },
        { new: true }
      );

      await Notification.create({
        userId: tx.userId,
        type: "deposit",
        message: `✅ Pesapal deposit of KSh ${amount} confirmed. Balance: KSh ${user!.balance.toFixed(2)}`,
        data: { amount },
      });

      res.json({ status: "completed", amount });
    } else if (statusResult.status === "FAILED" || statusResult.status === "INVALID") {
      tx.status = "failed";
      await tx.save();
      res.json({ status: "failed", amount: tx.amount });
    } else {
      res.json({ status: "pending", amount: tx.amount });
    }
  } catch (err: any) {
    console.error("Pesapal status check error:", err?.response?.data || err.message);
    res.status(500).json({ message: "Failed to check payment status" });
  }
});

// POST /user/deposit — manual/admin credit (kept for fallback)
router.post("/deposit", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { amount, method } = req.body;
    if (!amount || amount < config.minDeposit) {
      res.status(400).json({ message: `Minimum deposit is KSh ${config.minDeposit}` });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $inc: { balance: amount, totalDeposits: amount } },
      { new: true }
    );

    const tx = await Transaction.create({
      userId: req.user!.id,
      type: "deposit",
      amount,
      fee: 0,
      netAmount: amount,
      status: "completed",
      description: `Deposit via ${method || "M-Pesa"}`,
    });

    await Notification.create({
      userId: req.user!.id,
      type: "deposit",
      message: `✅ Deposit of KSh ${amount} confirmed. Balance: KSh ${user!.balance.toFixed(2)}`,
      data: { amount },
    });

    res.json({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee,
      netAmount: tx.netAmount,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /user/withdraw
router.post("/withdraw", async (req: AuthRequest, res) => {
  try {
    const config = await getConfig();
    const { amount, accountDetails } = req.body;

    if (!amount || amount < config.minWithdrawal) {
      res.status(400).json({ message: `Minimum withdrawal is KSh ${config.minWithdrawal}` });
      return;
    }

    if (!accountDetails) {
      res.status(400).json({ message: "Account details are required" });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user || user.balance < amount) {
      res.status(400).json({ message: "Insufficient balance" });
      return;
    }

    const fee = (amount * config.withdrawalFeePercent) / 100;
    const netAmount = amount - fee;

    await User.findByIdAndUpdate(req.user!.id, {
      $inc: { balance: -amount, totalWithdrawals: amount },
    });

    const tx = await Transaction.create({
      userId: req.user!.id,
      type: "withdrawal",
      amount,
      fee,
      netAmount,
      status: "pending",
      description: `Withdrawal to ${accountDetails.substring(0, 30)}`,
      accountDetails,
    });

    await Notification.create({
      userId: req.user!.id,
      type: "withdrawal",
      message: `💸 Withdrawal of KSh ${amount} requested. Net: KSh ${netAmount.toFixed(2)}. Pending approval.`,
      data: { amount, fee, netAmount },
    });

    res.json({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee,
      netAmount: tx.netAmount,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /user/transactions
router.get("/transactions", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ userId: req.user!.id }),
  ]);

  res.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      fee: t.fee,
      netAmount: t.netAmount,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /user/bets
router.get("/bets", async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [bets, total] = await Promise.all([
    Bet.find({ userId: req.user!.id })
      .populate("matchId", "homeTeam awayTeam homeScore awayScore status result")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bet.countDocuments({ userId: req.user!.id }),
  ]);

  res.json({
    bets: bets.map((b) => {
      const match = b.matchId as any;
      return {
        id: b.id,
        matchId: match?._id?.toString() ?? b.matchId.toString(),
        userId: b.userId.toString(),
        homeTeam: match?.homeTeam ?? "",
        awayTeam: match?.awayTeam ?? "",
        outcome: b.outcome,
        amount: b.amount,
        odds: b.odds,
        potentialWinnings: b.potentialWinnings,
        status: b.status,
        actualWinnings: b.actualWinnings,
        createdAt: b.createdAt,
        settledAt: b.settledAt,
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /user/notifications — only returns notifications from the last 24 hours
router.get("/notifications", async (req: AuthRequest, res) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const notifications = await Notification.find({
    userId: req.user!.id,
    createdAt: { $gte: cutoff },
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    userId: req.user!.id,
    read: false,
    createdAt: { $gte: cutoff },
  });

  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      data: n.data,
    })),
    unreadCount,
  });
});

// POST /user/notifications/read
router.post("/notifications/read", async (req: AuthRequest, res) => {
  await Notification.updateMany({ userId: req.user!.id, read: false }, { read: true });
  res.json({ success: true, message: "All notifications marked as read" });
});

// GET /user/slips
router.get("/slips", async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { userId: req.user!.id };
    if (status && ["pending", "won", "lost", "refunded"].includes(status)) {
      filter.status = status;
    }

    const [slips, total] = await Promise.all([
      BetSlip.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BetSlip.countDocuments(filter),
    ]);

    res.json({
      slips: slips.map((s) => ({
        id: s.id,
        slipId: s.slipId,
        userId: s.userId.toString(),
        selections: s.selections.map((sel) => ({
          matchId: sel.matchId.toString(),
          homeTeam: sel.homeTeam,
          awayTeam: sel.awayTeam,
          outcome: sel.outcome,
          odds: sel.odds,
          status: sel.status,
          matchResult: sel.matchResult,
        })),
        combinedOdds: s.combinedOdds,
        stake: s.stake,
        potentialWinnings: s.potentialWinnings,
        status: s.status,
        actualWinnings: s.actualWinnings,
        createdAt: s.createdAt,
        settledAt: s.settledAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get slips error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /user/slips/:slipId
router.get("/slips/:slipId", async (req: AuthRequest, res) => {
  try {
    const slip = await BetSlip.findOne({ slipId: req.params.slipId, userId: req.user!.id });
    if (!slip) { res.status(404).json({ message: "Slip not found" }); return; }

    res.json({
      id: slip.id,
      slipId: slip.slipId,
      userId: slip.userId.toString(),
      selections: slip.selections.map((sel) => ({
        matchId: sel.matchId.toString(),
        homeTeam: sel.homeTeam,
        awayTeam: sel.awayTeam,
        outcome: sel.outcome,
        odds: sel.odds,
        status: sel.status,
        matchResult: sel.matchResult,
      })),
      combinedOdds: slip.combinedOdds,
      stake: slip.stake,
      potentialWinnings: slip.potentialWinnings,
      status: slip.status,
      actualWinnings: slip.actualWinnings,
      createdAt: slip.createdAt,
      settledAt: slip.settledAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
