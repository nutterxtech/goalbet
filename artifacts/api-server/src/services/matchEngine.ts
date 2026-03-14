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
 * Auto-balance: if paying the natural winner would cost the platform more than collected,
 * override both the result and the score to protect platform without revealing manipulation.
 */
async function autoBalanceResult(
  match: IMatch,
  homeScore: number,
  awayScore: number
): Promise<{ result: "home" | "draw" | "away"; homeScore: number; awayScore: number }> {
  const result = match.result!;
  const bets = await Bet.find({ matchId: match._id, status: "pending" });

  const collected = bets.reduce((sum, b) => sum + b.amount, 0);
  const payoutByOutcome: Record<"home" | "draw" | "away", number> = { home: 0, draw: 0, away: 0 };
  for (const bet of bets) {
    payoutByOutcome[bet.outcome] += bet.amount * bet.odds;
  }

  if (payoutByOutcome[result] > collected * 0.88) {
    const minOutcome = (Object.keys(payoutByOutcome) as ("home" | "draw" | "away")[])
      .sort((a, b) => payoutByOutcome[a] - payoutByOutcome[b])[0];

    if (minOutcome !== result) {
      console.log(`⚖️ Auto-balance: overriding ${result} → ${minOutcome}`);

      let newHome = homeScore;
      let newAway = awayScore;

      if (minOutcome === "draw") {
        const eq = Math.min(newHome, newAway);
        newHome = eq;
        newAway = eq;
      } else if (minOutcome === "home" && newHome <= newAway) {
        newHome = newAway + 1;
      } else if (minOutcome === "away" && newAway <= newHome) {
        newAway = newHome + 1;
      }

      await Match.findByIdAndUpdate(match._id, {
        result: minOutcome,
        homeScore: newHome,
        awayScore: newAway,
      });
      return { result: minOutcome, homeScore: newHome, awayScore: newAway };
    }
  }
  return { result, homeScore, awayScore };
}

async function settleBets(match: IMatch, finalHome: number, finalAway: number) {
  const balanced = await autoBalanceResult(match, finalHome, finalAway);
  const result = balanced.result;

  const bets = await Bet.find({ matchId: match._id, status: "pending" });
  for (const bet of bets) {
    const won = bet.outcome === result;
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

    if (allSettled) {
      if (anyLost) {
        slip.status = "lost";
        slip.settledAt = new Date();
        await slip.save();
        await Notification.create({
          userId: slip.userId,
          type: "bet_lost",
          message: `❌ Slip #${slip.slipId} lost — ${match.homeTeam} vs ${match.awayTeam} didn't go your way.`,
          data: { slipId: slip.slipId },
        });
      } else {
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
      }
    } else {
      if (anyLost) {
        slip.status = "lost";
        slip.settledAt = new Date();
        await slip.save();
        await Notification.create({
          userId: slip.userId,
          type: "bet_lost",
          message: `❌ Slip #${slip.slipId} lost — ${match.homeTeam} vs ${match.awayTeam} knocked you out.`,
          data: { slipId: slip.slipId },
        });
      } else {
        await slip.save();
      }
    }
  }
}

export async function startMatchSimulation(matchId: string, skipBettingWindow = false): Promise<void> {
  if (activeSimulations.has(matchId)) return;

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
    if (!matchAfter || matchAfter.status !== "betting_open") return;
  }

  const totalDuration = config.matchDurationSeconds * 1000;
  const updateInterval = totalDuration / 90;
  // Halftime pause = ~5 real seconds (or 6% of total duration, whichever is greater)
  const halftimePauseDuration = Math.max(5000, totalDuration * 0.06);

  let currentMinute = 0;
  let homeScore = 0;
  let awayScore = 0;
  let halftimePaused = false;
  const events: IMatch["events"] = [];

  const matchDoc = await Match.findById(matchId);
  const homeTeamData = matchDoc ? getTeamData(matchDoc.homeTeam) : null;
  const awayTeamData = matchDoc ? getTeamData(matchDoc.awayTeam) : null;

  const homePlayers = homeTeamData ? getForwardsAndMidfielders(homeTeamData) : ["Player A", "Player B", "Player C"];
  const awayPlayers = awayTeamData ? getForwardsAndMidfielders(awayTeamData) : ["Player X", "Player Y", "Player Z"];
  const homeDefenders = homeTeamData?.players.filter(p => p.position === "DEF").map(p => p.name) || ["Defender"];
  const awayDefenders = awayTeamData?.players.filter(p => p.position === "DEF").map(p => p.name) || ["Defender"];

  await Match.findByIdAndUpdate(matchId, {
    status: "live",
    startedAt: new Date(),
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    events: [{ minute: 0, type: "kickoff", team: "home", description: `⚽ Kick off! ${matchDoc?.homeTeam} vs ${matchDoc?.awayTeam}` }],
  });

  const interval = setInterval(async () => {
    if (halftimePaused) return;

    try {
      currentMinute++;

      if (currentMinute > 90) {
        clearInterval(interval);
        activeSimulations.delete(matchId);

        const result = determineResult(homeScore, awayScore);
        events.push({
          minute: 90,
          type: "fulltime",
          team: "home",
          description: `🏁 Full time! Final score: ${homeScore}-${awayScore}`,
        });

        await Match.findByIdAndUpdate(matchId, {
          status: "completed",
          minute: 90,
          homeScore,
          awayScore,
          result,
          completedAt: new Date(),
          events,
        });

        const match = await Match.findById(matchId);
        if (match) {
          await settleBets(match, homeScore, awayScore);
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

        // Pause simulation at 45' — ticker stays at HT until second half
        halftimePaused = true;
        setTimeout(() => {
          halftimePaused = false;
        }, halftimePauseDuration);
        return;
      }

      const goalProbability = 0.031;
      if (Math.random() < goalProbability) {
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

  activeSimulations.set(matchId, interval);
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

      // Maintain minimum 4 live matches
      const liveCount = await Match.countDocuments({ status: "live" });
      if (liveCount < 4) {
        const need = 4 - liveCount;
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

      // Maintain 5-8 upcoming matches
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

          const homeStrength = 0.4 + Math.random() * 0.3;
          const awayStrength = 1 - homeStrength - 0.15;

          const homeOdds = parseFloat((1 / homeStrength).toFixed(2));
          const awayOdds = parseFloat((1 / awayStrength).toFixed(2));
          const drawOdds = parseFloat((1 / 0.15).toFixed(2));

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

  runScheduler();
  autoSchedulerTimer = setInterval(runScheduler, 30 * 1000);
  console.log("⏰ Match auto-scheduler started (30s interval)");
}

export function stopAutoScheduler(): void {
  if (autoSchedulerTimer) {
    clearInterval(autoSchedulerTimer);
    autoSchedulerTimer = null;
  }
}
