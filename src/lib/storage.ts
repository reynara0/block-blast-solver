import {
	STORAGE_KEYS,
	Board,
	Theme,
	Algorithm,
	AlgoConfig,
	DEFAULT_ALGO_CONFIG,
} from "../types";

export const loadBoard = (N: number, fallback: Board): Board => {
	try {
		const s = localStorage.getItem(STORAGE_KEYS.board);
		if (!s) return fallback;
		const parsed = JSON.parse(s);
		return Array.isArray(parsed) && parsed.length === N ? parsed : fallback;
	} catch {
		return fallback;
	}
};
export const saveBoard = (board: Board) =>
	localStorage.setItem(STORAGE_KEYS.board, JSON.stringify(board));

export const loadTheme = <T extends Theme>(def: T): T => {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEYS.theme) || "") || def;
	} catch {
		return def;
	}
};
export const saveTheme = (theme: Theme) =>
	localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));

export const loadSpeed = (def = 3000): number => {
	const v = parseInt(localStorage.getItem(STORAGE_KEYS.speed) || "", 10);
	return Number.isFinite(v) && v >= 800 && v <= 6000 ? v : def;
};
export const saveSpeed = (ms: number) =>
	localStorage.setItem(STORAGE_KEYS.speed, String(ms));

export type SavedHandRef = { id: string } | null;
export const saveHands = (ids: SavedHandRef[]) =>
	localStorage.setItem(STORAGE_KEYS.hands, JSON.stringify(ids));
export const loadHands = (): SavedHandRef[] | null => {
	try {
		const s = localStorage.getItem(STORAGE_KEYS.hands);
		if (!s) return null;
		return JSON.parse(s);
	} catch {
		return null;
	}
};

export const loadAlgo = (def: Algorithm = "max_clearance"): Algorithm => {
	const v = localStorage.getItem(STORAGE_KEYS.algo) as Algorithm | null;
	return v === "max_clearance" || v === "max_positional" || v === "hybrid"
		? v
		: def;
};
export const saveAlgo = (algo: Algorithm) =>
	localStorage.setItem(STORAGE_KEYS.algo, algo);

export const loadAlgoCfg = (
	def: AlgoConfig = DEFAULT_ALGO_CONFIG,
): AlgoConfig => {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEYS.algoCfg) || "") || def;
	} catch {
		return def;
	}
};
export const saveAlgoCfg = (cfg: AlgoConfig) =>
	localStorage.setItem(STORAGE_KEYS.algoCfg, JSON.stringify(cfg));
