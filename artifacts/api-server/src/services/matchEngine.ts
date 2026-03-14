import { Match, IMatch } from "../models/Match.js";
import { Bet } from "../models/Bet.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { getConfig } from "../models/PlatformConfig.js";

const FOOTBALL_PLAYERS = {
  home: ["Player A", "Player B", "Player C", "Player D", "Player E"],
  away: ["Player V", "Player W", "Player X", "Player Y", "Player Z"],
};

const activeSimulations = new Map<string, NodeJS.Timeout>();

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function determineResult(homeScore: number, awayScore: number): "home" | "draw" | "away" {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

async function settleBets(match: IMatch) {
  const result = match.result!;
  const bets = await Bet.find({ matchId: match._id, status: "pending" });

  for (const bet of bets) {
    const won = bet.outcome === result;
    if (won) {
      const winnings = bet.amount * bet.odds;
      bet.status = "won";
      bet.actualWinnings = winnings;
      bet.settledAt = new Date();
      await bet.save();

      await User.findByIdAndUpdate(bet.userId, {
        $inc: { balance: winnings, totalWins: 1, totalWinnings: winnings },
      });

      await Transaction.create({
        userId: bet.userId,
        type: "winnings",
        amount: winnings,
        fee: 0,
        netAmount: winnings,
        status: "completed",
        description: `Winnings from ${match.homeTeam} vs ${match.awayTeam}`,
      });

      await Notification.create({
        userId: bet.userId,
        type: "bet_won",
        message: `🎉 You won KSh ${winnings.toFixed(2)} on ${match.homeTeam} vs ${match.awayTeam}!`,
        data: { matchId: match._id, winnings },
      });
    } else {
      bet.status = "lost";
      bet.settledAt = new Date();
      await bet.save();

      await Notification.create({
        userId: bet.userId,
        type: "bet_lost",
        message: `❌ You lost your bet on ${match.homeTeam} vs ${match.awayTeam}.`,
        data: { matchId: match._id },
      });
    }

    await User.findByIdAndUpdate(bet.userId, { $inc: { totalBets: 1 } });
  }
}

export async function startMatchSimulation(matchId: string): Promise<void> {
  if (activeSimulations.has(matchId)) return;

  const config = await getConfig();

  // First open betting window if not already open
  const matchBefore = await Match.findById(matchId);
  if (matchBefore && matchBefore.status === "upcoming") {
    const bettingCloseAt = new Date(Date.now() + config.bettingWindowMinutes * 60 * 1000);
    await Match.findByIdAndUpdate(matchId, {
      status: "betting_open",
      bettingClosesAt: bettingCloseAt,
    });
    // Wait for betting window to close before simulating
    await new Promise((resolve) => setTimeout(resolve, config.bettingWindowMinutes * 60 * 1000));
    // Re-check match wasn't cancelled during wait
    const matchAfter = await Match.findById(matchId);
    if (!matchAfter || matchAfter.status !== "betting_open") return;
  }

  const totalDuration = config.matchDurationSeconds * 1000;
  const updateInterval = totalDuration / 90;

  let currentMinute = 0;
  let homeScore = 0;
  let awayScore = 0;
  const events: IMatch["events"] = [];

  await Match.findByIdAndUpdate(matchId, {
    status: "live",
    startedAt: new Date(),
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    events: [{ minute: 0, type: "kickoff", team: "home", description: "Match kicked off!" }],
  });

  const interval = setInterval(async () => {
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
          description: `Full time! Final score: ${homeScore}-${awayScore}`,
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
          await settleBets(match);
        }

        // Notify all users about match completion
        await Notification.create({
          userId: null,
          type: "match_completed",
          message: `Match ended: ${homeScore}-${awayScore}`,
          data: { matchId, result },
        });

        return;
      }

      if (currentMinute === 45) {
        events.push({
          minute: 45,
          type: "halftime",
          team: "home",
          description: `Half time! Score: ${homeScore}-${awayScore}`,
        });
      }

      // Random goal probability (about 2-4 goals per match)
      const goalProbability = 0.033; // ~3% per minute = ~2.7 goals/90min
      if (Math.random() < goalProbability) {
        const scoringTeam: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
        const players = FOOTBALL_PLAYERS[scoringTeam];
        const player = players[getRandomInt(0, players.length - 1)];

        if (scoringTeam === "home") homeScore++;
        else awayScore++;

        events.push({
          minute: currentMinute,
          type: "goal",
          team: scoringTeam,
          player,
          description: `GOAL! ${player} scores for ${scoringTeam} team! ${homeScore}-${awayScore}`,
        });
      }

      // Yellow card (rare)
      if (Math.random() < 0.015) {
        const cardTeam: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
        const players = FOOTBALL_PLAYERS[cardTeam];
        const player = players[getRandomInt(0, players.length - 1)];
        events.push({
          minute: currentMinute,
          type: "yellowCard",
          team: cardTeam,
          player,
          description: `Yellow card shown to ${player}`,
        });
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
