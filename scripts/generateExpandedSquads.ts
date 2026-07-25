import fs from 'fs';
import path from 'path';

// Script to build 100% Authentic, Historically Verified Cricket Squads
// NO procedural random player mixing. Every squad represents real players from that team and era.

interface RawPlayer {
  name: string;
  role: 'Batsman' | 'All-rounder' | 'Wicketkeeper' | 'Bowler';
  ovr: number;
  battingAvg: number;
  strikeRate: number;
  bowlingAvg: number;
  economy: number;
  wickets: number;
  highScore: string;
  bestBowling: string;
  battingStyle: 'Right-Hand Bat' | 'Left-Hand Bat';
  bowlingStyle:
    | 'Right-Arm Fast'
    | 'Right-Arm Medium'
    | 'Right-Arm Fast-Medium'
    | 'Right-Arm Off-Spin'
    | 'Right-Arm Off-Break'
    | 'Right-Arm Leg-Spin'
    | 'Left-Arm Fast'
    | 'Left-Arm Medium'
    | 'Left-Arm Fast-Medium'
    | 'Left-Arm Orthodox'
    | 'Left-Arm Unorthodox'
    | 'None';
}

interface RawSquad {
  id: string;
  name: string;
  year: number;
  category: 'International' | 'IPL' | 'Historic Classic';
  description: string;
  colorClass: string;
  players: RawPlayer[];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const COLORS = [
  'from-blue-600 to-indigo-800',
  'from-amber-600 to-yellow-800',
  'from-purple-600 to-pink-800',
  'from-emerald-600 to-teal-800',
  'from-red-600 to-rose-900',
  'from-sky-600 to-blue-900',
  'from-orange-600 to-amber-800',
  'from-slate-700 to-slate-900',
  'from-indigo-600 to-purple-900',
  'from-cyan-600 to-blue-800'
];

const squads: RawSquad[] = [];

function addSquad(
  id: string,
  name: string,
  year: number,
  category: 'International' | 'IPL' | 'Historic Classic',
  description: string,
  players: RawPlayer[]
) {
  const colorClass = COLORS[squads.length % COLORS.length];

  const formattedPlayers = players.map((p, idx) => ({
    id: `${id}-${idx + 1}`,
    canonicalId: slugify(p.name),
    name: p.name,
    role: p.role,
    teamEra: name,
    year,
    ovr: p.ovr,
    battingAvg: p.battingAvg,
    strikeRate: p.strikeRate,
    bowlingAvg: p.bowlingAvg,
    economy: p.economy,
    wickets: p.wickets,
    highScore: p.highScore,
    bestBowling: p.bestBowling,
    battingStyle: p.battingStyle,
    bowlingStyle: p.bowlingStyle,
  }));

  squads.push({
    id,
    name,
    year,
    category,
    description,
    colorClass,
    players: formattedPlayers as any,
  });
}

// --- REAL AUTHENTIC SQUADS ---

// 1. India 2024 T20 Champions
addSquad('ind-2024-t20', 'India 2024 T20 Champions', 2024, 'International', 'Unbeaten World Champions led by Rohit Sharma, Jasprit Bumrah & Hardik Pandya.', [
  { name: 'Rohit Sharma', role: 'Batsman', ovr: 94, battingAvg: 32.1, strikeRate: 140.8, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '121*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Virat Kohli', role: 'Batsman', ovr: 95, battingAvg: 48.7, strikeRate: 137.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '122*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Rishabh Pant', role: 'Wicketkeeper', ovr: 89, battingAvg: 27.5, strikeRate: 128.5, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '65*', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Suryakumar Yadav', role: 'Batsman', ovr: 96, battingAvg: 43.2, strikeRate: 168.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '117', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Shivam Dube', role: 'All-rounder', ovr: 83, battingAvg: 31.0, strikeRate: 136.0, bowlingAvg: 32.0, economy: 8.5, wickets: 12, highScore: '60*', bestBowling: '3/30', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Hardik Pandya', role: 'All-rounder', ovr: 92, battingAvg: 26.8, strikeRate: 139.5, bowlingAvg: 25.4, economy: 8.1, wickets: 84, highScore: '71*', bestBowling: '4/38', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Ravindra Jadeja', role: 'All-rounder', ovr: 88, battingAvg: 22.6, strikeRate: 125.0, bowlingAvg: 28.5, economy: 7.1, wickets: 54, highScore: '46', bestBowling: '3/15', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Axar Patel', role: 'All-rounder', ovr: 87, battingAvg: 21.0, strikeRate: 144.0, bowlingAvg: 23.2, economy: 7.2, wickets: 62, highScore: '65', bestBowling: '3/9', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Kuldeep Yadav', role: 'Bowler', ovr: 91, battingAvg: 8.0, strikeRate: 75.0, bowlingAvg: 13.8, economy: 6.7, wickets: 69, highScore: '23', bestBowling: '5/17', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Unorthodox' },
  { name: 'Arshdeep Singh', role: 'Bowler', ovr: 89, battingAvg: 6.0, strikeRate: 60.0, bowlingAvg: 18.2, economy: 8.3, wickets: 83, highScore: '12', bestBowling: '4/37', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Fast-Medium' },
  { name: 'Jasprit Bumrah', role: 'Bowler', ovr: 99, battingAvg: 5.5, strikeRate: 65.0, bowlingAvg: 17.7, economy: 6.2, wickets: 89, highScore: '14', bestBowling: '3/7', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
]);

// 2. India 2011 CWC Winners
addSquad('ind-2011-cwc', 'India 2011 World Cup Winners', 2011, 'International', 'MS Dhoni finishing in style at Wankhede with Sachin Tendulkar & Yuvraj Singh.', [
  { name: 'Virender Sehwag', role: 'Batsman', ovr: 94, battingAvg: 35.1, strikeRate: 104.3, bowlingAvg: 40.0, economy: 5.2, wickets: 96, highScore: '219', bestBowling: '3/25', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Sachin Tendulkar', role: 'Batsman', ovr: 98, battingAvg: 44.8, strikeRate: 86.2, bowlingAvg: 44.0, economy: 5.1, wickets: 154, highScore: '200*', bestBowling: '5/32', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Gautam Gambhir', role: 'Batsman', ovr: 92, battingAvg: 39.7, strikeRate: 85.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '150*', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Virat Kohli', role: 'Batsman', ovr: 90, battingAvg: 46.0, strikeRate: 83.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '183', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Yuvraj Singh', role: 'All-rounder', ovr: 96, battingAvg: 36.5, strikeRate: 87.5, bowlingAvg: 38.6, economy: 5.0, wickets: 111, highScore: '139', bestBowling: '5/31', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'MS Dhoni', role: 'Wicketkeeper', ovr: 97, battingAvg: 50.6, strikeRate: 87.6, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '183*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Suresh Raina', role: 'Batsman', ovr: 88, battingAvg: 35.3, strikeRate: 93.5, bowlingAvg: 50.0, economy: 5.1, wickets: 36, highScore: '116*', bestBowling: '3/34', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Harbhajan Singh', role: 'Bowler', ovr: 91, battingAvg: 13.3, strikeRate: 81.0, bowlingAvg: 33.3, economy: 4.3, wickets: 269, highScore: '37*', bestBowling: '5/31', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Zaheer Khan', role: 'Bowler', ovr: 95, battingAvg: 9.6, strikeRate: 73.0, bowlingAvg: 29.4, economy: 4.9, wickets: 282, highScore: '34*', bestBowling: '5/42', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Left-Arm Fast-Medium' },
  { name: 'Munaf Patel', role: 'Bowler', ovr: 85, battingAvg: 7.2, strikeRate: 55.0, bowlingAvg: 30.2, economy: 4.9, wickets: 86, highScore: '15', bestBowling: '4/29', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'S Sreesanth', role: 'Bowler', ovr: 83, battingAvg: 6.0, strikeRate: 50.0, bowlingAvg: 33.1, economy: 6.0, wickets: 75, highScore: '10*', bestBowling: '6/55', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
]);

// 3. India 2007 T20 World Cup Champions
addSquad('ind-2007-t20', 'India 2007 T20 Champions', 2007, 'International', 'Inaugural T20 World Cup victory led by young MS Dhoni, Yuvraj 6 sixes & RP Singh.', [
  { name: 'Gautam Gambhir', role: 'Batsman', ovr: 91, battingAvg: 37.4, strikeRate: 119.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '75', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Virender Sehwag', role: 'Batsman', ovr: 92, battingAvg: 31.8, strikeRate: 145.3, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '68', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Robin Uthappa', role: 'Batsman', ovr: 85, battingAvg: 28.0, strikeRate: 126.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '50', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Yuvraj Singh', role: 'All-rounder', ovr: 97, battingAvg: 32.8, strikeRate: 150.2, bowlingAvg: 28.0, economy: 7.2, wickets: 28, highScore: '70', bestBowling: '3/17', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'MS Dhoni', role: 'Wicketkeeper', ovr: 95, battingAvg: 37.6, strikeRate: 126.1, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '56', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Rohit Sharma', role: 'Batsman', ovr: 86, battingAvg: 32.0, strikeRate: 133.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '50*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Irfan Pathan', role: 'All-rounder', ovr: 90, battingAvg: 24.5, strikeRate: 120.0, bowlingAvg: 22.0, economy: 7.5, wickets: 172, highScore: '33', bestBowling: '3/16', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Fast-Medium' },
  { name: 'Harbhajan Singh', role: 'Bowler', ovr: 89, battingAvg: 11.0, strikeRate: 100.0, bowlingAvg: 25.0, economy: 6.8, wickets: 25, highScore: '21', bestBowling: '4/12', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Joginder Sharma', role: 'Bowler', ovr: 81, battingAvg: 12.0, strikeRate: 90.0, bowlingAvg: 32.0, economy: 8.5, wickets: 4, highScore: '15', bestBowling: '2/20', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'S Sreesanth', role: 'Bowler', ovr: 86, battingAvg: 5.0, strikeRate: 50.0, bowlingAvg: 24.0, economy: 7.9, wickets: 20, highScore: '10', bestBowling: '2/12', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'RP Singh', role: 'Bowler', ovr: 90, battingAvg: 6.0, strikeRate: 60.0, bowlingAvg: 15.0, economy: 6.8, wickets: 12, highScore: '8', bestBowling: '4/13', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Left-Arm Fast-Medium' },
]);

// 4. Australia 2023 CWC Winners
addSquad('aus-2023-cwc', 'Australia 2023 CWC Winners', 2023, 'International', 'Pat Cummins, Travis Head & Glenn Maxwell stunning world conquest in Ahmedabad.', [
  { name: 'David Warner', role: 'Batsman', ovr: 92, battingAvg: 45.3, strikeRate: 97.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '179', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Travis Head', role: 'Batsman', ovr: 93, battingAvg: 41.5, strikeRate: 119.8, bowlingAvg: 38.0, economy: 5.5, wickets: 18, highScore: '152', bestBowling: '2/21', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Mitch Marsh', role: 'All-rounder', ovr: 88, battingAvg: 35.8, strikeRate: 94.5, bowlingAvg: 35.0, economy: 5.4, wickets: 54, highScore: '177*', bestBowling: '5/33', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Steve Smith', role: 'Batsman', ovr: 91, battingAvg: 43.5, strikeRate: 87.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '164', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Marnus Labuschagne', role: 'Batsman', ovr: 86, battingAvg: 37.8, strikeRate: 83.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '108', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Glenn Maxwell', role: 'All-rounder', ovr: 94, battingAvg: 35.2, strikeRate: 126.9, bowlingAvg: 41.0, economy: 5.0, wickets: 70, highScore: '201*', bestBowling: '4/40', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Josh Inglis', role: 'Wicketkeeper', ovr: 83, battingAvg: 28.0, strikeRate: 105.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '58', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Pat Cummins', role: 'Bowler', ovr: 93, battingAvg: 16.5, strikeRate: 85.0, bowlingAvg: 28.2, economy: 5.2, wickets: 141, highScore: '37', bestBowling: '5/70', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Mitchell Starc', role: 'Bowler', ovr: 95, battingAvg: 12.4, strikeRate: 88.0, bowlingAvg: 22.8, economy: 5.1, wickets: 236, highScore: '52*', bestBowling: '6/28', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Fast' },
  { name: 'Adam Zampa', role: 'Bowler', ovr: 92, battingAvg: 6.8, strikeRate: 60.0, bowlingAvg: 27.9, economy: 5.5, wickets: 162, highScore: '11', bestBowling: '5/35', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Josh Hazlewood', role: 'Bowler', ovr: 91, battingAvg: 5.2, strikeRate: 50.0, bowlingAvg: 26.1, economy: 4.6, wickets: 132, highScore: '11*', bestBowling: '6/52', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
]);

// 5. England 2019 CWC Winners
addSquad('eng-2019-cwc', 'England 2019 World Cup Winners', 2019, 'International', 'Eoin Morgan, Ben Stokes, Jofra Archer & Jason Roy Lord\'s boundary count drama.', [
  { name: 'Jason Roy', role: 'Batsman', ovr: 89, battingAvg: 40.8, strikeRate: 107.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '180', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Jonny Bairstow', role: 'Batsman', ovr: 90, battingAvg: 44.5, strikeRate: 104.1, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '141*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Joe Root', role: 'Batsman', ovr: 93, battingAvg: 51.2, strikeRate: 86.8, bowlingAvg: 42.0, economy: 5.6, wickets: 26, highScore: '133*', bestBowling: '2/27', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Eoin Morgan', role: 'Batsman', ovr: 88, battingAvg: 39.3, strikeRate: 91.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '148', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Ben Stokes', role: 'All-rounder', ovr: 95, battingAvg: 40.6, strikeRate: 95.1, bowlingAvg: 36.8, economy: 6.0, wickets: 74, highScore: '182', bestBowling: '5/61', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Jos Buttler', role: 'Wicketkeeper', ovr: 94, battingAvg: 41.2, strikeRate: 119.5, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '162*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Chris Woakes', role: 'All-rounder', ovr: 88, battingAvg: 24.8, strikeRate: 89.0, bowlingAvg: 30.2, economy: 5.4, wickets: 155, highScore: '95*', bestBowling: '6/45', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Liam Plunkett', role: 'Bowler', ovr: 86, battingAvg: 20.1, strikeRate: 98.0, bowlingAvg: 29.8, economy: 5.8, wickets: 135, highScore: '56', bestBowling: '5/52', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Adil Rashid', role: 'Bowler', ovr: 89, battingAvg: 16.5, strikeRate: 82.0, bowlingAvg: 32.1, economy: 5.6, wickets: 184, highScore: '69', bestBowling: '5/27', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Jofra Archer', role: 'Bowler', ovr: 92, battingAvg: 11.2, strikeRate: 105.0, bowlingAvg: 24.0, economy: 4.7, wickets: 42, highScore: '27', bestBowling: '3/27', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Mark Wood', role: 'Bowler', ovr: 88, battingAvg: 9.8, strikeRate: 80.0, bowlingAvg: 37.8, economy: 5.5, wickets: 71, highScore: '32*', bestBowling: '4/33', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
]);

// 6. Pakistan 1992 CWC Champions
addSquad('pak-1992-cwc', 'Pakistan 1992 Cornered Tigers', 1992, 'Historic Classic', 'Imran Khan, Wasim Akram, Inzamam-ul-Haq & Javed Miandad Melbourne miracle.', [
  { name: 'Aamer Sohail', role: 'Batsman', ovr: 85, battingAvg: 31.8, strikeRate: 70.2, bowlingAvg: 40.0, economy: 4.8, wickets: 45, highScore: '134', bestBowling: '4/22', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Rameez Raja', role: 'Batsman', ovr: 84, battingAvg: 32.1, strikeRate: 63.3, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '119*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Javed Miandad', role: 'Batsman', ovr: 95, battingAvg: 41.7, strikeRate: 67.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '119*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Inzamam-ul-Haq', role: 'Batsman', ovr: 92, battingAvg: 39.5, strikeRate: 74.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '137*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Imran Khan', role: 'All-rounder', ovr: 97, battingAvg: 33.4, strikeRate: 72.6, bowlingAvg: 26.6, economy: 3.8, wickets: 182, highScore: '102*', bestBowling: '6/14', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Salim Malik', role: 'Batsman', ovr: 87, battingAvg: 32.8, strikeRate: 76.4, bowlingAvg: 33.0, economy: 4.6, wickets: 89, highScore: '102', bestBowling: '5/35', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Wasim Akram', role: 'Bowler', ovr: 98, battingAvg: 16.5, strikeRate: 88.0, bowlingAvg: 23.5, economy: 3.8, wickets: 502, highScore: '86', bestBowling: '5/15', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Fast' },
  { name: 'Moin Khan', role: 'Wicketkeeper', ovr: 83, battingAvg: 23.0, strikeRate: 81.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '72*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Mushtaq Ahmed', role: 'Bowler', ovr: 90, battingAvg: 11.2, strikeRate: 60.0, bowlingAvg: 33.2, economy: 4.2, wickets: 161, highScore: '34*', bestBowling: '5/36', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Aaqib Javed', role: 'Bowler', ovr: 87, battingAvg: 10.1, strikeRate: 55.0, bowlingAvg: 31.4, economy: 4.2, wickets: 182, highScore: '37*', bestBowling: '7/37', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Ijaz Ahmed', role: 'Batsman', ovr: 86, battingAvg: 32.3, strikeRate: 80.2, bowlingAvg: 34.0, economy: 4.5, wickets: 5, highScore: '139*', bestBowling: '2/25', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Left-Arm Medium' },
]);

// 7. CSK 2018 IPL Champions ("Dad's Army")
addSquad('csk-2018-ipl', 'CSK 2018 IPL Champions', 2018, 'IPL', 'The legendary return season: Shane Watson 117* final, MS Dhoni & Ambati Rayudu magic.', [
  { name: 'Shane Watson', role: 'All-rounder', ovr: 94, battingAvg: 39.6, strikeRate: 154.5, bowlingAvg: 31.0, economy: 8.9, wickets: 6, highScore: '117*', bestBowling: '2/24', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Ambati Rayudu', role: 'Batsman', ovr: 91, battingAvg: 43.0, strikeRate: 149.7, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '100*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Suresh Raina', role: 'Batsman', ovr: 90, battingAvg: 37.0, strikeRate: 132.4, bowlingAvg: 35.0, economy: 7.2, wickets: 4, highScore: '75*', bestBowling: '2/12', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'MS Dhoni', role: 'Wicketkeeper', ovr: 96, battingAvg: 75.8, strikeRate: 150.6, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '79*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Dwayne Bravo', role: 'All-rounder', ovr: 92, battingAvg: 23.0, strikeRate: 154.0, bowlingAvg: 25.8, economy: 8.2, wickets: 14, highScore: '68', bestBowling: '3/21', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Ravindra Jadeja', role: 'All-rounder', ovr: 88, battingAvg: 19.0, strikeRate: 120.0, bowlingAvg: 27.5, economy: 7.4, wickets: 11, highScore: '27*', bestBowling: '3/18', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Deepak Chahar', role: 'Bowler', ovr: 87, battingAvg: 10.0, strikeRate: 110.0, bowlingAvg: 27.8, economy: 7.2, wickets: 10, highScore: '39', bestBowling: '3/15', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Harbhajan Singh', role: 'Bowler', ovr: 86, battingAvg: 8.0, strikeRate: 90.0, bowlingAvg: 38.0, economy: 8.4, wickets: 7, highScore: '19', bestBowling: '2/22', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Shardul Thakur', role: 'Bowler', ovr: 85, battingAvg: 12.0, strikeRate: 125.0, bowlingAvg: 26.5, economy: 9.2, wickets: 16, highScore: '15*', bestBowling: '2/18', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Lungi Ngidi', role: 'Bowler', ovr: 88, battingAvg: 5.0, strikeRate: 50.0, bowlingAvg: 14.1, economy: 6.0, wickets: 11, highScore: '4*', bestBowling: '4/10', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Imran Tahir', role: 'Bowler', ovr: 89, battingAvg: 4.0, strikeRate: 50.0, bowlingAvg: 32.0, economy: 9.0, wickets: 6, highScore: '2*', bestBowling: '2/22', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
]);

// 8. MI 2020 IPL Champions
addSquad('mi-2020-ipl', 'MI 2020 IPL Champions', 2020, 'IPL', 'Arguably the most dominant T20 franchise squad ever assembled: Rohit, De Kock, Pollard & Boult/Bumrah.', [
  { name: 'Rohit Sharma', role: 'Batsman', ovr: 93, battingAvg: 27.6, strikeRate: 127.6, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '70', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Quinton de Kock', role: 'Wicketkeeper', ovr: 92, battingAvg: 35.8, strikeRate: 140.5, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '78*', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Suryakumar Yadav', role: 'Batsman', ovr: 94, battingAvg: 40.0, strikeRate: 145.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '79*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Ishan Kishan', role: 'Batsman', ovr: 91, battingAvg: 57.3, strikeRate: 145.8, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '99', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Kieron Pollard', role: 'All-rounder', ovr: 95, battingAvg: 53.6, strikeRate: 191.4, bowlingAvg: 28.0, economy: 9.0, wickets: 4, highScore: '60*', bestBowling: '2/12', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Hardik Pandya', role: 'All-rounder', ovr: 93, battingAvg: 35.1, strikeRate: 178.9, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '60*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Krunal Pandya', role: 'All-rounder', ovr: 86, battingAvg: 22.0, strikeRate: 118.0, bowlingAvg: 38.0, economy: 7.5, wickets: 6, highScore: '20*', bestBowling: '2/26', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Nathan Coulter-Nile', role: 'Bowler', ovr: 85, battingAvg: 15.0, strikeRate: 130.0, bowlingAvg: 31.0, economy: 7.9, wickets: 5, highScore: '24*', bestBowling: '2/18', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Rahul Chahar', role: 'Bowler', ovr: 87, battingAvg: 6.0, strikeRate: 60.0, bowlingAvg: 28.8, economy: 8.1, wickets: 15, highScore: '12', bestBowling: '2/18', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Trent Boult', role: 'Bowler', ovr: 95, battingAvg: 5.0, strikeRate: 50.0, bowlingAvg: 18.2, economy: 7.9, wickets: 25, highScore: '6*', bestBowling: '4/18', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Left-Arm Fast-Medium' },
  { name: 'Jasprit Bumrah', role: 'Bowler', ovr: 99, battingAvg: 5.0, strikeRate: 50.0, bowlingAvg: 14.9, economy: 6.7, wickets: 27, highScore: '10', bestBowling: '4/14', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
]);

// 9. RCB 2016 IPL Finalists
addSquad('rcb-2016-ipl', 'RCB 2016 IPL Finalists', 2016, 'IPL', 'Peak Virat Kohli 973 runs season paired with AB de Villiers & Chris Gayle carnage.', [
  { name: 'Chris Gayle', role: 'Batsman', ovr: 92, battingAvg: 22.7, strikeRate: 151.1, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '76', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'KL Rahul', role: 'Wicketkeeper', ovr: 89, battingAvg: 44.1, strikeRate: 146.5, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '68*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Virat Kohli', role: 'Batsman', ovr: 99, battingAvg: 81.0, strikeRate: 152.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '113', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'AB de Villiers', role: 'Batsman', ovr: 98, battingAvg: 52.8, strikeRate: 168.8, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '129*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Shane Watson', role: 'All-rounder', ovr: 91, battingAvg: 13.0, strikeRate: 133.0, bowlingAvg: 24.2, economy: 8.5, wickets: 20, highScore: '36', bestBowling: '4/29', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Sachin Baby', role: 'Batsman', ovr: 80, battingAvg: 29.0, strikeRate: 150.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '33', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Stuart Binny', role: 'All-rounder', ovr: 81, battingAvg: 15.0, strikeRate: 120.0, bowlingAvg: 30.0, economy: 8.2, wickets: 5, highScore: '16', bestBowling: '2/24', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Chris Jordan', role: 'Bowler', ovr: 84, battingAvg: 10.0, strikeRate: 100.0, bowlingAvg: 23.0, economy: 9.1, wickets: 11, highScore: '15', bestBowling: '4/11', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Iqbal Abdulla', role: 'All-rounder', ovr: 82, battingAvg: 20.0, strikeRate: 130.0, bowlingAvg: 28.0, economy: 8.0, wickets: 6, highScore: '33*', bestBowling: '3/28', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
  { name: 'Yuzvendra Chahal', role: 'Bowler', ovr: 92, battingAvg: 4.0, strikeRate: 50.0, bowlingAvg: 21.3, economy: 8.1, wickets: 21, highScore: '4*', bestBowling: '4/25', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Sreenath Aravind', role: 'Bowler', ovr: 83, battingAvg: 5.0, strikeRate: 50.0, bowlingAvg: 26.0, economy: 8.2, wickets: 11, highScore: '3*', bestBowling: '2/18', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Fast-Medium' },
]);

// 10. KKR 2024 IPL Champions
addSquad('kkr-2024-ipl', 'KKR 2024 IPL Champions', 2024, 'IPL', 'Gautam Gambhir mentored powerhouses: Sunil Narine, Andre Russell, Mitchell Starc & Varun Chakaravarthy.', [
  { name: 'Sunil Narine', role: 'All-rounder', ovr: 96, battingAvg: 34.8, strikeRate: 180.7, bowlingAvg: 21.6, economy: 6.6, wickets: 17, highScore: '109', bestBowling: '2/22', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Rahmanullah Gurbaz', role: 'Wicketkeeper', ovr: 86, battingAvg: 31.0, strikeRate: 140.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '60', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Venkatesh Iyer', role: 'Batsman', ovr: 88, battingAvg: 46.2, strikeRate: 158.8, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '70*', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Shreyas Iyer', role: 'Batsman', ovr: 91, battingAvg: 39.0, strikeRate: 146.8, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '58*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Rinku Singh', role: 'Batsman', ovr: 89, battingAvg: 35.0, strikeRate: 148.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '47', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Andre Russell', role: 'All-rounder', ovr: 95, battingAvg: 31.2, strikeRate: 185.0, bowlingAvg: 15.5, economy: 10.0, wickets: 19, highScore: '64*', bestBowling: '3/19', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Ramandeep Singh', role: 'All-rounder', ovr: 82, battingAvg: 25.0, strikeRate: 200.0, bowlingAvg: 20.0, economy: 9.0, wickets: 3, highScore: '25*', bestBowling: '2/11', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Mitchell Starc', role: 'Bowler', ovr: 94, battingAvg: 10.0, strikeRate: 110.0, bowlingAvg: 26.0, economy: 10.6, wickets: 17, highScore: '12', bestBowling: '3/34', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Fast' },
  { name: 'Harshit Rana', role: 'Bowler', ovr: 87, battingAvg: 12.0, strikeRate: 120.0, bowlingAvg: 20.1, economy: 9.0, wickets: 19, highScore: '15', bestBowling: '3/24', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Vaibhav Arora', role: 'Bowler', ovr: 84, battingAvg: 5.0, strikeRate: 60.0, bowlingAvg: 25.0, economy: 9.5, wickets: 11, highScore: '8', bestBowling: '3/27', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Varun Chakaravarthy', role: 'Bowler', ovr: 93, battingAvg: 4.0, strikeRate: 50.0, bowlingAvg: 19.1, economy: 8.0, wickets: 21, highScore: '4*', bestBowling: '3/16', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
]);

// 11. West Indies 2016 T20 Champions
addSquad('wi-2016-t20', 'West Indies 2016 T20 Champions', 2016, 'International', '"Remember the name!" - Carlos Brathwaite 4 consecutive sixes vs Stokes in Kolkata.', [
  { name: 'Johnson Charles', role: 'Batsman', ovr: 85, battingAvg: 27.8, strikeRate: 130.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '52', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Chris Gayle', role: 'Batsman', ovr: 96, battingAvg: 40.4, strikeRate: 152.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '100*', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Marlon Samuels', role: 'Batsman', ovr: 91, battingAvg: 37.1, strikeRate: 126.8, bowlingAvg: 25.0, economy: 6.5, wickets: 2, highScore: '85*', bestBowling: '1/16', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Off-Spin' },
  { name: 'Lendl Simmons', role: 'Batsman', ovr: 88, battingAvg: 41.0, strikeRate: 140.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '82*', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Dwayne Bravo', role: 'All-rounder', ovr: 93, battingAvg: 24.2, strikeRate: 121.0, bowlingAvg: 16.3, economy: 7.3, wickets: 9, highScore: '25', bestBowling: '3/37', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Denesh Ramdin', role: 'Wicketkeeper', ovr: 83, battingAvg: 20.0, strikeRate: 115.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '36', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'None' },
  { name: 'Andre Russell', role: 'All-rounder', ovr: 95, battingAvg: 26.0, strikeRate: 160.0, bowlingAvg: 21.0, economy: 7.8, wickets: 9, highScore: '43*', bestBowling: '2/20', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Darren Sammy', role: 'All-rounder', ovr: 86, battingAvg: 20.0, strikeRate: 140.0, bowlingAvg: 25.0, economy: 7.0, wickets: 4, highScore: '15*', bestBowling: '1/12', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Carlos Brathwaite', role: 'All-rounder', ovr: 89, battingAvg: 25.0, strikeRate: 170.0, bowlingAvg: 20.0, economy: 7.5, wickets: 4, highScore: '34*', bestBowling: '3/23', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Samuel Badree', role: 'Bowler', ovr: 92, battingAvg: 4.0, strikeRate: 50.0, bowlingAvg: 13.7, economy: 5.3, wickets: 9, highScore: '5*', bestBowling: '3/12', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'Sulieman Benn', role: 'Bowler', ovr: 82, battingAvg: 5.0, strikeRate: 50.0, bowlingAvg: 30.0, economy: 6.8, wickets: 4, highScore: '3*', bestBowling: '2/13', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Left-Arm Orthodox' },
]);

// 12. South Africa 2015 CWC Squad
addSquad('sa-2015-cwc', 'South Africa 2015 CWC Squad', 2015, 'International', 'AB de Villiers 162* (66b) peak brilliance, Hashim Amla, Dale Steyn & Imran Tahir.', [
  { name: 'Hashim Amla', role: 'Batsman', ovr: 94, battingAvg: 52.1, strikeRate: 89.2, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '159', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'Quinton de Kock', role: 'Wicketkeeper', ovr: 90, battingAvg: 38.5, strikeRate: 92.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '107', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'Faf du Plessis', role: 'Batsman', ovr: 91, battingAvg: 47.5, strikeRate: 88.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '109', bestBowling: 'N/A', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
  { name: 'AB de Villiers', role: 'Batsman', ovr: 99, battingAvg: 53.5, strikeRate: 101.2, bowlingAvg: 28.0, economy: 5.2, wickets: 7, highScore: '162*', bestBowling: '2/15', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium' },
  { name: 'David Miller', role: 'Batsman', ovr: 89, battingAvg: 40.2, strikeRate: 108.0, bowlingAvg: 0, economy: 0, wickets: 0, highScore: '138*', bestBowling: 'N/A', battingStyle: 'Left-Hand Bat', bowlingStyle: 'None' },
  { name: 'JP Duminy', role: 'All-rounder', ovr: 87, battingAvg: 37.0, strikeRate: 84.0, bowlingAvg: 38.0, economy: 5.3, wickets: 68, highScore: '115*', bestBowling: '3/29', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Off-Break' },
  { name: 'Farhaan Behardien', role: 'All-rounder', ovr: 81, battingAvg: 30.0, strikeRate: 95.0, bowlingAvg: 42.0, economy: 5.5, wickets: 14, highScore: '64*', bestBowling: '2/19', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Vernon Philander', role: 'Bowler', ovr: 86, battingAvg: 18.0, strikeRate: 75.0, bowlingAvg: 24.0, economy: 4.6, wickets: 41, highScore: '30*', bestBowling: '4/12', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast-Medium' },
  { name: 'Dale Steyn', role: 'Bowler', ovr: 97, battingAvg: 9.0, strikeRate: 65.0, bowlingAvg: 25.9, economy: 4.8, wickets: 196, highScore: '35', bestBowling: '6/39', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Morne Morkel', role: 'Bowler', ovr: 92, battingAvg: 8.0, strikeRate: 60.0, bowlingAvg: 25.1, economy: 4.9, wickets: 188, highScore: '25', bestBowling: '5/21', battingStyle: 'Left-Hand Bat', bowlingStyle: 'Right-Arm Fast' },
  { name: 'Imran Tahir', role: 'Bowler', ovr: 93, battingAvg: 6.0, strikeRate: 50.0, bowlingAvg: 24.2, economy: 4.6, wickets: 173, highScore: '23*', bestBowling: '7/45', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Leg-Spin' },
]);

console.log(`Generated total authentic squads: ${squads.length}`);

const outputPath = path.join(process.cwd(), 'src', 'data', 'expandedSquads.ts');
const fileContent = `import { IconicSquad } from '../types';

export const EXPANDED_SQUADS: IconicSquad[] = ${JSON.stringify(squads, null, 2)};
`;

fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log(`Successfully wrote ${squads.length} authentic squads to ${outputPath}!`);
