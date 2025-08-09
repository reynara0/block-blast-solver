import React, { useMemo } from "react";
import { PieceGroupKey, ShapeDef, Theme, Hand } from "../types";
import { GROUP_TITLES, buildGroupedShapes } from "../lib/shapes";
import ShapePreview from "./ShapePreview";
import { canonicalKey } from "../lib/board";

const GROUPED = buildGroupedShapes();

type Props = {
	selected: Array<Hand | null>;
	setHand: (slotIdx: number, shapeDef: ShapeDef) => void;
	theme: Theme;
};

export default function Palette({ selected, setHand, theme }: Props) {
	const card = (padding = 12): React.CSSProperties => ({
		width: "100%",
		maxWidth: "min(520px, 100vw - 24px)",
		borderRadius: 24,
		border: "1px solid rgba(255,255,255,0.10)",
		background: `rgba(255,255,255,${theme.glass})`,
		boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
		backdropFilter: "blur(10px)",
		marginTop: 12,
		marginBottom: 48,
		padding,
	});

	const selectedKeys = useMemo(() => {
		const keys = new Set<string>();
		selected.forEach((h) => {
			if (h) keys.add(canonicalKey(h.shape));
		});
		return keys;
	}, [selected]);

	const groups: PieceGroupKey[] = [
		"bars_rects",
		"L",
		"Z",
		"T",
		"corner3",
		"diag2",
		"diag3",
		"custom",
	];

	const grid: React.CSSProperties = {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))",
		gap: 8,
	};

	const chip: React.CSSProperties = {
		borderRadius: 16,
		padding: 8,
		border: "1px solid rgba(255,255,255,0.10)",
		background: "rgba(255,255,255,0.06)",
		cursor: "pointer",
		color: "#e5e7eb",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	};

	return (
		<div style={card()}>
			<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>Pieces</div>
			{groups.map((key) => (
				<div key={key} style={{ marginBottom: 10 }}>
					<div style={{ fontSize: 12, opacity: 0.8, margin: "6px 0" }}>
						{GROUP_TITLES[key]}
					</div>
					<div style={grid}>
						{GROUPED[key].map((s) => {
							const isSelected = selectedKeys.has(canonicalKey(s.cells));
							return (
								<button
									key={s.id}
									onClick={() => {
										const idx = selected.findIndex((v) => !v);
										if (idx === -1) return;
										setHand(idx, s);
									}}
									style={{
										...chip,
										border: isSelected
											? `2px solid ${theme.accentColor}`
											: (chip.border as string),
										boxShadow: isSelected
											? `0 0 0 2px rgba(96,165,250,0.25)`
											: undefined,
										position: "relative",
									}}
									title={s.name}
								>
									{isSelected && (
										<div
											style={{
												position: "absolute",
												top: 6,
												right: 6,
												width: 10,
												height: 10,
												borderRadius: "50%",
												background: theme.accentColor,
											}}
										/>
									)}
									<ShapePreview shape={s.cells} />
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
