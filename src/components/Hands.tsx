import React from "react";
import { Hand, Theme } from "../types";
import ShapePreview from "./ShapePreview";

type Props = {
	selected: Array<Hand | null>;
	clearHand: (slotIdx: number) => void;
	theme: Theme;
};

export default function Hands({ selected, clearHand, theme }: Props) {
	// change maxWidth to min(520px, 100vw - 24px)
	const glass = (padding = 12): React.CSSProperties => ({
		width: "100%",
		maxWidth: "min(520px, 100vw - 24px)",
		borderRadius: 24,
		border: "1px solid rgba(255,255,255,0.10)",
		background: `rgba(255,255,255,${theme.glass})`,
		boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
		backdropFilter: "blur(10px)",
		marginTop: 16,
		padding,
	});

	const labels = ["Hand 1", "Hand 2", "Hand 3"];
	const colors = [theme.hand1Color, theme.hand2Color, theme.hand3Color];

	return (
		<div style={glass()}>
			<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
				Current hand selection
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, 1fr)",
					gap: 8,
				}}
			>
				{selected.map((h, i) => (
					<button
						key={i}
						onClick={() => (h ? clearHand(i) : null)}
						title={h ? "Tap to clear" : "Tap a piece below to assign"}
						style={{
							borderRadius: 16,
							height: 96,
							border: `2px solid ${colors[i]}`,
							background: "rgba(255,255,255,0.05)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
							color: "#e5e7eb",
						}}
					>
						{h ? (
							<ShapePreview shape={h.shape} color={colors[i]} />
						) : (
							<div style={{ fontSize: 12, opacity: 0.7 }}>{labels[i]}</div>
						)}
					</button>
				))}
			</div>
		</div>
	);
}
