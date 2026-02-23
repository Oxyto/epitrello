<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import UserSearchBar from '../../../user_search_bar.svelte';
	import BoardSharingSection from './BoardSharingSection.svelte';

	const { data } = $props<{
		data: {
			board: {
				id: string;
				name: string;
				owner: string;
				ownerUser: string;
				listCount: number;
				theme: string;
				backgroundImageUrl: string;
			};
		};
	}>();

	let ready = $state(false);
	let boardName = $state('');
	let currentUserId = $state('');
	let isOwner = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let clearing = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	onMount(() => {
		if (!browser) return;

		const rawUser = localStorage.getItem('user');
		if (!rawUser) {
			goto(resolve('/login'));
			return;
		}

		let currentUser: { id?: string } | null = null;
		try {
			currentUser = JSON.parse(rawUser);
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
		isOwner = currentUser.id === data.board.owner;
		boardName = data.board.name;
		ready = true;
	});

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const trimmedName = boardName.trim();
		errorMessage = '';
		successMessage = '';

		if (!trimmedName) {
			errorMessage = 'Board name cannot be empty.';
			return;
		}

		saving = true;
		try {
			const response = await fetch('/api/boards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId: data.board.id, name: trimmedName, userId: currentUserId })
			});

			if (!response.ok) {
				errorMessage = 'Unable to save board settings.';
				return;
			}

			boardName = trimmedName;
			successMessage = 'Settings saved.';
		} catch (err) {
			console.error('Erreur save board settings', err);
			errorMessage = 'Network error, please try again.';
		} finally {
			saving = false;
		}
	}

	async function handleDeleteBoard() {
		if (!currentUserId || deleting || !isOwner) return;

		const confirmDelete = confirm(
			`Permanently delete "${boardName.trim() || data.board.name}" board?`
		);
		if (!confirmDelete) return;

		deleting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch(
				`/api/boards?id=${encodeURIComponent(data.board.id)}&userId=${encodeURIComponent(currentUserId)}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				errorMessage = 'Board deletion failed.';
				return;
			}

			goto(resolve(`/u/${currentUserId}`));
		} catch (err) {
			console.error('Erreur delete board', err);
			errorMessage = 'Network error while deleting.';
		} finally {
			deleting = false;
		}
	}

	async function handleClearBoardContent() {
		if (!currentUserId || clearing || !isOwner) return;

		const confirmClear = confirm(
			`Clear all lists/cards/tags inside "${boardName.trim() || data.board.name}"?`
		);
		if (!confirmClear) return;

		clearing = true;
		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch('/api/board-clear', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					boardId: data.board.id,
					userId: currentUserId
				})
			});
			const payload = (await response.json().catch(() => ({}))) as {
				error?: string;
				message?: string;
				clearedLists?: number;
				clearedCards?: number;
			};

			if (!response.ok) {
				errorMessage = payload.error ?? payload.message ?? 'Board clear failed.';
				return;
			}

			successMessage = `Board content cleared (${Number(payload.clearedLists ?? 0)} list(s), ${Number(payload.clearedCards ?? 0)} card(s)).`;
		} catch (err) {
			console.error('Erreur clear board content', err);
			errorMessage = 'Network error while clearing board content.';
		} finally {
			clearing = false;
		}
	}
</script>

{#if ready}
	<UserSearchBar />
	<main
		class="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-6 text-slate-100 sm:px-8 lg:px-12"
	>
		<section
			class="select-none rounded-xl border border-sky-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">Board Settings</p>
					<h1 class="mt-1 text-2xl font-bold">Board Settings</h1>
					<p class="mt-1 text-sm text-slate-300">
						Configure board ownership and sharing permissions.
					</p>
				</div>

				<a
					href={resolve(`/b/${data.board.id}`)}
					class="rounded-md border border-sky-300/25 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700/90"
				>
					Back to board
				</a>
			</div>

			<form onsubmit={handleSave} class="grid gap-4">
				<div class="grid gap-1.5">
					<label for="board-name" class="text-sm font-semibold text-slate-200">Board name</label>
					<input
						id="board-name"
						type="text"
						maxlength="120"
						bind:value={boardName}
						readonly={!isOwner}
						class="rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						placeholder="Board name..."
					/>
				</div>

				<button
					type="submit"
					disabled={saving || !isOwner}
					class="w-fit cursor-pointer rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/50 transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
				{#if !isOwner}
					<p class="text-sm text-slate-300">Only the board owner can update these settings.</p>
				{/if}
			</form>

			{#if successMessage}
				<p
					class="mt-3 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
				>
					{successMessage}
				</p>
			{/if}
			{#if errorMessage}
				<p
					class="mt-3 rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
				>
					{errorMessage}
				</p>
			{/if}
		</section>

		<section
			class="mt-5 rounded-xl border border-sky-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<h2 class="select-none text-lg font-semibold">Information</h2>
			<div class="mt-3 grid gap-2 text-sm text-slate-300">
				<p><span class="font-semibold text-slate-100">ID:</span> {data.board.id}</p>
				<p>
					<span class="font-semibold text-slate-100">User:</span>
					{data.board.ownerUser || 'Unknown'}
				</p>
				<p><span class="font-semibold text-slate-100">Owner:</span> {data.board.owner}</p>
				<p><span class="font-semibold text-slate-100">Lists:</span> {data.board.listCount}</p>
				<p>
					<span class="font-semibold text-slate-100">Theme:</span>
					{data.board.theme || 'default'}
				</p>
			</div>
		</section>

		{#if isOwner}
			<BoardSharingSection boardId={data.board.id} {currentUserId} />
		{/if}

		<section
			class="mt-5 rounded-xl border border-rose-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<h2 class="text-lg font-semibold text-rose-200">Danger zone</h2>
			<p class="mt-1 text-sm text-slate-300">High-impact actions on this board.</p>
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="cursor-pointer rounded-md border border-amber-300/40 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/35 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={clearing || !isOwner}
					onclick={handleClearBoardContent}
				>
					{clearing ? 'Clearing...' : 'Clear board content'}
				</button>
				<button
					type="button"
					class="cursor-pointer rounded-md border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={deleting || !isOwner}
					onclick={handleDeleteBoard}
				>
					{deleting ? 'Deleting...' : 'Delete board'}
				</button>
			</div>
			{#if !isOwner}
				<p class="mt-2 text-sm text-slate-300">
					Only the board owner can clear board content or delete this board.
				</p>
			{/if}
		</section>
	</main>
{:else}
	<p class="p-4 text-slate-300">Loading...</p>
{/if}
