import {
	Board,
	Coord,
	N,
	Preview,
	Step,
	Hand,
	Algorithm,
	AlgoConfig,
	DEFAULT_ALGO_CONFIG,
} from "../types";

/** ===== Basics / geometry ===== */
export const emptyBoard = (): Board =>
	Array.from({ length: N }, () => Array<0 | 1>(N).fill(0));

export function normalize(shape: Coord[]): Coord[] {
	const minX = Math.min(...shape.map(([x]) => x));
	const minY = Math.min(...shape.map(([, y]) => y));
	return shape.map(([x, y]) => [x - minX, y - minY]);
}
export function rotate90(shape: Coord[]): Coord[] {
	return normalize(shape.map(([x, y]) => [y, -x]));
}
export function mirrorX(shape: Coord[]): Coord[] {
	const minX = Math.min(...shape.map(([x]) => x));
	const maxX = Math.max(...shape.map(([x]) => x));
	return normalize(shape.map(([x, y]) => [minX + (maxX - x), y]));
}
export function canonicalKey(shape: Coord[]): string {
	const s = normalize(shape)
		.slice()
		.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	return JSON.stringify(s);
}
export function variants(shape: Coord[], includeMirror = true): Coord[][] {
	const seen = new Set<string>();
	const out: Coord[][] = [];
	const push = (cells: Coord[]) => {
		const k = canonicalKey(cells);
		if (!seen.has(k)) {
			seen.add(k);
			out.push(cells);
		}
	};
	let cur = normalize(shape);
	for (let i = 0; i < 4; i++) {
		push(cur);
		cur = rotate90(cur);
	}
	if (includeMirror) {
		cur = mirrorX(shape);
		for (let i = 0; i < 4; i++) {
			push(cur);
			cur = rotate90(cur);
		}
	}
	return out;
}

/** ===== Board ops ===== */
export function fits(
	board: Board,
	shape: Coord[],
	ox: number,
	oy: number,
): boolean {
	for (const [x, y] of shape) {
		const gx = ox + x,
			gy = oy + y;
		if (gx < 0 || gy < 0 || gx >= N || gy >= N) return false;
		if (board[gy][gx] === 1) return false;
	}
	return true;
}

export function place(
	board: Board,
	shape: Coord[],
	ox: number,
	oy: number,
): { board: Board; linesCleared: number } {
	const next: Board = board.map((r) => r.slice());
	for (const [x, y] of shape) next[oy + y][ox + x] = 1;

	const fullRows: number[] = [];
	const fullCols: number[] = [];
	for (let r = 0; r < N; r++)
		if (next[r].every((v) => v === 1)) fullRows.push(r);
	for (let c = 0; c < N; c++) {
		let ok = true;
		for (let r = 0; r < N; r++)
			if (next[r][c] !== 1) {
				ok = false;
				break;
			}
		if (ok) fullCols.push(c);
	}
	for (const r of fullRows) for (let c = 0; c < N; c++) next[r][c] = 0;
	for (const c of fullCols) for (let r = 0; r < N; r++) next[r][c] = 0;

	return { board: next, linesCleared: fullRows.length + fullCols.length };
}

export function allPlacements(board: Board, shape: Coord[]): Coord[] {
	const res: Coord[] = [];
	for (let oy = 0; oy < N; oy++)
		for (let ox = 0; ox < N; ox++)
			if (fits(board, shape, ox, oy)) res.push([ox, oy]);
	return res;
}

/** ===== Positional metrics =====
 * Goal: keep big contiguous open space, avoid holes, avoid fragmenting.
 */
function bfsComponent(board: Board, x0: number, y0: number, targetVal: 0 | 1) {
	const q: [number, number][] = [[x0, y0]];
	const seen = new Set<string>([`${x0},${y0}`]);
	const dirs = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	];
	while (q.length) {
		const [x, y] = q.pop()!;
		for (const [dx, dy] of dirs) {
			const nx = x + dx,
				ny = y + dy;
			if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
			if (board[ny][nx] !== targetVal) continue;
			const key = `${nx},${ny}`;
			if (seen.has(key)) continue;
			seen.add(key);
			q.push([nx, ny]);
		}
	}
	return seen;
}

function countFilledIslands(board: Board): number {
	let islands = 0;
	const visited = new Set<string>();
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			if (board[y][x] !== 1) continue;
			const k = `${x},${y}`;
			if (visited.has(k)) continue;
			const comp = bfsComponent(board, x, y, 1);
			comp.forEach((c) => visited.add(c));
			islands++;
		}
	return islands;
}

function emptySpacesStats(board: Board): { comps: number; maxSize: number } {
	let comps = 0,
		maxSize = 0;
	const visited = new Set<string>();
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			if (board[y][x] !== 0) continue;
			const k = `${x},${y}`;
			if (visited.has(k)) continue;
			const comp = bfsComponent(board, x, y, 0);
			comp.forEach((c) => visited.add(c));
			comps++;
			if (comp.size > maxSize) maxSize = comp.size;
		}
	return { comps, maxSize };
}

function countHoles(board: Board): number {
	let holes = 0;
	for (let y = 1; y < N - 1; y++)
		for (let x = 1; x < N - 1; x++) {
			if (
				board[y][x] === 0 &&
				board[y - 1][x] === 1 &&
				board[y + 1][x] === 1 &&
				board[y][x - 1] === 1 &&
				board[y][x + 1] === 1
			)
				holes++;
		}
	return holes;
}

/** Higher is better. Rewards large connected empty area, penalizes holes and fragmentation. */
export function positionalScore(board: Board): number {
	const { comps: emptyComps, maxSize: emptyMax } = emptySpacesStats(board);
	const filledIslands = countFilledIslands(board);
	const holes = countHoles(board);

	// Tuned to heavily punish holes, mildly punish fragmentation, and strongly reward one big open area
	return (
		1.25 * emptyMax - // bigger connected open space is better
		18 * emptyComps - // fewer separate empty pockets
		8 * filledIslands - // avoid scattering filled islands
		60 * holes // absolutely no single-cell gaps
	);
}

/** ===== DFS helpers ===== */
type DfsResult = { found: boolean; best: Preview };

function dfsAllHands(
	board: Board,
	hands: Hand[],
	orderIdx: number[],
	evalLeaf: (b: Board, steps: Step[], cleared: number) => number,
	cap: number,
): DfsResult {
	let nodes = 0;
	let foundAny = false;
	let best: Preview = { score: -Infinity, steps: [] };

	function dfs(cur: Board, remaining: number[], acc: Step[], cleared: number) {
		if (++nodes > cap) return;
		if (remaining.length === 0) {
			// Only accept leaves that placed ALL hands
			foundAny = true;
			const sc = evalLeaf(cur, acc, cleared);
			if (sc > best.score) best = { score: sc, steps: acc.slice() };
			return;
		}
		// Try each remaining hand; if none can be placed, this branch dies (no partials)
		let anyPlaced = false;
		for (let i = 0; i < remaining.length; i++) {
			const idx = remaining[i];
			const hand = hands[idx];
			const pos = allPlacements(cur, hand.shape);
			if (!pos.length) continue;
			anyPlaced = true;
			const nextRemain = remaining.filter((v) => v !== idx);
			for (const [ox, oy] of pos) {
				const { board: nb, linesCleared } = place(cur, hand.shape, ox, oy);
				acc.push({ hand, ox, oy, linesCleared });
				dfs(nb, nextRemain, acc, cleared + linesCleared);
				acc.pop();
				if (nodes > cap) return;
			}
		}
		// If nothing placeable at this depth -> dead end; do NOT score partials
		if (!anyPlaced) return;
	}

	dfs(board, orderIdx, [], 0);
	return { found: foundAny, best };
}

/** ===== 1) Max Clearance (DFS, cap) ===== */
export function findBestMaxClearance(
	board: Board,
	hands: Hand[],
	cfg: AlgoConfig = DEFAULT_ALGO_CONFIG,
): Preview {
	const idxs = hands.map((_, i) => i);
	const { found, best } = dfsAllHands(
		board,
		hands,
		idxs,
		(_b, steps, cleared) => cleared, // score = total lines cleared
		cfg.maxNodes,
	);
	return found ? best : { score: -Infinity, steps: [] };
}

/** ===== 2) Max Positional (DFS, cap) =====
 * Pure positional objective, still requires placing ALL hands.
 */
export function findBestMaxPositional(
	board: Board,
	hands: Hand[],
	cfg: AlgoConfig = DEFAULT_ALGO_CONFIG,
): Preview {
	const idxs = hands.map((_, i) => i);
	const { found, best } = dfsAllHands(
		board,
		hands,
		idxs,
		(b, _steps, _cleared) => positionalScore(b),
		cfg.maxNodes,
	);
	return found ? best : { score: -Infinity, steps: [] };
}

/** ===== 3) Hybrid (DFS, cap) =====
 * weighted clearance + positional
 */
export function findBestHybrid(
	board: Board,
	hands: Hand[],
	cfg: AlgoConfig = DEFAULT_ALGO_CONFIG,
): Preview {
	const wC = Math.max(0, cfg.hybridWeights.clearance);
	const wP = Math.max(0, cfg.hybridWeights.positional);
	const sum = wC + wP || 1;
	const wc = wC / sum,
		wp = wP / sum;

	const idxs = hands.map((_, i) => i);
	const { found, best } = dfsAllHands(
		board,
		hands,
		idxs,
		(b, steps, cleared) =>
			wc * cleared + wp * positionalScore(b) + 0.0005 * steps.length,
		cfg.maxNodes,
	);
	return found ? best : { score: -Infinity, steps: [] };
}

export function findBestByAlgorithm(
	board: Board,
	hands: Hand[],
	algo: Algorithm,
	cfg?: AlgoConfig,
): Preview {
	switch (algo) {
		case "max_clearance":
			return findBestMaxClearance(board, hands, cfg);
		case "max_positional":
			return findBestMaxPositional(board, hands, cfg);
		case "hybrid":
			return findBestHybrid(board, hands, cfg);
		default:
			return { score: -Infinity, steps: [] };
	}
}
