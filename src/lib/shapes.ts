import { Coord, PieceGroupKey, ShapeDef } from "../types";
import { variants, canonicalKey, normalize } from "./board";

function bar(len: number): Coord[] {
	return Array.from({ length: len }, (_, i) => [i, 0]);
}
const rect2x2: Coord[] = [
	[0, 0],
	[1, 0],
	[0, 1],
	[1, 1],
];
const rect2x3: Coord[] = [
	[0, 0],
	[1, 0],
	[0, 1],
	[1, 1],
	[0, 2],
	[1, 2],
];
const Z4: Coord[] = [
	[0, 0],
	[1, 0],
	[1, 1],
	[2, 1],
];
const L4: Coord[] = [
	[0, 0],
	[0, 1],
	[0, 2],
	[1, 2],
];
const corner3: Coord[] = [
	[0, 0],
	[1, 0],
	[0, 1],
];
const T4: Coord[] = [
	[0, 0],
	[1, 0],
	[2, 0],
	[1, 1],
];
const diag2: Coord[] = [
	[0, 0],
	[1, 1],
];
const diag3: Coord[] = [
	[0, 0],
	[1, 1],
	[2, 2],
];
const boomerang5: Coord[] = [
	[0, 0],
	[1, 0],
	[2, 0],
	[2, 1],
	[2, 2],
];

export type GroupedShapes = Record<PieceGroupKey, ShapeDef[]>;
export const GROUP_TITLES: Record<PieceGroupKey, string> = {
	bars: "Bars",
	rects: "Rectangles",
	L: "L Pieces",
	Z: "Z Pieces",
	T: "T Pieces",
	corner3: "Corners (3-block)",
	diag2: "Diagonal (2)",
	diag3: "Diagonal (3)",
	custom: "Custom",
};

export function buildGroupedShapes(): GroupedShapes {
	const g: GroupedShapes = {
		bars: [],
		rects: [],
		L: [],
		Z: [],
		T: [],
		corner3: [],
		diag2: [],
		diag3: [],
		custom: [],
	};

	for (let len = 2; len <= 6; len++) {
		variants(bar(len), true).forEach((cells, i) =>
			g.bars.push({ id: `bar${len}_${i}`, name: `Bar ${len}`, cells }),
		);
	}
	variants(rect2x2, false).forEach((cells, i) =>
		g.rects.push({ id: `rect2x2_${i}`, name: "2x2", cells }),
	);
	variants(rect2x3, true).forEach((cells, i) =>
		g.rects.push({ id: `rect2x3_${i}`, name: "2x3", cells }),
	);
	g.rects.push({
		id: "rect3x3",
		name: "3x3",
		cells: [
			[0, 0],
			[1, 0],
			[2, 0],
			[0, 1],
			[1, 1],
			[2, 1],
			[0, 2],
			[1, 2],
			[2, 2],
		],
	});

	variants(L4, true).forEach((cells, i) =>
		g.L.push({ id: `L4_${i}`, name: "L", cells }),
	);
	variants(Z4, true).forEach((cells, i) =>
		g.Z.push({ id: `Z4_${i}`, name: "Z", cells }),
	);
	variants(T4, true).forEach((cells, i) =>
		g.T.push({ id: `T4_${i}`, name: "T", cells }),
	);

	variants(corner3, false).forEach((cells, i) =>
		g.corner3.push({ id: `corner3_${i}`, name: "Corner", cells }),
	);

	variants(diag2, true).forEach((cells, i) =>
		g.diag2.push({ id: `diag2_${i}`, name: "Diag 2", cells }),
	);
	variants(diag3, true).forEach((cells, i) =>
		g.diag3.push({ id: `diag3_${i}`, name: "Diag 3", cells }),
	);

	variants(boomerang5, true).forEach((cells, i) =>
		g.custom.push({ id: `boom5_${i}`, name: "Boomerang 5", cells }),
	);

	const dedup = (arr: ShapeDef[]) => {
		const seen = new Set<string>(),
			out: ShapeDef[] = [];
		for (const s of arr) {
			const k = canonicalKey(s.cells);
			if (!seen.has(k)) {
				seen.add(k);
				out.push({ ...s, cells: normalize(s.cells) });
			}
		}
		return out;
	};
	(Object.keys(g) as PieceGroupKey[]).forEach((k) => (g[k] = dedup(g[k])));
	return g;
}
