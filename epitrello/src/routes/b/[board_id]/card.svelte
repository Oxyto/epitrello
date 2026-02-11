<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const { card, listIndex, cardIndex } = $props();

	const dispatch = createEventDispatcher();

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

	function handleDropOnCard() {
		dispatch('dropOnCard', { listIndex, cardIndex });
	}

	function handleDragOverCard() {
		dispatch('dragOverCard', { listIndex, cardIndex });
	}

	function handleOpenEditor(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, button, textarea, select, a, [contenteditable="true"]')) {
			return;
		}

		if (Date.now() < suppressClickUntil) {
			return;
		}

		dispatch('openDetails', { listIndex, cardIndex });
	}
</script>

<li
	draggable="true"
	class="group/card relative flex cursor-pointer flex-col gap-1.5 rounded-lg bg-gradient-to-br from-sky-700 via-sky-600 to-sky-500 p-2.5 text-slate-50 shadow-md shadow-sky-300/30 ring-1 ring-white/20"
	on:click={handleOpenEditor}
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
	on:dragover|preventDefault|stopPropagation={handleDragOverCard}
	on:drop|preventDefault|stopPropagation={handleDropOnCard}
>
	<div class="group/card-corner absolute right-1.5 top-1.5 h-7 w-7">
		<button
			type="button"
			title="Delete card"
			class="pointer-events-none absolute right-0 top-0 h-7 w-7 cursor-pointer rounded-full border border-rose-300/20 bg-slate-800/90 text-center text-sm font-bold text-rose-200 opacity-0 shadow-sm shadow-black/30 transition-all group-hover/card-corner:pointer-events-auto group-hover/card-corner:opacity-100 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
			on:click={handleDelete}
		>
			✕
		</button>
	</div>

	<div class="mb-1 flex items-center gap-1.5 px-1 pr-8">
		<input
			type="checkbox"
			class="scale-125 rounded border-0 shadow transition-all checked:bg-emerald-500 focus:outline-0"
			title="Mark as complete"
			checked={card.completed}
			on:change={handleCompletedChange}
		/>

		<p class="flex-1 px-1 font-mono text-base font-semibold text-slate-50">{card.title}</p>
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
