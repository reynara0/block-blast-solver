import React, { useState } from "react";
import { Theme } from "../types";

export default function ThemeModal({
	theme,
	onClose,
	onSave,
}: {
	theme: Theme;
	onClose: () => void;
	onSave: (t: Theme) => void;
}) {
	const [draft, setDraft] = useState<Theme>(theme);
	const row: React.CSSProperties = {
		display: "grid",
		gridTemplateColumns: "120px 1fr",
		gap: 8,
		alignItems: "center",
	};
	const label: React.CSSProperties = { fontSize: 12, opacity: 0.8 };
	const input: React.CSSProperties = {
		padding: 6,
		borderRadius: 8,
		border: "1px solid rgba(255,255,255,0.2)",
		background: "rgba(255,255,255,0.08)",
		color: "#fff",
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					width: "min(520px, 92vw)",
					borderRadius: 16,
					background: "rgba(20,20,28,0.95)",
					border: "1px solid rgba(255,255,255,0.12)",
					padding: 16,
					color: "#e5e7eb",
				}}
			>
				<div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
					Customize Theme
				</div>
				<div style={{ display: "grid", gap: 10 }}>
					<div style={row}>
						<div style={label}>Empty color</div>
						<input
							style={input}
							type="color"
							value={draft.emptyColor}
							onChange={(e) =>
								setDraft({ ...draft, emptyColor: e.target.value })
							}
						/>
					</div>
					<div style={row}>
						<div style={label}>Filled color</div>
						<input
							style={input}
							type="color"
							value={draft.filledColor}
							onChange={(e) =>
								setDraft({ ...draft, filledColor: e.target.value })
							}
						/>
					</div>
					<div style={row}>
						<div style={label}>Accent</div>
						<input
							style={input}
							type="color"
							value={draft.accentColor}
							onChange={(e) =>
								setDraft({ ...draft, accentColor: e.target.value })
							}
						/>
					</div>
					<div style={row}>
						<div style={label}>Hand 1</div>
						<input
							style={input}
							type="color"
							value={draft.hand1Color}
							onChange={(e) =>
								setDraft({ ...draft, hand1Color: e.target.value })
							}
						/>
					</div>
					<div style={row}>
						<div style={label}>Hand 2</div>
						<input
							style={input}
							type="color"
							value={draft.hand2Color}
							onChange={(e) =>
								setDraft({ ...draft, hand2Color: e.target.value })
							}
						/>
					</div>
					<div style={row}>
						<div style={label}>Hand 3</div>
						<input
							style={input}
							type="color"
							value={draft.hand3Color}
							onChange={(e) =>
								setDraft({ ...draft, hand3Color: e.target.value })
							}
						/>
					</div>
					<div style={row}>
						<div style={label}>Glass opacity</div>
						<input
							style={{ ...input, padding: 0 }}
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={draft.glass}
							onChange={(e) =>
								setDraft({ ...draft, glass: parseFloat(e.target.value) })
							}
						/>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						gap: 8,
						marginTop: 14,
						justifyContent: "flex-end",
					}}
				>
					<button
						onClick={onClose}
						style={{
							padding: "8px 12px",
							borderRadius: 10,
							background: "rgba(255,255,255,0.08)",
							border: "1px solid rgba(255,255,255,0.15)",
							color: "#e5e7eb",
						}}
					>
						Cancel
					</button>
					<button
						onClick={() => onSave(draft)}
						style={{
							padding: "8px 12px",
							borderRadius: 10,
							background: "rgba(96,165,250,0.25)",
							border: "1px solid rgba(96,165,250,0.5)",
							color: "#e5e7eb",
						}}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	);
}
