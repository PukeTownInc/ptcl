import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYMBOLS = [
  { id: "puke", pays: [50,150,500], weight: 26 },
  { id: "sneeze", pays: [40,120,400], weight: 21 },
  { id: "cashlab", pays: [30,90,300], weight: 2.5 },
  { id: "toxiccloud", pays: [15,45,160], weight: 1.8 },
  { id: "wastepit", pays: [10,30,100], weight: 2.2 },
  { id: "beetle", pays: [8,24,75], weight: 3 },
  { id: "slime", pays: [2,4,11], weight: 24 },
  { id: "tp", pays: [3,6,16], weight: 18 },
  { id: "pill", pays: [3,7,19], weight: 15 },
  { id: "germ", pays: [3,8,23], weight: 13 },
  { id: "beaker", pays: [4,10,30], weight: 10 },
  { id: "vomit", pays: [5,12,37], weight: 8 },
  { id: "toxic", pays: [6,16,48], weight: 6 },
  { id: "barrel", pays: [7,20,64], weight: 4 },
  { id: "warn", pays: [12,35,130], weight: 2.5 },
  { id: "rich", pays: [18,55,220], weight: 1.5 },
  { id: "wild", pays: [0,0,0], weight: 3.5 },
  { id: "scatter", pays: [0,0,0], weight: 2 },
  { id: "bonus", pays: [0,0,0], weight: 1.5 },
  { id: "hazard", pays: [0,0,0], weight: 1.2 },
  { id: "jackpot", pays: [0,0,0], weight: 1 },
] as const;

type SymbolId = typeof SYMBOLS[number]["id"];
const REGULAR = SYMBOLS.slice(0, 16).map(s => s.id) as SymbolId[];
const ALL_WEIGHT = SYMBOLS.reduce((n, s) => n + s.weight, 0);
const PAYOUT_JACKPOTS = [
  { type: "mini", amount: 30, weight: 50 },
  { type: "minor", amount: 60, weight: 30 },
  { type: "major", amount: 120, weight: 15 },
  { type: "grand", amount: 300, weight: 5 },
] as const;

function randomUnit(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] / 4294967296;
}
function randomInt(min: number, max: number): number {
  return min + Math.floor(randomUnit() * (max - min + 1));
}
function weightedPick(): SymbolId {
  let n = randomUnit() * ALL_WEIGHT;
  for (const symbol of SYMBOLS) {
    n -= symbol.weight;
    if (n <= 0) return symbol.id;
  }
  return "puke";
}
function evaluateWays(grid: SymbolId[][]) {
  const wins: { symbols: SymbolId[]; pp: number; xp: number; count: number; positions: [number,number][] }[] = [];
  for (const id of REGULAR) {
    const positions: [number,number][] = [];
    let count = 0;
    for (let reel = 0; reel < 5; reel++) {
      const matched = grid[reel].some(s => s === id || s === "wild");
      if (!matched) break;
      count++;
      for (let row = 0; row < 3; row++) {
        if (grid[reel][row] === id || grid[reel][row] === "wild") positions.push([reel,row]);
      }
    }
    if (count >= 3) {
      const symbol = SYMBOLS.find(s => s.id === id)!;
      wins.push({ symbols:[id], pp:symbol.pays[Math.min(count-3,2)], xp:0, count, positions });
    }
  }
  return wins.filter(w => w.pp > 0);
}
function makeSpin(bet: number) {
  const grid: SymbolId[][] = Array.from({length:5}, () => Array.from({length:3}, () => weightedPick()));
  let wins = evaluateWays(grid);
  const scatterCount = grid.flat().filter(s => s === "scatter").length;
  let freeSpinsAwarded = scatterCount >= 5 ? 15 : scatterCount === 4 ? 10 : scatterCount === 3 ? 6 : 0;
  let bonusAwarded: number | null = null;
  let bonusIsMultiplier = false;
  const baseWins = wins.reduce((n,w) => n+w.pp,0);
  const bonusReels = grid.filter(col => col.includes("bonus")).length;
  if (bonusReels >= 3) {
    const roll = randomUnit();
    if (roll < 0.45) bonusAwarded = randomInt(10,40);
    else if (roll < 0.75) freeSpinsAwarded += randomInt(3,8);
    else {
      bonusAwarded = Math.round(baseWins * (1.5 + randomUnit()));
      bonusIsMultiplier = true;
    }
  }
  const hazardPositions: [number,number][] = [];
  for (let r=0;r<5;r++) for(let row=0;row<3;row++) if(grid[r][row]==="hazard") hazardPositions.push([r,row]);
  if (hazardPositions.length) {
    const reveal = REGULAR[randomInt(0,REGULAR.length-1)];
    for (const [r,row] of hazardPositions) grid[r][row] = reveal;
    wins = evaluateWays(grid);
  }
  let jackpot: {type:string;amount:number} | null = null;
  const jackpotCount = grid.flat().filter(s => s === "jackpot").length;
  if (jackpotCount >= 3) {
    let roll = randomUnit()*100;
    for (const jp of PAYOUT_JACKPOTS) {
      roll -= jp.weight;
      if (roll <= 0) { jackpot = {type:jp.type,amount:jp.amount}; break; }
    }
    jackpot ??= {type:"mini",amount:30};
  }
  const winsBase = wins.reduce((n,w)=>n+w.pp,0);
  const bonusBase = bonusAwarded === null ? 0 : (bonusIsMultiplier ? bonusAwarded * bet : bonusAwarded);
  const jackpotBase = jackpot?.amount ?? 0;
  const basePayoutPP = Math.floor(winsBase * bet + bonusBase + jackpotBase);
  return {
    grid, wins, totalPP: winsBase + (bonusAwarded ?? 0) + jackpotBase,
    xpGained:1, jackpot, freeSpinsAwarded, bonusAwarded, bonusIsMultiplier,
    scatterCount, potFull:false, basePayoutPP,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:corsHeaders});
  if (req.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405,headers:{...corsHeaders,"Content-Type":"application/json"}});
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({error:"Authentication required"}), {status:401,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anonKey, {global:{headers:{Authorization:authHeader}}});
    const token = authHeader.slice(7);
    const {data:{user},error:userError} = await authClient.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({error:"Invalid session"}), {status:401,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const body = await req.json();
    const bet = Number(body?.betPP);
    const requestId = String(body?.requestId ?? "");
    if (!Number.isInteger(bet) || bet < 1 || bet > 1000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return new Response(JSON.stringify({error:"Invalid bet or request id"}), {status:400,headers:{...corsHeaders,"Content-Type":"application/json"}});
    }
    const spin = makeSpin(bet);
    const history = {
      id: requestId, timestamp: Date.now(), kind:"spin",
      pp: spin.basePayoutPP, symbols:[...new Set(spin.wins.map(w=>w.symbols[0]))],
      multiplied:false, multiplier:null,
    };
    const admin = createClient(url, serviceKey, {auth:{autoRefreshToken:false,persistSession:false}});
    const {data,error} = await admin.rpc("settle_cash_lab_spin",{
      p_user_id:user.id,p_request_id:requestId,p_bet_pp:bet,
      p_base_payout_pp:spin.basePayoutPP,p_result:spin,p_history:history,
    });
    if (error) throw error;
    return new Response(JSON.stringify(data), {status:200,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("Insufficient") ? 409 : 400;
    return new Response(JSON.stringify({error:message}), {status,headers:{...corsHeaders,"Content-Type":"application/json"}});
  }
});
