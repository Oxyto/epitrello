<script lang="ts">
	import EpitrelloLogo from '$lib/assets/logos/epitrello-logo.png';
	import LogoutButton from '$lib/LogoutButton.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';

	type SessionUser = {
		id: string;
	};

	let currentUserId = $state('');
	let isCreatePanelOpen = $state(false);
	let createBoardName = $state('');
	let createBoardError = $state('');
	let isCreatingBoard = $state(false);
	let createNameInput = $state<HTMLInputElement | null>(null);

	function readCurrentUser(): SessionUser | null {
		if (!browser) return null;

		const raw = localStorage.getItem('user');
		if (!raw) {
			return null;
		}

		let parsedUser: { id?: string } | null = null;
		try {
			parsedUser = JSON.parse(raw);
		} catch {
			return null;
		}

		if (!parsedUser?.id) {
			return null;
		}

		return { id: parsedUser.id };
	}

	function getCurrentUserOrRedirect(): SessionUser | null {
		const user = readCurrentUser();
		if (!user) {
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
			goto('/login');
			return null;
		}

		return user;
	}

	onMount(() => {
		const user = getCurrentUserOrRedirect();
		if (!user) {
			return;
		}
		currentUserId = user.id;
	});

	async function openCreatePanel() {
		const user = getCurrentUserOrRedirect();
		if (!user) return;

		currentUserId = user.id;
		createBoardName = '';
		createBoardError = '';
		isCreatePanelOpen = true;
		await tick();
		createNameInput?.focus();
	}

	function closeCreatePanel() {
		if (isCreatingBoard) return;
		isCreatePanelOpen = false;
		createBoardError = '';
	}

	function handleCreatePanelBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeCreatePanel();
		}
	}

	function handleCreatePanelBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeCreatePanel();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isCreatePanelOpen) {
			closeCreatePanel();
		}
	}

	function applyTemplateName(name: string) {
		createBoardName = name;
		createBoardError = '';
	}

	async function handleCreateSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isCreatingBoard) return;

		const user = getCurrentUserOrRedirect();
		if (!user) return;

		currentUserId = user.id;
		const name = createBoardName.trim();

		if (!name) {
			createBoardError = 'Board name is required.';
			return;
		}

		if (name.length > 80) {
			createBoardError = 'Board name must be 80 characters maximum.';
			return;
		}

		isCreatingBoard = true;
		createBoardError = '';

		const res = await fetch('/api/boards', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				ownerId: currentUserId,
				name
			})
		});

		if (!res.ok) {
			console.error('Board creation error', await res.text());
			createBoardError = 'Unable to create board right now.';
			isCreatingBoard = false;
			return;
		}

		const body = await res.json();
		console.log('Board created by /api/boards:', body);

		const uuid = body.uuid;
		if (!uuid) {
			createBoardError = 'Invalid server response (missing uuid).';
			isCreatingBoard = false;
			return;
		}

		isCreatingBoard = false;
		isCreatePanelOpen = false;
		goto(`/b/${uuid}`);
	}

	function handleProfileClick() {
		const user = getCurrentUserOrRedirect();
		if (!user?.id) {
			return;
		}

		goto(`/u/${user.id}#profile`);
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
	id="user-search-bar"
	class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sky-300/20 bg-slate-900/85 p-4 shadow-lg shadow-slate-950/50 backdrop-blur-sm"
>
	<a
		href={currentUserId ? `/u/${currentUserId}` : '/login'}
		class="flex flex-row items-center gap-2 select-none"
		draggable="false"
		><img src={EpitrelloLogo} alt="EpiTrello Logo" class="w-12" draggable="false" />
		<p class="text-xl font-semibold tracking-wide text-slate-100">EpiTrello</p></a
	>
	<input
		type="text"
		placeholder="Search"
		class="flex-1 rounded-md border border-slate-600/60 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 shadow-sm shadow-slate-950/40 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
	/>
	<button
		type="button"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-600/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-500 hover:shadow-md hover:shadow-sky-900/70"
		onclick={openCreatePanel}>Create</button
	>
	<a
		href="#notifications"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-700/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-900/70"
		><img src="/path/to/notification/icon.svg" alt="Notifications" /></a
	>
	<button
		type="button"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-700/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-900/70"
		onclick={handleProfileClick}>Profile</button
	>
	<LogoutButton />
</div>

{#if isCreatePanelOpen}
	<div
		class="fixed inset-0 z-50 flex bg-slate-950/70"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-board-title"
		tabindex="0"
		onclick={handleCreatePanelBackdropClick}
		onkeydown={handleCreatePanelBackdropKeydown}
	>
		<aside
			class="ml-auto flex h-full w-full max-w-md flex-col border-l border-sky-300/25 bg-slate-900/95 p-6 text-slate-100 shadow-xl shadow-slate-950/80"
		>
			<div class="mb-6 flex items-start justify-between gap-3">
				<div>
					<p class="select-none text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
						Workspace
					</p>
					<h2 id="create-board-title" class="mt-1 select-none text-2xl font-bold">
						Create a board
					</h2>
					<p class="mt-2 select-none text-sm text-slate-300">
						Give it a clear name, you can rename it later.
					</p>
				</div>
				<button
					type="button"
					class="h-9 w-9 cursor-pointer rounded-md border border-slate-500/70 bg-slate-800/80 text-lg text-slate-300 transition-colors hover:bg-slate-700/90 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
					onclick={closeCreatePanel}
					disabled={isCreatingBoard}
					aria-label="Close board creation panel"
				>
					x
				</button>
			</div>

			<form class="flex flex-1 flex-col" onsubmit={handleCreateSubmit}>
				<label for="board-name" class="mb-2 text-sm font-semibold text-sky-100">Board name</label>
				<input
					id="board-name"
					type="text"
					bind:value={createBoardName}
					bind:this={createNameInput}
					placeholder="e.g. Sprint 12 - Backlog"
					maxlength="80"
					class="rounded-lg border border-slate-600/60 bg-slate-800/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
					disabled={isCreatingBoard}
					required
				/>
				<div class="mt-2 flex items-center justify-between text-xs text-slate-400">
					<span class="select-none">Name visible to all board members.</span>
					<span>{createBoardName.trim().length}/80</span>
				</div>

				<div class="mt-6">
					<p
						class="mb-2 select-none text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
					>
						Quick templates
					</p>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="cursor-pointer rounded-md border border-sky-300/25 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700"
							onclick={() => applyTemplateName('Product Roadmap')}
							disabled={isCreatingBoard}
						>
							Product Roadmap
						</button>
						<button
							type="button"
							class="cursor-pointer rounded-md border border-sky-300/25 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700"
							onclick={() => applyTemplateName('Sprint Planning')}
							disabled={isCreatingBoard}
						>
							Sprint Planning
						</button>
						<button
							type="button"
							class="cursor-pointer rounded-md border border-sky-300/25 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700"
							onclick={() => applyTemplateName('Personal Project')}
							disabled={isCreatingBoard}
						>
							Personal Project
						</button>
					</div>
				</div>

				{#if createBoardError}
					<p
						class="mt-4 rounded-md border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
					>
						{createBoardError}
					</p>
				{/if}

				<div class="mt-auto flex justify-end gap-3 pt-8">
					<button
						type="button"
						class="cursor-pointer rounded-md border border-slate-500/60 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={closeCreatePanel}
						disabled={isCreatingBoard}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-600/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isCreatingBoard}
					>
						{isCreatingBoard ? 'Creating...' : 'Create board'}
					</button>
				</div>
			</form>
		</aside>
	</div>
{/if}
