<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const { card, listIndex, cardIndex } = $props();

	const dispatch = createEventDispatcher();
	const hasMeta = $derived(
		Boolean(
			(card.tags && card.tags.length) || card.dueDate || (card.assignees && card.assignees.length)
		)
	);

	let suppressClickUntil = 0;

	function handleDelete() {
		dispatch('deleteCard', { listIndex, cardIndex });
	}

	function handleCompletedChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		dispatch('updateCompleted', { listIndex, cardIndex, completed: target.checked });
	}

	function handleDragStart(event: DragEvent) {
		event.stopPropagation();
		suppressClickUntil = Date.now() + 200;
		event.dataTransfer?.setData('text/plain', `${listIndex}:${cardIndex}`);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
		dispatch('dragStart', { listIndex, cardIndex });
	}

	function handleDragEnd(event: DragEvent) {
		event.stopPropagation();
		dispatch('dragEnd');
	}

	function handleDropOnCard(event: DragEvent) {
		event.preventDefault();
		const currentTarget = event.currentTarget as HTMLElement | null;
		const rect = currentTarget?.getBoundingClientRect();
		const dropAfter = rect ? event.clientY > rect.top + rect.height / 2 : false;
		dispatch('dropOnCard', { listIndex, cardIndex, dropAfter });
	}

	function handleDragOverCard(event: DragEvent) {
		event.preventDefault();
		const currentTarget = event.currentTarget as HTMLElement | null;
		const rect = currentTarget?.getBoundingClientRect();
		const dropAfter = rect ? event.clientY > rect.top + rect.height / 2 : false;
		dispatch('dragOverCard', { listIndex, cardIndex, dropAfter });
	}

	function handleOpenEditor() {
		if (Date.now() < suppressClickUntil) {
			return;
		}

		dispatch('openDetails', { listIndex, cardIndex });
	}
</script>

<li
	draggable="true"
	data-card-item="true"
	data-list-index={listIndex}
	data-card-index={cardIndex}
	class="group/card relative flex min-h-14 cursor-pointer flex-col gap-1.5 rounded-lg bg-gradient-to-br from-sky-700 via-sky-600 to-sky-500 p-2.5 text-slate-50 shadow-md shadow-sky-300/30 ring-1 ring-white/20"
	class:justify-center={!hasMeta}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragover={handleDragOverCard}
	ondrop={handleDropOnCard}
>
	<button
		type="button"
		class="absolute inset-0 z-10 cursor-pointer rounded-lg"
		aria-label={`Open details for ${card.title}`}
		onclick={handleOpenEditor}
	></button>

	<div class="group/card-corner absolute right-1.5 top-1.5 z-20 h-7 w-7">
		<button
			type="button"
			title="Delete card"
			class="pointer-events-none absolute right-2 top-2 h-7 w-7 cursor-pointer rounded-full border border-rose-300/20 bg-slate-800/90 text-center text-sm font-bold text-rose-200 opacity-0 shadow-sm shadow-black/30 transition-all group-hover/card-corner:pointer-events-auto group-hover/card-corner:opacity-100 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
			onclick={handleDelete}
		>
			✕
		</button>
	</div>

	<div class="flex items-center gap-1.5 px-1 pr-8" class:mb-1={hasMeta}>
		<span class="relative z-20 flex h-5 items-center">
			<input
				type="checkbox"
				class="mt-1 h-4 w-4 shrink-0 rounded-md border-0 shadow transition-all checked:bg-emerald-500 focus:outline-0"
				title="Mark as complete"
				checked={card.completed}
				onchange={handleCompletedChange}
			/>
		</span>

		<p class="flex-1 px-1 font-mono text-base font-semibold leading-5 text-slate-50">
			{card.title}
		</p>
	</div>

	{#if card.tags && card.tags.length}
		<div class="mb-1 flex flex-wrap gap-1 px-1">
			{#each card.tags as tag}
				<span
					class="inline-flex select-none items-center rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-slate-50 shadow-sm"
				>
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	{#if card.dueDate || (card.assignees && card.assignees.length)}
		<div class="flex flex-wrap items-center gap-1 px-1 text-[11px]">
			{#if card.dueDate}
				<span class="rounded-md bg-black/20 px-2 py-0.5 text-sky-100">Due {card.dueDate}</span>
			{/if}
			{#if card.assignees && card.assignees.length}
				{#each card.assignees as assignee}
					<span class="rounded-md bg-white/15 px-2 py-0.5 text-slate-100">@{assignee}</span>
				{/each}
			{/if}
		</div>
	{/if}
</li>
