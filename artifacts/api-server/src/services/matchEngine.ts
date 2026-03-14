import { Match, IMatch } from "../models/Match.js";
import { Bet } from "../models/Bet.js";
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
          await settleBets(match);
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
      }

      // Goal probability ~2.8 goals per match average
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

      // Yellow card
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

      // Red card (very rare)
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

      // Substitution
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

// Auto-scheduler: creates and starts matches automatically every N minutes
export function startAutoScheduler(): void {
  if (autoSchedulerTimer) return;

  async function runScheduler() {
    try {
      // Check for upcoming matches that should have started by now
      const now = new Date();
      const scheduledMatches = await Match.find({
        status: "upcoming",
        scheduledAt: { $lte: now },
      });

      for (const match of scheduledMatches) {
        console.log(`Auto-starting scheduled match: ${match.homeTeam} vs ${match.awayTeam}`);
        startMatchSimulation(match.id).catch(console.error);
      }

      // Auto-generate new matches if there are fewer than 3 upcoming/betting_open matches
      const activeCount = await Match.countDocuments({
        status: { $in: ["upcoming", "betting_open"] },
      });

      if (activeCount < 3) {
        const shuffledTeams = [...TEAMS].sort(() => Math.random() - 0.5);
        const usedTeams = new Set<string>();
        const pairsToCreate = 3 - activeCount;

        let created = 0;
        for (let i = 0; i < shuffledTeams.length - 1 && created < pairsToCreate; i++) {
          const home = shuffledTeams[i];
          const away = shuffledTeams[i + 1];

          if (usedTeams.has(home.name) || usedTeams.has(away.name)) continue;
          if (home.name === away.name) continue;

          usedTeams.add(home.name);
          usedTeams.add(away.name);

          // Generate realistic odds based on random strength
          const homeStrength = 0.4 + Math.random() * 0.3;
          const awayStrength = 1 - homeStrength - 0.15;
          const drawStrength = 0.15;

          const homeOdds = parseFloat((1 / homeStrength).toFixed(2));
          const awayOdds = parseFloat((1 / awayStrength).toFixed(2));
          const drawOdds = parseFloat((1 / drawStrength).toFixed(2));

          await Match.create({
            homeTeam: home.name,
            awayTeam: away.name,
            homeTeamCode: home.code,
            awayTeamCode: away.code,
            league: home.league,
            odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
            status: "upcoming",
            scheduledAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min from now
          });

          created++;
        }
      }
    } catch (err) {
      console.error("Auto-scheduler error:", err);
    }
  }

  // Run immediately then every 60 seconds
  runScheduler();
  autoSchedulerTimer = setInterval(runScheduler, 60 * 1000);
  console.log("⏰ Match auto-scheduler started");
}

export function stopAutoScheduler(): void {
  if (autoSchedulerTimer) {
    clearInterval(autoSchedulerTimer);
    autoSchedulerTimer = null;
  }
}
