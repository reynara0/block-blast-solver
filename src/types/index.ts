export const N = 8 as const;

export type Cell = 0 | 1;
export type Board = Cell[][];
export type Coord = [x: number, y: number];

export interface ShapeDef {
	id: string;
	name: string;
	cells: Coord[];
}
export interface Hand {
	id: string;
	shape: Coord[];
	color: string;
	idx: number;
}
export interface Step {
	hand: Hand;
	ox: number;
	oy: number;
	linesCleared: number;
}
export interface Preview {
	score: number;
	steps: Step[];
}

export type PieceGroupKey =
	| "bars"
	| "rects"
	| "L"
	| "Z"
	| "T"
	| "corner3"
	| "diag2"
	| "diag3"
	| "custom";

export type Algorithm = "greedy" | "beam" | "rollout";

export interface Theme {
	emptyColor: string;
	filledColor: string;
	accentColor: string;
	hand1Color: string;
	hand2Color: string;
	hand3Color: string;
	glass: number; // 0..1
}

export const DEFAULT_THEME: Theme = {
	emptyColor: "#0b3350",
	filledColor: "#facc15",
	accentColor: "#60a5fa",
	hand1Color: "#3b82f6",
	hand2Color: "#ef4444",
	hand3Color: "#22c55e",
	glass: 0.06,
};

export const STORAGE_KEYS = {
	board: "bb.board",
	hands: "bb.hands",
	theme: "bb.theme",
	speed: "bb.speed",
	algo: "bb.algo",
} as const;
