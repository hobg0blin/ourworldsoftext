'use client';

import { useEffect, useRef, useState } from 'react';
import type { TextRecord } from '@/lib/world';

type Tile = { ch: string; did: string };
type Tiles = Record<string, Tile>;

const POLL_MS = 3000;

// Records are newest-first; place oldest first so later text overwrites earlier.
function tilesFromRecords(records: TextRecord[]): Tiles {
	const tiles: Tiles = {};
	for (const r of [...records].reverse()) {
		[...r.text].forEach((ch, i) => {
			tiles[`${r.xPosition + i},${r.yPosition}`] = { ch, did: r.authorDid };
		});
	}
	return tiles;
}

// Stable per-user color: hash the DID to a hue. Same DID -> same color everywhere.
function colorForDid(did: string): string {
	let h = 0;
	for (let i = 0; i < did.length; i++) h = (h * 31 + did.charCodeAt(i)) | 0;
	return `hsl(${Math.abs(h) % 360}, 85%, 65%)`;
}

export function Canvas({
	initialTexts = [],
	viewerDid,
}: {
	initialTexts?: TextRecord[];
	viewerDid?: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [tiles, setTiles] = useState<Tiles>(() =>
		tilesFromRecords(initialTexts),
	);
	const [active, setActive] = useState<{ col: number; row: number } | null>(
		null,
	);

	const fontSize = 16;
	const charWidth = useRef(0);
	const charHeight = fontSize;
	const gridSize = useRef({ cols: 0, rows: 0 });

	const draw = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.font = `${fontSize}px monospace`;
		ctx.textBaseline = 'top';

		const cw = charWidth.current;
		const { cols, rows } = gridSize.current;

		// grid lines
		ctx.strokeStyle = '#333';
		for (let x = 0; x <= cols; x++) {
			ctx.beginPath();
			ctx.moveTo(x * cw, 0);
			ctx.lineTo(x * cw, canvas.height);
			ctx.stroke();
		}
		for (let y = 0; y <= rows; y++) {
			ctx.beginPath();
			ctx.moveTo(0, y * charHeight);
			ctx.lineTo(canvas.width, y * charHeight);
			ctx.stroke();
		}

		// highlight active tile
		if (active) {
			ctx.fillStyle = 'rgba(255,255,255,0.15)';
			ctx.fillRect(active.col * cw, active.row * charHeight, cw, charHeight);
		}

		// draw characters, colored by author
		for (const key in tiles) {
			const [col, row] = key.split(',').map(Number);
			ctx.fillStyle = colorForDid(tiles[key].did);
			ctx.fillText(tiles[key].ch, col * cw, row * charHeight);
		}
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const ctx = canvas.getContext('2d')!;
		ctx.font = `${fontSize}px monospace`;
		charWidth.current = ctx.measureText('M').width;
		gridSize.current = {
			cols: Math.floor(canvas.width / charWidth.current),
			rows: Math.floor(canvas.height / charHeight),
		};

		draw();
	}, []);

	useEffect(() => {
		draw();
	}, [tiles, active]);

	// Poll the world so other people's text shows up as they type.
	// Remote state wins for cells it knows about; cells typed locally but not
	// yet visible on a PDS are kept so your own typing doesn't flicker.
	useEffect(() => {
		let stop = false;
		const tick = async () => {
			try {
				const res = await fetch('/api/world', { cache: 'no-store' });
				if (!res.ok) return;
				const { texts } = (await res.json()) as { texts: TextRecord[] };
				if (stop) return;
				const remote = tilesFromRecords(texts);
				setTiles((prev) => ({ ...prev, ...remote }));
			} catch {
				// network hiccup; try again next tick
			}
		};
		const id = setInterval(tick, POLL_MS);
		return () => {
			stop = true;
			clearInterval(id);
		};
	}, []);

	const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const col = Math.floor(x / charWidth.current);
		const row = Math.floor(y / charHeight);
		setActive({ col, row });
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
		if (!active) return;
		if (e.key.length !== 1) return; // ignore Shift, Enter, etc.

		const key = `${active.col},${active.row}`;
		setTiles((prev) => ({
			...prev,
			[key]: { ch: e.key, did: viewerDid ?? 'me' },
		}));
		post(e.key, active.col, active.row);

		// advance to next tile, wrapping to next row
		const { cols, rows } = gridSize.current;
		let nextCol = active.col + 1;
		let nextRow = active.row;
		if (nextCol >= cols) {
			nextCol = 0;
			nextRow += 1;
		}
		if (nextRow < rows) {
			setActive({ col: nextCol, row: nextRow });
		} else {
			setActive(null); // reached end of grid
		}
	};

	async function post(char: string, x: number, y: number) {
		await fetch('/api/text', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: char, xPosition: x, yPosition: y }),
		});
	}

	return (
		<canvas
			id="canvas"
			ref={canvasRef}
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			style={{ display: 'block', outline: 'none', background: '#111' }}
		/>
	);
}
