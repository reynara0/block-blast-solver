import React from "react";
import { Coord } from "../types";
import { normalize } from "../lib/board";

export default function ShapePreview({
	shape,
	size = 16,
	color = "#fff",
	bg = "rgba(255,255,255,0.06)",
}: {
	shape?: Coord[] | null;
	size?: number;
	color?: string;
	bg?: string;
}) {
	if (!shape)
		return (
			<div
				style={{
					width: 80,
					height: 80,
					borderRadius: 16,
					border: "1px solid rgba(255,255,255,0.1)",
					background: "rgba(255,255,255,0.05)",
				}}
			/>
		);
	const cells = normalize(shape);
	const maxX = Math.max(...cells.map(([x]) => x));
	const maxY = Math.max(...cells.map(([, y]) => y));
	const w = (maxX + 1) * size,
		h = (maxY + 1) * size;

	return (
		<div style={{ padding: 1 }}>
			<div style={{ width: w, height: h, position: "relative" }}>
				{cells.map(([x, y], i) => (
					<div
						key={i}
						style={{
							position: "absolute",
							left: x * size,
							top: y * size,
							width: size - 2,
							height: size - 2,
							backgroundColor: color,
							borderRadius: 6,
							opacity: 0.9,
						}}
					/>
				))}
			</div>
		</div>
	);
}
