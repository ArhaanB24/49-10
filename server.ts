import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { ICONIC_SQUADS } from "./src/data/iconicSquads";
import { optimizeBattingOrder } from "./src/services/battingOrderService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent Store File Path
const ROOMS_FILE_PATH = path.join(process.cwd(), 'data', 'rooms.json');

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

// Cloud Key-Value Store fallback for cross-device room persistence
const CLOUD_APP_KEY = 'bz9gzwf9';

function encodeRoomData(room: RoomState): string {
  try {
    const json = JSON.stringify(room);
    const bytes = new TextEncoder().encode(json);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('[Server] encodeRoomData error:', err);
    return '';
  }
}

function decodeRoomData(rawText: string): RoomState | null {
  try {
    if (!rawText) return null;
    let clean = rawText.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1);
    }
    clean = clean.trim();
    if (!clean || clean === 'null' || clean === '""' || clean === 'Value not found') return null;

    if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
      }
      const json = new TextDecoder().decode(bytes);
      const room = JSON.parse(json);
      if (room && room.code) return room;
    }

    try {
      const json = decodeURIComponent(clean);
      const room = JSON.parse(json);
      if (room && room.code) return room;
    } catch {}
  } catch (err) {
    console.error('[Server] decodeRoomData failed:', err);
  }
  return null;
}

async function syncRoomToCloud(room: RoomState): Promise<void> {
  if (!room || !room.code) return;
  const cleanCode = room.code.trim().toUpperCase();
  const hex = encodeRoomData(room);
  if (!hex) return;

  const chunkSize = 800;
  const numChunks = Math.ceil(hex.length / chunkSize);

  try {
    // 1. Store chunk count metadata
    await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_APP_KEY}/room_${cleanCode}_meta?Value=${numChunks}`, { method: 'POST' });

    // 2. Store hex chunks concurrently
    const chunkPromises = [];
    for (let i = 0; i < numChunks; i++) {
      const chunk = hex.substring(i * chunkSize, (i + 1) * chunkSize);
      chunkPromises.push(
        fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_APP_KEY}/room_${cleanCode}_${i}?Value=${chunk}`, { method: 'POST' })
      );
    }
    await Promise.all(chunkPromises);
    console.log(`[Server] Cloud KV Sync success for ${cleanCode} (${numChunks} chunks, total ${hex.length} hex chars)`);
  } catch (err) {
    console.error(`[Server] Cloud KV Sync error for ${cleanCode}:`, err);
  }
}

async function fetchRoomFromCloud(code: string): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const metaRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_APP_KEY}/room_${cleanCode}_meta`);
    if (metaRes.ok) {
      const metaText = (await metaRes.text()).replace(/"/g, '').trim();
      const count = parseInt(metaText);
      if (count && count > 0) {
        const chunkPromises = [];
        for (let i = 0; i < count; i++) {
          chunkPromises.push(
            fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_APP_KEY}/room_${cleanCode}_${i}`).then(r => r.text())
          );
        }
        const chunks = await Promise.all(chunkPromises);
        let combinedHex = '';
        for (const c of chunks) {
          combinedHex += (c || '').replace(/"/g, '').trim();
        }
        const room = decodeRoomData(combinedHex);
        if (room && room.code) {
          console.log(`[Server] Chunked Cloud KV fetch success for ${cleanCode}:`, room.status);
          return room;
        }
      }
    }
  } catch (err) {
    console.warn(`[Server] Chunked Cloud KV fetch failed for ${cleanCode}:`, err);
  }

  // Fallback to single key if legacy
  try {
    const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_APP_KEY}/room_${cleanCode}`);
    if (res.ok) {
      const rawText = await res.text();
      const room = decodeRoomData(rawText);
      if (room && room.code) return room;
    }
  } catch {}

  return null;
}

async function getOrFetchRoom(code: string): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  let room = rooms.get(cleanCode);
  if (room) {
    console.log(`[Server] Room ${cleanCode} found in server memory`);
    return room;
  }

  // Reload from disk in case saved by file system sync
  const diskMap = loadRoomsFromDisk();
  room = diskMap.get(cleanCode);
  if (room) {
    console.log(`[Server] Room ${cleanCode} loaded from disk into server memory`);
    rooms.set(cleanCode, room);
    return room;
  }

  console.log(`[Server] Room ${cleanCode} NOT in memory or disk, attempting Cloud KV fetch...`);
  room = await fetchRoomFromCloud(cleanCode);
  if (room) {
    console.log(`[Server] Room ${cleanCode} loaded from Cloud KV into server memory`);
    rooms.set(cleanCode, room);
    saveRoomsToDisk();
    return room;
  }

  console.warn(`[Server] Room ${cleanCode} not found anywhere`);
  return null;
}

// Load persistent rooms from disk
function loadRoomsFromDisk(): Map<string, RoomState> {
  const map = new Map<string, RoomState>();
  try {
    const dir = path.dirname(ROOMS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(ROOMS_FILE_PATH)) {
      const data = fs.readFileSync(ROOMS_FILE_PATH, 'utf-8');
      const json = JSON.parse(data);
      const now = Date.now();
      Object.keys(json).forEach((code) => {
        const room = json[code];
        // Retain rooms updated in the last 24 hours
        if (room && (now - (room.lastUpdated || 0)) < 24 * 60 * 60 * 1000) {
          map.set(code, room);
        }
      });
    }
  } catch (err) {
    console.error('Error loading rooms from disk:', err);
  }
  return map;
}

// Save rooms map to disk
function saveRoomsToDisk() {
  try {
    const dir = path.dirname(ROOMS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, RoomState> = {};
    rooms.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(ROOMS_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving rooms to disk:', err);
  }
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

const rooms: Map<string, RoomState> = loadRoomsFromDisk();

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
app.post("/api/rooms/create", async (req, res) => {
  const body = req.body || {};
  const { p1Name, p1Comp, format, pitch, playMode, p2Name, p2Comp, isAi } = body;
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
  saveRoomsToDisk();
  await syncRoomToCloud(room);
  res.json({ success: true, code, playerId: 'p1', room });
});

// API: Sync client room state to backend server and cloud KV
app.post("/api/rooms/cloud-sync", async (req, res) => {
  const room = req.body;
  if (room && room.code) {
    const cleanCode = room.code.trim().toUpperCase();
    rooms.set(cleanCode, room);
    saveRoomsToDisk();
    await syncRoomToCloud(room);
    return res.json({ success: true, code: cleanCode });
  }
  res.status(400).json({ error: "Invalid room state" });
});

// API: Join an existing room with room code
app.post("/api/rooms/join", async (req, res) => {
  const { code, p2Name, p2Comp } = req.body;
  const cleanCode = (code || '').trim().toUpperCase();
  const room = await getOrFetchRoom(cleanCode);

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

  saveRoomsToDisk();
  await syncRoomToCloud(room);
  res.json({ success: true, code: cleanCode, playerId: 'p2', room });
});

// API: Get list of active waiting rooms (for easy joining)
app.get("/api/rooms/active/list", (req, res) => {
  const diskMap = loadRoomsFromDisk();
  diskMap.forEach((v, k) => { if (!rooms.has(k)) rooms.set(k, v); });

  const activeRooms: Array<{ code: string; p1Name: string; format: string; createdAt: number }> = [];
  rooms.forEach((room, code) => {
    if (room && room.status === 'SETUP' && room.p2 && !room.p2.isReady) {
      activeRooms.push({
        code,
        p1Name: room.p1?.name || 'Player 1 XI',
        format: room.format || 'T20',
        createdAt: room.lastUpdated || Date.now(),
      });
    }
  });

  activeRooms.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ success: true, rooms: activeRooms.slice(0, 5) });
});

// API: Get room state by code (polling endpoint)
app.get("/api/rooms/:code", async (req, res) => {
  const cleanCode = (req.params.code || '').trim().toUpperCase();
  const room = await getOrFetchRoom(cleanCode);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  res.json({ success: true, room });
});

// API: Update room general state
app.post("/api/rooms/:code/update", async (req, res) => {
  const cleanCode = (req.params.code || '').trim().toUpperCase();
  const room = await getOrFetchRoom(cleanCode);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const {
    status,
    p1Name,
    p2Name,
    p1BattingOrder,
    p2BattingOrder,
    tossWinner,
    tossDecision,
    matchResult,
    format,
    pitch,
    currentSquadIndex,
    activeDraftTurn,
  } = req.body;

  if (status) room.status = status;
  if (format) room.format = format;
  if (pitch) room.pitch = pitch;
  if (p1Name) room.p1.name = p1Name;
  if (p2Name) room.p2.name = p2Name;
  if (p1BattingOrder) room.p1.battingOrder = p1BattingOrder;
  if (p2BattingOrder) room.p2.battingOrder = p2BattingOrder;
  if (tossWinner) room.tossWinner = tossWinner;
  if (tossDecision) room.tossDecision = tossDecision;
  if (matchResult) room.matchResult = matchResult;
  if (currentSquadIndex !== undefined) room.currentSquadIndex = currentSquadIndex;
  if (activeDraftTurn) room.activeDraftTurn = activeDraftTurn;

  room.lastUpdated = Date.now();
  saveRoomsToDisk();
  await syncRoomToCloud(room);
  res.json({ success: true, room });
});

// API: Draft a player in a room
app.post("/api/rooms/:code/draft/select", async (req, res) => {
  const cleanCode = (req.params.code || '').trim().toUpperCase();
  const room = await getOrFetchRoom(cleanCode);
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
    room.p1.battingOrder = optimizeBattingOrder(room.p1.squad);
  } else {
    room.p2.squad.push(player);
    room.p2.battingOrder = optimizeBattingOrder(room.p2.squad);
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
  saveRoomsToDisk();
  await syncRoomToCloud(room);
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

export default app;
