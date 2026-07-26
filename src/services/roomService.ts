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
const CLOUD_APP_KEY = 'bz9gzwf9';

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

  // 1. Sync to backend Express server
  try {
    await safeFetchJson('/api/rooms/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
  } catch {}

  // 2. Direct client backup to Immanuel KeyValue Cloud Store with key bz9gzwf9 using chunking
  const hex = encodeRoomData(room);
  if (hex) {
    const chunkSize = 800;
    const numChunks = Math.ceil(hex.length / chunkSize);
    try {
      await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_APP_KEY}/room_${cleanCode}_meta?Value=${numChunks}`, { method: 'POST' });
      const chunkPromises = [];
      for (let i = 0; i < numChunks; i++) {
        const chunk = hex.substring(i * chunkSize, (i + 1) * chunkSize);
        chunkPromises.push(
          fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_APP_KEY}/room_${cleanCode}_${i}?Value=${chunk}`, { method: 'POST' })
        );
      }
      await Promise.all(chunkPromises);
    } catch {}
  }
}

async function fetchRoomFromCloud(code: string): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  // 1. Try backend server
  try {
    const serverRes = await safeFetchJson(`/api/rooms/${cleanCode}`);
    if (serverRes && serverRes.success && serverRes.room) {
      return serverRes.room;
    }
  } catch {}

  // 2. Direct chunked fetch from Immanuel KeyValue Cloud Store
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
        if (room && room.code) return room;
      }
    }
  } catch {}

  // 3. Fallback to single key
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
  // 1. Try Express backend server first
  const serverRes = await safeFetchJson('/api/rooms/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (serverRes && serverRes.success && serverRes.code && serverRes.room) {
    broadcastRoom(serverRes.room);
    return serverRes;
  }

  // 2. Fallback local room creation if server endpoint unreachable during dev rebuilds
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
  syncRoomToCloud(room); // Instantly persist to backend Express server

  return { success: true, code, playerId: 'p1', room };
}

// JOIN ROOM
export async function joinRoom(params: {
  code: string;
  p2Name: string;
  p2Comp: any;
}): Promise<{ success: boolean; code: string; playerId: 'p2'; room: RoomState }> {
  const cleanCode = (params.code || '').replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase();

  // 1. Try Express backend server first
  const serverRes = await safeFetchJson('/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: cleanCode, p2Name: params.p2Name, p2Comp: params.p2Comp }),
  });

  if (serverRes) {
    if (serverRes.success && serverRes.room) {
      broadcastRoom(serverRes.room);
      return serverRes;
    }
    // Handle error messages from backend
    if (serverRes.error && serverRes.status === 409) {
      throw new Error(serverRes.error || 'Room is already full!');
    }
  }

  // 2. Client-side fallback join
  let room = await getRoom(cleanCode);
  if (!room) {
    throw new Error(`Room code '${cleanCode}' not found. Please check the code or ask Host (P1) to click 'Host Online Room' to generate it.`);
  }

  if (room.p2.isReady && !room.p2.isAi) {
    throw new Error('Room is already full!');
  }

  room.p2.name = params.p2Name || 'Player 2 XI';
  if (params.p2Comp) room.p2.composition = params.p2Comp;
  room.p2.isReady = true;
  room.p2.isAi = false;
  room.status = 'DRAFT';
  room.turnStartTime = Date.now();
  room.lastUpdated = Date.now();

  broadcastRoom(room);
  syncRoomToCloud(room);

  return { success: true, code: cleanCode, playerId: 'p2', room };
}

// GET ROOM
export async function getRoom(code: string): Promise<RoomState | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  // 1. Try Express backend server
  const serverRes = await safeFetchJson(`/api/rooms/${cleanCode}`);
  if (serverRes && serverRes.success && serverRes.room) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cricket_room_${cleanCode}`, JSON.stringify(serverRes.room));
    }
    return serverRes.room;
  }

  // 2. Try Immanuel Cloud KV Store
  const cloudRoom = await fetchRoomFromCloud(cleanCode);

  // 3. Fallback to LocalStorage
  let localRoom: RoomState | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`cricket_room_${cleanCode}`);
    if (raw) {
      try {
        localRoom = JSON.parse(raw);
      } catch {}
    }
  }

  if (cloudRoom && localRoom) {
    const newest = (cloudRoom.lastUpdated || 0) >= (localRoom.lastUpdated || 0) ? cloudRoom : localRoom;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cricket_room_${cleanCode}`, JSON.stringify(newest));
    }
    return newest;
  }

  if (cloudRoom) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cricket_room_${cleanCode}`, JSON.stringify(cloudRoom));
    }
    return cloudRoom;
  }

  if (localRoom) {
    // Sync local room back to cloud and server
    syncRoomToCloud(localRoom);
    return localRoom;
  }

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
