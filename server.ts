import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { ICONIC_SQUADS } from "./src/data/iconicSquads";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Pick a random unused squad index so no 2 same squads appear in a single game
function drawUnusedSquadIndex(usedIndices: number[]): number {
  const total = ICONIC_SQUADS.length;
  if (usedIndices.length >= total) {
    const last = usedIndices[usedIndices.length - 1];
    usedIndices.length = 0;
    if (last !== undefined) usedIndices.push(last);
  }

  let attempts = 0;
  let idx = Math.floor(Math.random() * total);
  while (usedIndices.includes(idx) && attempts < 1000) {
    idx = Math.floor(Math.random() * total);
    attempts++;
  }
  usedIndices.push(idx);
  return idx;
}

// Initialize Google Gen AI client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Session player availability tracking state (in-memory, synchronized)
let globalDraftedPlayers: Set<string> = new Set();

// Room Code State for Multi-Device Online Play
interface RoomState {
  code: string;
  status: 'SETUP' | 'DRAFT' | 'SUMMARY' | 'SIMULATION' | 'SCORECARD';
  format: 'T20' | 'ODI';
  pitch: string;
  playMode: 'VS_AI' | 'LOCAL_2P' | 'ONLINE_ROOM';
  p1: {
    name: string;
    squad: any[];
    battingOrder: any[];
    composition: any;
    isReady: boolean;
  };
  p2: {
    name: string;
    squad: any[];
    battingOrder: any[];
    composition: any;
    isAi: boolean;
    isReady: boolean;
  };
  globalDraftedCanonicalIds: string[];
  usedSquadIndices: number[];
  activeDraftTurn: 'p1' | 'p2';
  currentSquadIndex: number;
  turnStartTime: number;
  tossWinner: 'p1' | 'p2' | null;
  tossDecision: 'Bat' | 'Bowl' | null;
  matchResult: any | null;
  lastUpdated: number;
}

const rooms: Map<string, RoomState> = new Map();

// Helper: Generate 6-digit numeric room code
function generateRoomCode(): string {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Create a new room code
app.post("/api/rooms/create", (req, res) => {
  const { p1Name, p1Comp, format, pitch, playMode, p2Name, p2Comp, isAi } = req.body;
  const code = generateRoomCode();

  const room: RoomState = {
    code,
    status: playMode === 'ONLINE_ROOM' ? 'SETUP' : 'DRAFT',
    format: format || 'T20',
    pitch: pitch || 'BALANCED',
    playMode: playMode || 'ONLINE_ROOM',
    p1: {
      name: p1Name || 'Player 1 XI',
      squad: [],
      battingOrder: [],
      composition: p1Comp || { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
      isReady: true,
    },
    p2: {
      name: p2Name || (isAi ? 'Cyber Legends XI (AI)' : 'Waiting for Player 2...'),
      squad: [],
      battingOrder: [],
      composition: p2Comp || { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
      isAi: !!isAi,
      isReady: false,
    },
    globalDraftedCanonicalIds: [],
    usedSquadIndices: [],
    activeDraftTurn: 'p1',
    currentSquadIndex: 0,
    turnStartTime: Date.now(),
    tossWinner: null,
    tossDecision: null,
    matchResult: null,
    lastUpdated: Date.now(),
  };

  room.currentSquadIndex = drawUnusedSquadIndex(room.usedSquadIndices);

  rooms.set(code, room);
  res.json({ success: true, code, playerId: 'p1', room });
});

// API: Join an existing room with room code
app.post("/api/rooms/join", (req, res) => {
  const { code, p2Name, p2Comp } = req.body;
  const cleanCode = (code || '').trim();
  const room = rooms.get(cleanCode);

  if (!room) {
    return res.status(404).json({ error: "Room not found! Check the 6-digit code and try again." });
  }

  if (room.p2.isReady && !room.p2.isAi) {
    return res.status(409).json({ error: "Room is already full!" });
  }

  room.p2.name = p2Name || room.p2.name || 'Player 2 XI';
  if (p2Comp) room.p2.composition = p2Comp;
  room.p2.isReady = true;
  room.p2.isAi = false;
  room.status = 'DRAFT';
  room.turnStartTime = Date.now();
  room.lastUpdated = Date.now();

  res.json({ success: true, code: cleanCode, playerId: 'p2', room });
});

// API: Get room state by code (polling endpoint)
app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  res.json({ success: true, room });
});

// API: Update room general state
app.post("/api/rooms/:code/update", (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const { status, p1BattingOrder, p2BattingOrder, tossWinner, tossDecision, matchResult, format, pitch } = req.body;

  if (status) room.status = status;
  if (format) room.format = format;
  if (pitch) room.pitch = pitch;
  if (p1BattingOrder) room.p1.battingOrder = p1BattingOrder;
  if (p2BattingOrder) room.p2.battingOrder = p2BattingOrder;
  if (tossWinner) room.tossWinner = tossWinner;
  if (tossDecision) room.tossDecision = tossDecision;
  if (matchResult) room.matchResult = matchResult;

  room.lastUpdated = Date.now();
  res.json({ success: true, room });
});

// API: Draft a player in a room
app.post("/api/rooms/:code/draft/select", (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const { playerId, player } = req.body;

  if (!player || !player.canonicalId) {
    return res.status(400).json({ error: "Invalid player data" });
  }

  if (room.globalDraftedCanonicalIds.includes(player.canonicalId)) {
    return res.status(409).json({ error: `${player.name} has already been drafted!` });
  }

  // Draft player
  room.globalDraftedCanonicalIds.push(player.canonicalId);

  if (playerId === 'p1') {
    room.p1.squad.push(player);
    room.p1.battingOrder.push(player);
  } else {
    room.p2.squad.push(player);
    room.p2.battingOrder.push(player);
  }

  // Switch turn if drafting isn't complete
  const p1Len = room.p1.squad.length;
  const p2Len = room.p2.squad.length;

  if (p1Len === 11 && p2Len === 11) {
    room.status = 'SUMMARY';
  } else {
    if (playerId === 'p1' && p2Len < 11) {
      room.activeDraftTurn = 'p2';
    } else if (playerId === 'p2' && p1Len < 11) {
      room.activeDraftTurn = 'p1';
    } else if (p1Len < 11) {
      room.activeDraftTurn = 'p1';
    } else if (p2Len < 11) {
      room.activeDraftTurn = 'p2';
    }

    // Pick a new random unused squad index
    room.currentSquadIndex = drawUnusedSquadIndex(room.usedSquadIndices);
    // Reset 30s countdown timer on server
    room.turnStartTime = Date.now();
  }

  room.lastUpdated = Date.now();
  res.json({ success: true, room });
});

// API: Get drafted players session availability
app.get("/api/draft/session", (req, res) => {
  res.json({
    draftedCanonicalIds: Array.from(globalDraftedPlayers),
  });
});

// API: Reserve / Draft a player canonically across session
app.post("/api/draft/select", (req, res) => {
  const { canonicalId, playerName } = req.body;
  if (!canonicalId) {
    return res.status(400).json({ error: "canonicalId is required" });
  }

  if (globalDraftedPlayers.has(canonicalId)) {
    return res.status(409).json({
      error: `Player ${playerName || canonicalId} has already been selected by another team in this session!`,
      alreadySelected: true,
    });
  }

  globalDraftedPlayers.add(canonicalId);
  return res.json({
    success: true,
    canonicalId,
    draftedCanonicalIds: Array.from(globalDraftedPlayers),
  });
});

// API: Reset session availability
app.post("/api/draft/reset", (req, res) => {
  globalDraftedPlayers.clear();
  return res.json({
    success: true,
    draftedCanonicalIds: [],
  });
});

// API: Gemini AI Commentary & Analysis Endpoint
app.post("/api/gemini/analysis", async (req, res) => {
  try {
    const { team1Name, team2Name, winner, scorecard, format, keyEvents } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        analysis: `A thrilling ${format} match concluded between ${team1Name} and ${team2Name}! ${winner} clinched a memorable victory through stellar tactical play and standout individual performances.`,
      });
    }

    const prompt = `
You are a legendary, enthusiastic world-class cricket commentator (in the style of Shastri & Nasser Hussain).
Provide a quick, punchy 3-bullet post-match summary for this ${format} cricket match:
Team 1: ${team1Name}
Team 2: ${team2Name}
Match Winner: ${winner}
Key Highlights & Events: ${JSON.stringify(keyEvents || []).slice(0, 500)}

Scorecard highlights:
${JSON.stringify(scorecard || {}).slice(0, 800)}

Include:
1. Turning point of the match.
2. Standout Player of the Match performance.
3. Masterclass commentary takeaway.
Keep it thrilling and cricket-authentic!
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      analysis: response.text || "An incredible match with breathtaking cricketing action!",
    });
  } catch (err: any) {
    console.error("Gemini AI Analysis Error:", err);
    res.status(500).json({
      error: "Failed to generate AI commentary",
      analysis: "An electric contest down to the last over!",
    });
  }
});

// API: Gemini AI Smart Draft Suggestion
app.post("/api/gemini/draft-advice", async (req, res) => {
  try {
    const { myTeamName, needRoles, availableSquadPlayers, format } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        advice: "Focus on picking high-OVR players that fulfill your team role composition needs!",
      });
    }

    const prompt = `
As a expert cricket analyst, give 1 short sentence strategic recommendation for ${myTeamName} drafting in a ${format} match.
Needs roles: ${JSON.stringify(needRoles)}
Top available squad options: ${JSON.stringify(availableSquadPlayers?.slice(0, 5) || [])}
Give direct advice on which player/role to prioritize.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      advice: response.text?.trim() || "Prioritize balanced key match winners!",
    });
  } catch (err: any) {
    res.json({ advice: "Pick top rated players that meet your slot requirements." });
  }
});

// Mount Vite middleware in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cricket Simulator Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
