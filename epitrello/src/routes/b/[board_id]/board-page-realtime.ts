import type { BoardUpdatedRealtimeEvent } from './board.types';

export class BoardRealtimeSync {
	private boardId: string;
	private userId: string;
	private loadBoardFull: () => Promise<void>;
	private loadBoardHistory: () => Promise<void>;
	private source: EventSource | null = null;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private reloadInFlight = false;
	private reloadQueued = false;

	constructor(params: {
		boardId: string;
		userId: string;
		loadBoardFull: () => Promise<void>;
		loadBoardHistory: () => Promise<void>;
	}) {
		this.boardId = params.boardId;
		this.userId = params.userId;
		this.loadBoardFull = params.loadBoardFull;
		this.loadBoardHistory = params.loadBoardHistory;
	}

	start() {
		this.stop();
		const params = new URLSearchParams({ boardId: this.boardId, userId: this.userId });
		this.source = new EventSource(`/api/board-events?${params.toString()}`);
		this.source.addEventListener('board-updated', (event: Event) => {
			let actorId: string | null = null;
			try {
				const payload = JSON.parse((event as MessageEvent).data) as BoardUpdatedRealtimeEvent;
				if (typeof payload.actorId === 'string') {
					actorId = payload.actorId;
				}
			} catch {
				// ignore malformed payloads
			}

			if (actorId && actorId === this.userId) {
				void this.loadBoardHistory();
				return;
			}

			this.scheduleReload();
		});
	}

	stop() {
		if (this.source) {
			this.source.close();
			this.source = null;
		}
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.reloadInFlight = false;
		this.reloadQueued = false;
	}

	private scheduleReload(delayMs = 120) {
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(() => {
			this.timer = null;
			void this.runReload();
		}, delayMs);
	}

	private async runReload() {
		if (this.reloadInFlight) {
			this.reloadQueued = true;
			return;
		}

		this.reloadInFlight = true;
		try {
			await Promise.all([this.loadBoardFull(), this.loadBoardHistory()]);
		} finally {
			this.reloadInFlight = false;
			if (this.reloadQueued) {
				this.reloadQueued = false;
				void this.runReload();
			}
		}
	}
}
