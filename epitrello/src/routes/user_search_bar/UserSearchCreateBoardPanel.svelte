<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createEventDispatcher, tick } from 'svelte';
	import type { BoardTemplateId, SessionUser } from './user-search.types';

	const { getCurrentUserOrRedirect, closeSignal = 0 } = $props<{
		getCurrentUserOrRedirect: () => SessionUser | null;
		closeSignal?: number;
	}>();

	const dispatch = createEventDispatcher<{ open: undefined }>();

	let isCreatePanelOpen = $state(false);
	let createBoardName = $state('');
	let createBoardTemplateId = $state<BoardTemplateId | ''>('');
	let createBoardError = $state('');
	let isCreatingBoard = $state(false);
	let createNameInput = $state<HTMLInputElement | null>(null);
	let lastCloseSignal = $state(0);

	$effect(() => {
		if (closeSignal === lastCloseSignal) {
			return;
		}

		lastCloseSignal = closeSignal;
		if (isCreatePanelOpen) {
			closeCreatePanel();
		}
	});

	async function openCreatePanel() {
		const user = getCurrentUserOrRedirect();
		if (!user) return;

		dispatch('open');
		createBoardName = '';
		createBoardError = '';
		isCreatePanelOpen = true;
		await tick();
		createNameInput?.focus();
	}

	function closeCreatePanel() {
		if (isCreatingBoard) return;
		isCreatePanelOpen = false;
		createBoardTemplateId = '';
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
			event.preventDefault();
			closeCreatePanel();
		}
	}

	function applyTemplate(templateId: BoardTemplateId, name: string) {
		createBoardTemplateId = templateId;
		createBoardName = name;
		createBoardError = '';
	}

	async function handleCreateSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isCreatingBoard) return;

		const user = getCurrentUserOrRedirect();
		if (!user) return;

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
				ownerId: user.id,
				name,
				templateId: createBoardTemplateId || undefined
			})
		});

		if (!res.ok) {
			console.error('Board creation error', await res.text());
			createBoardError = 'Unable to create board right now.';
			isCreatingBoard = false;
			return;
		}

		const body = await res.json();
		const uuid = body.uuid;
		if (!uuid) {
			createBoardError = 'Invalid server response (missing uuid).';
			isCreatingBoard = false;
			return;
		}

		isCreatingBoard = false;
		isCreatePanelOpen = false;
		createBoardTemplateId = '';
		goto(resolve(`/b/${uuid}`));
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<button
	type="button"
	class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-600/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-500 hover:shadow-md hover:shadow-sky-900/70"
	onclick={() => void openCreatePanel()}
>
	Create
</button>

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
							class={`cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
								createBoardTemplateId === 'product_roadmap'
									? 'border-sky-200/50 bg-sky-500/25 text-sky-100'
									: 'border-sky-300/25 bg-slate-800/80 text-slate-100 hover:bg-slate-700'
							}`}
							onclick={() => applyTemplate('product_roadmap', 'Product Roadmap')}
							disabled={isCreatingBoard}
						>
							Product Roadmap
						</button>
						<button
							type="button"
							class={`cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
								createBoardTemplateId === 'sprint_planning'
									? 'border-sky-200/50 bg-sky-500/25 text-sky-100'
									: 'border-sky-300/25 bg-slate-800/80 text-slate-100 hover:bg-slate-700'
							}`}
							onclick={() => applyTemplate('sprint_planning', 'Sprint Planning')}
							disabled={isCreatingBoard}
						>
							Sprint Planning
						</button>
						<button
							type="button"
							class={`cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
								createBoardTemplateId === 'personal_project'
									? 'border-sky-200/50 bg-sky-500/25 text-sky-100'
									: 'border-sky-300/25 bg-slate-800/80 text-slate-100 hover:bg-slate-700'
							}`}
							onclick={() => applyTemplate('personal_project', 'Personal Project')}
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
