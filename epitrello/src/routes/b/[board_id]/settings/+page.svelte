<script lang="ts">
	import UserSearchBar from '../../../user_search_bar.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

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
	let saving = $state(false);
	let deleting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	onMount(() => {
		if (!browser) return;

		const rawUser = localStorage.getItem('user');
		if (!rawUser) {
			goto('/login');
			return;
		}

		let currentUser: { id?: string } | null = null;
		try {
			currentUser = JSON.parse(rawUser);
		} catch {
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
			goto('/login');
			return;
		}

		if (!currentUser?.id) {
			goto('/login');
			return;
		}

		currentUserId = currentUser.id;
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
				body: JSON.stringify({ boardId: data.board.id, name: trimmedName })
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
		if (!currentUserId || deleting) return;

		const confirmDelete = confirm(
			`Permanently delete "${boardName.trim() || data.board.name}" board?`
		);
		if (!confirmDelete) return;

		deleting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch(`/api/boards?id=${encodeURIComponent(data.board.id)}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				errorMessage = 'Board deletion failed.';
				return;
			}

			goto(`/u/${currentUserId}`);
		} catch (err) {
			console.error('Erreur delete board', err);
			errorMessage = 'Network error while deleting.';
		} finally {
			deleting = false;
		}
	}
</script>

{#if ready}
	<UserSearchBar />
	<main
		class="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-6 text-slate-100 sm:px-8 lg:px-12"
	>
		<section
			class="rounded-xl border border-sky-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">
						Board Settings
					</p>
					<h1 class="mt-1 text-2xl font-bold">Board Settings</h1>
					<p class="mt-1 text-sm text-slate-300">
						Basic configuration while multi-user features are not available yet.
					</p>
				</div>

				<a
					href={`/b/${data.board.id}`}
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
						class="rounded-md border border-slate-600/70 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						placeholder="Board name..."
					/>
				</div>

				<button
					type="submit"
					disabled={saving}
					class="w-fit cursor-pointer rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/50 transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
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
			<h2 class="text-lg font-semibold">Information</h2>
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

		<section
			class="mt-5 rounded-xl border border-rose-300/25 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/60 backdrop-blur-sm"
		>
			<h2 class="text-lg font-semibold text-rose-200">Danger zone</h2>
			<p class="mt-1 text-sm text-slate-300">Delete the board and all related lists/cards.</p>
			<button
				type="button"
				class="mt-4 cursor-pointer rounded-md border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={deleting}
				onclick={handleDeleteBoard}
			>
				{deleting ? 'Deleting...' : 'Delete board'}
			</button>
		</section>
	</main>
{:else}
	<p class="p-4 text-slate-300">Loading...</p>
{/if}
