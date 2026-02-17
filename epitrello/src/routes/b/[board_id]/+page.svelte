<script lang="ts">
	import UserSearchBar from '../../user_search_bar.svelte';
	import BoardHistoryPanel from './BoardHistoryPanel.svelte';
	import BoardWorkspace from './BoardWorkspace.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type {
		BoardFullResponse,
		BoardHistoryResponse,
		BoardMember,
		BoardUpdatedRealtimeEvent,
		UiList
	} from './board.types';

	const { data } = $props<{
		data: {
			board: { id: string; name: string } | undefined;
		};
	}>();

	const boardId = $derived(data.board?.id);

	let ready = $state(false);
	let board_name = $state('Board');
	let currentUserId = $state('');
	let currentUserName = $state('');
	let currentUserEmail = $state('');
	let boardRole = $state<'owner' | 'editor' | 'viewer' | null>(null);
	let canEdit = $state(false);
	let canManage = $state(false);
	let loadError = $state('');
	let inviteMessage = $state('');
	let historyEntries = $state<BoardHistoryResponse['entries']>([]);
	let historyError = $state('');
	let historyLoading = $state(false);
	let historyPanelOpen = $state(false);
	let filtersPanelOpen = $state(false);

	let lists = $state<UiList[]>([]);
	let boardMembers = $state<BoardMember[]>([]);
	let boardEventsSource = $state<EventSource | null>(null);
	let realtimeReloadTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let realtimeReloadInFlight = $state(false);
	let realtimeReloadQueued = $state(false);

	function applyLoadedState(payload: BoardFullResponse) {
		if (!payload || !payload.board) return;

		board_name = payload.board.name ?? board_name;
		boardRole = payload.board.role;
		canEdit = payload.board.canEdit;
		canManage = payload.board.canManage;
		boardMembers = payload.board.members ?? [];

		let localId = 1;
		lists = payload.lists.map((list) => ({
			uuid: list.uuid,
			name: list.name,
			newCardTitle: '',
			cards: list.cards.map((card) => ({
				id: localId++,
				uuid: card.uuid,
				title: card.title,
				description: card.description ?? '',
				dueDate: card.dueDate ?? '',
				assignees: card.assignees ?? [],
				completed: card.completed ?? false,
				tags: card.tags ?? []
			}))
		}));
	}

	async function loadBoardFull() {
		if (!browser || !boardId || !currentUserId) return;
		loadError = '';

		try {
			const res = await fetch(
				`/api/board-full?boardId=${boardId}&userId=${encodeURIComponent(currentUserId)}`
			);
			if (!res.ok) {
				loadError = res.status === 403 ? 'Access denied for this board.' : 'Unable to load board.';
				console.warn('Erreur /api/board-full', await res.text());
				return;
			}

			const payload = (await res.json()) as BoardFullResponse;
			applyLoadedState(payload);
		} catch (err) {
			loadError = 'Network error while loading board.';
			console.error('Erreur réseau /api/board-full', err);
		}
	}

	async function loadBoardHistory(options: { silent?: boolean } = {}) {
		if (!browser || !boardId || !currentUserId) return;

		const silent = options.silent ?? false;
		if (!silent) {
			historyLoading = true;
			historyError = '';
		}

		try {
			const params = new URLSearchParams({
				boardId,
				userId: currentUserId,
				limit: '80'
			});
			const res = await fetch(`/api/board-history?${params.toString()}`);
			if (!res.ok) {
				if (!silent || historyEntries.length === 0) {
					historyError =
						res.status === 403
							? 'Access denied for board activity.'
							: 'Unable to load board activity.';
				}
				console.warn('Erreur /api/board-history', await res.text());
				return;
			}

			const payload = (await res.json()) as BoardHistoryResponse;
			historyEntries = Array.isArray(payload.entries) ? payload.entries : [];
			historyError = '';
		} catch (err) {
			if (!silent || historyEntries.length === 0) {
				historyError = 'Network error while loading board activity.';
			}
			console.error('Erreur réseau /api/board-history', err);
		} finally {
			if (!silent) {
				historyLoading = false;
			}
		}
	}

	function toggleHistoryPanel() {
		historyPanelOpen = !historyPanelOpen;
		if (historyPanelOpen && historyEntries.length === 0 && !historyLoading) {
			void loadBoardHistory();
		}
	}

	async function tryJoinWithInvite(inviteToken: string) {
		if (!browser || !boardId || !currentUserId || !inviteToken) return;

		try {
			const res = await fetch('/api/board-sharing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					boardId,
					userId: currentUserId,
					inviteToken
				})
			});

			if (!res.ok) {
				inviteMessage = 'Invalid or expired invite link.';
				console.error('Erreur join invite', await res.text());
				return;
			}

			const payload = (await res.json()) as { joined: boolean };
			inviteMessage = payload.joined ? 'You joined this board.' : '';

			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.delete('invite');
			window.history.replaceState({}, '', nextUrl.toString());
		} catch (err) {
			inviteMessage = 'Unable to join board with invite link.';
			console.error('Erreur réseau join invite', err);
		}
	}

	function stopRealtimeSync() {
		if (boardEventsSource) {
			boardEventsSource.close();
			boardEventsSource = null;
		}
		if (realtimeReloadTimer) {
			clearTimeout(realtimeReloadTimer);
			realtimeReloadTimer = null;
		}
		realtimeReloadInFlight = false;
		realtimeReloadQueued = false;
	}

	async function runRealtimeReload() {
		if (realtimeReloadInFlight) {
			realtimeReloadQueued = true;
			return;
		}

		realtimeReloadInFlight = true;
		try {
			await Promise.all([loadBoardFull(), loadBoardHistory({ silent: true })]);
		} finally {
			realtimeReloadInFlight = false;
			if (realtimeReloadQueued) {
				realtimeReloadQueued = false;
				void runRealtimeReload();
			}
		}
	}

	function scheduleRealtimeReload(delayMs = 120) {
		if (realtimeReloadTimer) {
			clearTimeout(realtimeReloadTimer);
		}

		realtimeReloadTimer = setTimeout(() => {
			realtimeReloadTimer = null;
			void runRealtimeReload();
		}, delayMs);
	}

	function startRealtimeSync() {
		if (!browser || !boardId || !currentUserId) {
			return;
		}

		stopRealtimeSync();

		const params = new URLSearchParams({
			boardId,
			userId: currentUserId
		});
		const source = new EventSource(`/api/board-events?${params.toString()}`);
		boardEventsSource = source;

		source.addEventListener('board-updated', (event: Event) => {
			let actorId: string | null = null;
			try {
				const payload = JSON.parse((event as MessageEvent).data) as BoardUpdatedRealtimeEvent;
				if (typeof payload.actorId === 'string') {
					actorId = payload.actorId;
				}
			} catch (error) {
				void error;
			}

			if (actorId && actorId === currentUserId) {
				void loadBoardHistory({ silent: true });
				return;
			}

			scheduleRealtimeReload();
		});
	}

	onMount(() => {
		let cancelled = false;

		const bootstrap = async () => {
			if (!browser) {
				ready = true;
				return;
			}

			const raw = localStorage.getItem('user');
			if (!raw) {
				goto(resolve('/login'));
				return;
			}

			let currentUser: { id?: string; name?: string; email?: string } | null = null;
			try {
				currentUser = JSON.parse(raw);
			} catch {
				localStorage.removeItem('user');
				localStorage.removeItem('authToken');
				goto(resolve('/login'));
				return;
			}

			if (!currentUser?.id) {
				goto(resolve('/login'));
				return;
			}

			currentUserId = currentUser.id;
			currentUserName = currentUser.name ?? '';
			currentUserEmail = currentUser.email ?? '';
			board_name = data.board?.name ?? board_name;

			const inviteToken = new URL(window.location.href).searchParams.get('invite') ?? '';
			if (inviteToken) {
				await tryJoinWithInvite(inviteToken);
			}

			await Promise.all([loadBoardFull(), loadBoardHistory()]);
			if (cancelled) {
				return;
			}

			startRealtimeSync();
			ready = true;
		};

		void bootstrap();

		return () => {
			cancelled = true;
			stopRealtimeSync();
		};
	});

	async function persistBoardName() {
		if (!browser || !boardId || !canManage) return;

		const name = board_name.trim();
		if (!name) return;

		try {
			await fetch('/api/boards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId, name, userId: currentUserId })
			});
		} catch (err) {
			console.error('Erreur rename board', err);
		}
	}
</script>

{#if ready}
	<UserSearchBar />
	<div
		class="min-h-[calc(100vh-4rem)] w-screen bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-3"
	>
		<div
			class="mb-3 flex items-center gap-3 rounded-xl border border-sky-300/30 bg-slate-800/70 p-3 shadow-md shadow-slate-950/50 backdrop-blur-sm"
		>
			<input
				class="flex-1 rounded-md border-0 bg-transparent px-2 py-1 text-2xl font-bold text-slate-100 transition-colors hover:bg-slate-700/60 focus:outline-0"
				title="Board Name"
				type="text"
				bind:value={board_name}
				placeholder="Board name..."
				readonly={!canManage}
				onblur={persistBoardName}
			/>
			<button
				type="button"
				onclick={toggleHistoryPanel}
				class="hover:cursor-pointer rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
				aria-expanded={historyPanelOpen}
				aria-controls="board-history-panel"
			>
				Activity
			</button>
			<button
				type="button"
				onclick={() => (filtersPanelOpen = !filtersPanelOpen)}
				class="hover:cursor-pointer rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
				aria-expanded={filtersPanelOpen}
				aria-controls="board-filters-panel"
			>
				Filter
			</button>
			{#if boardId && canManage}
				<a
					href={resolve(`/b/${boardId}/settings`)}
					class="rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
				>
					Board Settings
				</a>
			{/if}
		</div>
		{#if inviteMessage}
			<p
				class="mb-3 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
			>
				{inviteMessage}
			</p>
		{/if}
		{#if loadError}
			<p
				class="mb-3 rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
			>
				{loadError}
			</p>
		{/if}
		<p class="mb-1 px-2 text-xs uppercase tracking-wider text-slate-300">
			Role: {boardRole ?? 'unknown'}
			{canEdit ? '(editor access)' : '(read only)'}
		</p>

		<BoardWorkspace
			{boardId}
			{currentUserId}
			{currentUserName}
			{currentUserEmail}
			{canEdit}
			{boardMembers}
			bind:lists
			bind:filtersPanelOpen
		/>
	</div>

	<BoardHistoryPanel
		open={historyPanelOpen}
		{historyLoading}
		{historyError}
		{historyEntries}
		on:close={() => (historyPanelOpen = false)}
		on:refresh={() => void loadBoardHistory()}
	/>
{:else}
	<div
		class="flex min-h-[calc(100vh-4rem)] w-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-sky-900"
	>
		<p
			class="rounded-md border border-sky-300/30 bg-slate-900/85 px-3 py-1.5 text-sm text-slate-100 shadow-sm shadow-slate-950/60"
		>
			Chargement du board...
		</p>
	</div>
{/if}
