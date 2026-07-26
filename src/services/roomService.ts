// Dual-mode Room Service (Express Server API + LocalStorage/BroadcastChannel Fallback)
// Ensures multiplayer rooms work seamlessly on Cloud Run, Vercel, static preview iFrames, and multi-tab windows without network errors.

import { optimizeBattingOrder } from './battingOrderService';

export interface RoomState {
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

// Generate 6-digit numeric room code
function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Draw random unused squad index
function drawUnusedSquadIndex(usedIndices: number[], totalSquads = 12): number {
  if (usedIndices.length >= totalSquads) {
    const last = usedIndices[usedIndices.length - 1];
    usedIndices.length = 0;
    if (last !== undefined) usedIndices.push(last);
  }
  let attempts = 0;
  let idx = Math.floor(Math.random() * totalSquads);
  while (usedIndices.includes(idx) && attempts < 1000) {
    idx = Math.floor(Math.random() * totalSquads);
    attempts++;
  }
  usedIndices.push(idx);
  return idx;
}

// BroadcastChannel manager
const channels: Map<string, BroadcastChannel> = new Map();

function getChannel(code: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!channels.has(code)) {
    channels.set(code, new BroadcastChannel(`cricket_room_${code}`));
  }
  return channels.get(code)!;
}

export function subscribeToRoom(code: string, onUpdate: (room: RoomState) => void): () => void {
  const bc = getChannel(code);
  if (bc) {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.room) {
        onUpdate(event.data.room);
      }
    };
    bc.addEventListener('message', handler);

    // Also listen for localStorage storage event for cross-window fallback
    const storageHandler = (e: StorageEvent) => {
      if (e.key === `cricket_room_${code}` && e.newValue) {
        try {
          const room = JSON.parse(e.newValue);
          onUpdate(room);
        } catch {}
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      bc.removeEventListener('message', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
  return () => {};
}

function broadcastRoom(room: RoomState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`cricket_room_${room.code}`, JSON.stringify(room));
    const bc = getChannel(room.code);
    if (bc) {
      bc.postMessage({ type: 'ROOM_UPDATE', room });
    }
  }
}

// Cloud Key-Value Store fallback for cross-device sync when Express server is not reachable (e.g. static hosts like Vercel)
const CLOUD_APP_KEY = 'cricket_v3_app';

function encodeRoomData(room: RoomState): string {
  try {
    const json = JSON.stringify(room);
    const bytes = new TextEncoder().encode(json);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('[RoomService] encodeRoomData error:', err);
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
    console.error('[RoomService] decodeRoomData failed:', err);
  }
  return null;
}

async function syncRoomToCloud(room: RoomState): Promise<void> {
  if (!room || !room.code) return;
  const cleanCode = room.code.trim().toUpperCase();
  const hex = encodeRoomData(room);
  if (!hex) return;

  console.log(`[RoomService] Syncing room ${cleanCode} to Cloud KV Store...`);

  try {
    const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_APP_KEY}/room_${cleanCode}/${hex}`, {
      method: 'POST',
    });
    console.log(`[RoomService] Cloud KV Sync for ${cleanCode}: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[RoomService] Cloud KV Sync error for ${cleanCode}:`, err);
  }
}

async function fetchRoomFromCloud(code: string): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  console.log(`[RoomService] Fetching room ${cleanCode} from Cloud KV Store...`);

  try {
    const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_APP_KEY}/room_${cleanCode}`);
    if (res.ok) {
      const rawText = await res.text();
      console.log(`[RoomService] Cloud KV raw length for ${cleanCode}: ${rawText?.length || 0}`);
      const room = decodeRoomData(rawText);
      if (room && room.code) {
        console.log(`[RoomService] Cloud KV fetch success for ${cleanCode}:`, room.status);
        return room;
      }
    }
  } catch (err) {
    console.warn(`[RoomService] Cloud KV fetch failed for ${cleanCode}:`, err);
  }

  return null;
}

// Helper to safely call server API and check if response is JSON
async function safeFetchJson(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (!res.ok) {
          return { success: false, _httpError: true, status: res.status, ...data };
        }
        return data;
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// CREATE ROOM
export async function createRoom(params: {
  p1Name: string;
  p1Comp: any;
  format: 'T20' | 'ODI';
  pitch: string;
  playMode: 'ONLINE_ROOM';
}): Promise<{ success: boolean; code: string; playerId: 'p1'; room: RoomState }> {
  console.log('[RoomService] Creating room with params:', params);

  // 1. Try Express backend server first
  const serverRes = await safeFetchJson('/api/rooms/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (serverRes && serverRes.success && serverRes.code) {
    console.log('[RoomService] Server created room successfully code:', serverRes.code);
    broadcastRoom(serverRes.room);
    await syncRoomToCloud(serverRes.room);
    return serverRes;
  }

  console.warn('[RoomService] Server create failed or unreachable, creating fallback room locally');
  // 2. Fallback to LocalStorage + Cloud KV Store + BroadcastChannel client-side room
  const code = generateRoomCode();
  const room: RoomState = {
    code,
    status: 'SETUP',
    format: params.format || 'T20',
    pitch: params.pitch || 'BALANCED',
    playMode: 'ONLINE_ROOM',
    p1: {
      name: params.p1Name || 'Player 1 XI',
      squad: [],
      battingOrder: [],
      composition: params.p1Comp || { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
      isReady: true,
    },
    p2: {
      name: 'Waiting for Player 2...',
      squad: [],
      battingOrder: [],
      composition: { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
      isAi: false,
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
  broadcastRoom(room);
  await syncRoomToCloud(room);

  return { success: true, code, playerId: 'p1', room };
}

// JOIN ROOM
export async function joinRoom(params: {
  code: string;
  p2Name: string;
  p2Comp: any;
}): Promise<{ success: boolean; code: string; playerId: 'p2'; room: RoomState }> {
  const cleanCode = (params.code || '').trim().toUpperCase();
  console.log(`[RoomService] Joining room code: "${cleanCode}" for P2: "${params.p2Name}"`);

  // 1. Try Express backend server first
  const serverRes = await safeFetchJson('/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: cleanCode, p2Name: params.p2Name, p2Comp: params.p2Comp }),
  });

  if (serverRes) {
    if (serverRes.success && serverRes.room) {
      console.log(`[RoomService] Express backend joinRoom succeeded for ${cleanCode}`);
      broadcastRoom(serverRes.room);
      await syncRoomToCloud(serverRes.room);
      return serverRes;
    }
    console.warn(`[RoomService] Express backend joinRoom returned non-success:`, serverRes);
    // Only throw non-404 errors (like "Room is already full!")
    if (serverRes.error && serverRes.status !== 404 && !serverRes._httpError) {
      throw new Error(serverRes.error);
    }
  } else {
    console.warn(`[RoomService] Express backend joinRoom returned null/non-JSON response`);
  }

  // 2. Try getting room from LocalStorage or Cloud KV Store
  console.log(`[RoomService] Falling back to getRoom client-side for code: ${cleanCode}`);
  let room = await getRoom(cleanCode);
  if (!room) {
    console.error(`[RoomService] Room ${cleanCode} NOT FOUND anywhere!`);
    throw new Error('Room not found! Check the 6-digit code and try again.');
  }

  if (room.p2.isReady && !room.p2.isAi) {
    console.warn(`[RoomService] Room ${cleanCode} is already full!`);
    throw new Error('Room is already full!');
  }

  console.log(`[RoomService] Found room ${cleanCode} via fallback! Updating P2 state...`);
  room.p2.name = params.p2Name || 'Player 2 XI';
  if (params.p2Comp) room.p2.composition = params.p2Comp;
  room.p2.isReady = true;
  room.p2.isAi = false;
  room.status = 'DRAFT';
  room.turnStartTime = Date.now();
  room.lastUpdated = Date.now();

  broadcastRoom(room);
  await syncRoomToCloud(room);
  safeFetchJson(`/api/rooms/${cleanCode}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  }).catch(() => {});

  return { success: true, code: cleanCode, playerId: 'p2', room };
}

// GET ROOM
export async function getRoom(code: string): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  console.log(`[RoomService] getRoom requested for: "${cleanCode}"`);

  // 1. Try Express backend
  const serverRes = await safeFetchJson(`/api/rooms/${cleanCode}`);
  if (serverRes && serverRes.success && serverRes.room) {
    console.log(`[RoomService] Room ${cleanCode} retrieved from Express server`);
    return serverRes.room;
  }

  // 2. Try LocalStorage
  let localRoom: RoomState | null = null;
  const raw = localStorage.getItem(`cricket_room_${cleanCode}`);
  if (raw) {
    try {
      localRoom = JSON.parse(raw);
      console.log(`[RoomService] Room ${cleanCode} found in LocalStorage`);
    } catch {}
  }

  // 3. Try Cloud KV store for cross-device sync
  const cloudRoom = await fetchRoomFromCloud(cleanCode);

  if (cloudRoom && localRoom) {
    const newest = (cloudRoom.lastUpdated || 0) >= (localRoom.lastUpdated || 0) ? cloudRoom : localRoom;
    console.log(`[RoomService] Returning newest room for ${cleanCode} (cloud ts: ${cloudRoom.lastUpdated}, local ts: ${localRoom.lastUpdated})`);
    return newest;
  }

  if (cloudRoom) {
    console.log(`[RoomService] Room ${cleanCode} retrieved from Cloud KV Store`);
    localStorage.setItem(`cricket_room_${cleanCode}`, JSON.stringify(cloudRoom));
    return cloudRoom;
  }

  if (localRoom) {
    console.log(`[RoomService] Room ${cleanCode} retrieved from LocalStorage`);
    return localRoom;
  }

  console.warn(`[RoomService] Room ${cleanCode} not found in Express server, LocalStorage, or Cloud KV Store`);
  return null;
}

// DRAFT SELECT PLAYER
export async function draftSelectPlayer(code: string, playerId: 'p1' | 'p2', player: any): Promise<RoomState> {
  const serverRes = await safeFetchJson(`/api/rooms/${code}/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, player }),
  });

  if (serverRes && serverRes.success && serverRes.room) {
    broadcastRoom(serverRes.room);
    syncRoomToCloud(serverRes.room);
    return serverRes.room;
  }

  // Local fallback
  let room = await getRoom(code);
  if (!room) throw new Error('Room not found');

  if (room.globalDraftedCanonicalIds.includes(player.canonicalId)) {
    throw new Error(`${player.name} has already been drafted!`);
  }

  room.globalDraftedCanonicalIds.push(player.canonicalId);

  if (playerId === 'p1') {
    room.p1.squad.push(player);
    room.p1.battingOrder = optimizeBattingOrder(room.p1.squad);
  } else {
    room.p2.squad.push(player);
    room.p2.battingOrder = optimizeBattingOrder(room.p2.squad);
  }

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

    room.currentSquadIndex = drawUnusedSquadIndex(room.usedSquadIndices);
    room.turnStartTime = Date.now();
  }

  room.lastUpdated = Date.now();
  broadcastRoom(room);
  syncRoomToCloud(room);
  return room;
}

// UPDATE ROOM STATE
export async function updateRoomState(
  code: string,
  updateData: Partial<RoomState> & {
    p1BattingOrder?: any[];
    p2BattingOrder?: any[];
    p1Name?: string;
    p2Name?: string;
  }
): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  const serverRes = await safeFetchJson(`/api/rooms/${cleanCode}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  if (serverRes && serverRes.success && serverRes.room) {
    broadcastRoom(serverRes.room);
    syncRoomToCloud(serverRes.room);
    return serverRes.room;
  }

  let room = await getRoom(cleanCode);
  if (!room) return null;

  Object.assign(room, updateData);
  room.lastUpdated = Date.now();

  broadcastRoom(room);
  syncRoomToCloud(room);
  return room;
}
