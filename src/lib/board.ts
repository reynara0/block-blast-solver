import { Board, Coord, N, Preview, Step, Hand, Algorithm } from "../types";

/** Basics */
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

/** Board ops */
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
	const fullRows: number[] = [],
		fullCols: number[] = [];
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

/** Heuristics */
function countIslands(board: Board): number {
	const seen = Array.from({ length: N }, () => Array(N).fill(false));
	let islands = 0;
	const dirs = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	];
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			if (board[y][x] === 0 || seen[y][x]) continue;
			islands++;
			const q: [[number, number]] = [[x, y]];
			seen[y][x] = true;
			while (q.length) {
				const [cx, cy] = q.pop()!;
				for (const [dx, dy] of dirs) {
					const nx = cx + dx,
						ny = cy + dy;
					if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
					if (board[ny][nx] === 1 && !seen[ny][nx]) {
						seen[ny][nx] = true;
						q.push([nx, ny]);
					}
				}
			}
		}
	return islands;
}
function countHoles(board: Board): number {
	// empty cells fully surrounded by filled neighbors (4-neigh)
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
function mobility(board: Board): number {
	// rough: count number of empty cells that have at least one empty neighbor
	let m = 0;
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			if (board[y][x] === 0) {
				if (
					(x > 0 && board[y][x - 1] === 0) ||
					(x < N - 1 && board[y][x + 1] === 0) ||
					(y > 0 && board[y - 1][x] === 0) ||
					(y < N - 1 && board[y + 1][x] === 0)
				)
					m++;
			}
		}
	return m;
}
function scoreBoard(
	linesCleared: number,
	cellsPlaced: number,
	board: Board,
	stepsUsed: number,
) {
	// Tuned-ish: prioritize clears, then cells placed, then mobility; penalize holes/islands
	const holes = countHoles(board);
	const islands = countIslands(board);
	const mob = mobility(board);
	return (
		1000 * linesCleared +
		9 * cellsPlaced +
		0.5 * mob +
		1 * stepsUsed -
		50 * holes -
		12 * islands
	);
}

/** Algorithms */
export function findBestGreedy(board: Board, hands: Hand[]): Preview {
	// simple: try all sequences but only keep best by local step-wise gain
	// (still explores permutations but no beam)
	let best: Preview = { score: -Infinity, steps: [] };
	function dfs(
		cur: Board,
		rem: Hand[],
		acc: Step[],
		cleared: number,
		placed: number,
	) {
		if (!rem.length) {
			const sc = scoreBoard(cleared, placed, cur, acc.length);
			if (sc > best.score) best = { score: sc, steps: acc.slice() };
			return;
		}
		for (let i = 0; i < rem.length; i++) {
			const h = rem[i],
				rest = rem.filter((_, j) => j !== i);
			const positions = allPlacements(cur, h.shape);
			if (!positions.length) {
				dfs(cur, rest, acc, cleared, placed);
				continue;
			}
			// choose locally best position for this hand only
			let localBest: { step: Step; nb: Board; sc: number } | null = null;
			for (const [ox, oy] of positions) {
				const { board: nb, linesCleared } = place(cur, h.shape, ox, oy);
				const sc = scoreBoard(linesCleared, h.shape.length, nb, acc.length + 1);
				const step: Step = { hand: h, ox, oy, linesCleared };
				if (!localBest || sc > localBest.sc) localBest = { step, nb, sc };
			}
			if (localBest) {
				acc.push(localBest.step);
				dfs(
					localBest.nb,
					rest,
					acc,
					cleared + localBest.step.linesCleared,
					placed + h.shape.length,
				);
				acc.pop();
			}
		}
	}
	dfs(board, hands, [], 0, 0);
	return best;
}

export function findBestBeam(board: Board, hands: Hand[], K = 120): Preview {
	type Node = {
		board: Board;
		steps: Step[];
		used: boolean[];
		cleared: number;
		placed: number;
	};
	const n = hands.length;
	const init: Node = {
		board,
		steps: [],
		used: Array(n).fill(false),
		cleared: 0,
		placed: 0,
	};
	let frontier: Node[] = [init];

	for (let depth = 0; depth < n; depth++) {
		const next: Node[] = [];
		for (const node of frontier) {
			for (let i = 0; i < n; i++) {
				if (node.used[i]) continue;
				const h = hands[i];
				const positions = allPlacements(node.board, h.shape);
				for (const [ox, oy] of positions) {
					const { board: nb, linesCleared } = place(
						node.board,
						h.shape,
						ox,
						oy,
					);
					const steps = node.steps.concat([{ hand: h, ox, oy, linesCleared }]);
					const used = node.used.slice();
					used[i] = true;
					next.push({
						board: nb,
						steps,
						used,
						cleared: node.cleared + linesCleared,
						placed: node.placed + h.shape.length,
					});
				}
			}
			// also allow skipping unplaceable branches: do nothing
			if (node.steps.length) next.push(node);
		}
		// rank & beam
		next.sort(
			(a, b) =>
				scoreBoard(b.cleared, b.placed, b.board, b.steps.length) -
				scoreBoard(a.cleared, a.placed, a.board, a.steps.length),
		);
		frontier = next.slice(0, K);
	}
	// pick best
	frontier.sort(
		(a, b) =>
			scoreBoard(b.cleared, b.placed, b.board, b.steps.length) -
			scoreBoard(a.cleared, a.placed, a.board, a.steps.length),
	);
	const best = frontier[0] || init;
	return {
		score: scoreBoard(best.cleared, best.placed, best.board, best.steps.length),
		steps: best.steps,
	};
}

export function findBestRollout(
	board: Board,
	hands: Hand[],
	rollouts = 40,
): Preview {
	// Evaluate each sequence by adding a mobility forecast via random noise
	// (cheap look-ahead beyond current hands)
	let best: Preview = { score: -Infinity, steps: [] };
	function perms(arr: Hand[], acc: Hand[] = []): Hand[][] {
		if (!arr.length) return [acc];
		const out: Hand[][] = [];
		arr.forEach((h, i) => {
			const rest = arr.filter((_, j) => j !== i);
			out.push(...perms(rest, acc.concat(h)));
		});
		return out;
	}
	const sequences = perms(hands);
	for (const seq of sequences) {
		// choose best placements for this fixed order
		const expand = (
			b: Board,
		): { steps: Step[]; board: Board; cleared: number; placed: number } => {
			let cur = b,
				steps: Step[] = [],
				cleared = 0,
				placed = 0;
			for (const h of seq) {
				const pos = allPlacements(cur, h.shape);
				if (!pos.length) continue;
				let bestLocal: any = null;
				for (const [ox, oy] of pos) {
					const { board: nb, linesCleared } = place(cur, h.shape, ox, oy);
					const sc = scoreBoard(
						linesCleared,
						h.shape.length,
						nb,
						steps.length + 1,
					);
					if (!bestLocal || sc > bestLocal.sc)
						bestLocal = { nb, ox, oy, linesCleared, sc };
				}
				if (bestLocal) {
					cur = bestLocal.nb;
					steps.push({
						hand: h,
						ox: bestLocal.ox,
						oy: bestLocal.oy,
						linesCleared: bestLocal.linesCleared,
					});
					cleared += bestLocal.linesCleared;
					placed += h.shape.length;
				}
			}
			return { steps, board: cur, cleared, placed };
		};
		const base = expand(board);

		// crude rollouts: random “noise” clears to proxy survivability
		let bonus = 0;
		for (let r = 0; r < rollouts; r++) {
			// sample random empty cells coverage as mobility proxy
			bonus += mobility(base.board) * 0.05;
		}
		const score =
			scoreBoard(base.cleared, base.placed, base.board, base.steps.length) +
			bonus;
		if (score > best.score) best = { score, steps: base.steps };
	}
	return best;
}

export function findBestByAlgorithm(
	board: Board,
	hands: Hand[],
	algo: Algorithm,
): Preview {
	if (hands.length === 0) return { score: 0, steps: [] };
	switch (algo) {
		case "greedy":
			return findBestGreedy(board, hands);
		case "beam":
			return findBestBeam(board, hands, 120);
		case "rollout":
			return findBestRollout(board, hands, 40);
		default:
			return findBestGreedy(board, hands);
	}
}
