<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const { card, listIndex, cardIndex } = $props();

	const dispatch = createEventDispatcher();

	let title = $state(card.title);
	let newTag = $state('');

	function handleTitleBlur() {
		const t = title.trim();
		if (!t || t === card.title) return;

		dispatch('updateTitle', { listIndex, cardIndex, title: t });
	}

	function handleDelete() {
		dispatch('deleteCard', { listIndex, cardIndex });
	}

	function handleMove(direction: number) {
		dispatch('moveCard', { listIndex, cardIndex, direction });
	}

	function handleCompletedChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		dispatch('updateCompleted', { listIndex, cardIndex, completed: target.checked });
	}

	function handleRemoveTag(tag: string) {
		dispatch('removeTag', { cardId: card.id, tag });
	}

	function handleAddTag() {
		const t = newTag.trim();
		if (!t) return;

		dispatch('addTag', { listIndex, cardIndex, tag: t });
		newTag = '';
	}
	function handleOpenDetails() {
		dispatch('openDetails', { listIndex, cardIndex });
	}

	function handleDragStart(event: DragEvent) {
		event.stopPropagation();
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
</script>

<li
	draggable="true"
	class="group/card relative flex flex-col gap-1.5 rounded-lg bg-gradient-to-br from-sky-700 via-sky-600 to-sky-500 p-2.5 text-slate-50 shadow-md shadow-sky-300/30 ring-1 ring-white/20"
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
	on:dragover|preventDefault|stopPropagation={handleDragOverCard}
	on:drop|preventDefault|stopPropagation={handleDropOnCard}
>
	<div class="absolute right-1 top-1 h-9 w-9 rounded-tr-lg group/card-corner">
		<button
			type="button"
			title="Delete card"
			class="pointer-events-none absolute right-0 top-0 h-7 w-7 rounded-full border border-rose-300/20 bg-slate-800/90 text-center text-sm font-bold text-rose-200 opacity-0 shadow-sm shadow-black/30 transition-all group-hover/card-corner:pointer-events-auto group-hover/card-corner:opacity-100 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
			on:click={handleDelete}
		>
			✕
		</button>
	</div>

	<div class="mb-1 flex items-center gap-1.5 px-1 pr-7">
		<input
			type="checkbox"
			class="scale-125 rounded border-0 shadow transition-all checked:bg-emerald-500 focus:outline-0"
			title="Mark as complete"
			checked={card.completed}
			on:change={handleCompletedChange}
		/>

		<input
			class="flex-1 rounded-md border-0 bg-transparent font-mono text-base font-semibold text-slate-50 focus:bg-white/10 focus:outline-none"
			bind:value={title}
			on:blur={handleTitleBlur}
			draggable="false"
		/>
		<button
			type="button"
			class="rounded-md bg-white/20 px-2 py-0.5 text-[11px] shadow transition-colors hover:bg-white/30"
			on:click={handleOpenDetails}
		>
			Details
		</button>
	</div>

	{#if card.tags && card.tags.length}
		<div class="mb-1 flex flex-wrap gap-1">
			{#each card.tags as tag}
				<span
					class="inline-flex select-none items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-slate-50 shadow-sm"
				>
					<span>{tag}</span>
					<button
						type="button"
						class="rounded bg-white/20 px-1 text-[10px] transition-colors hover:bg-rose-400/80"
						on:click={() => handleRemoveTag(tag)}
						title="Remove tag"
					>
						X
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<form class="mt-1.5 flex gap-1.5" on:submit|preventDefault={handleAddTag}>
		<input
			type="text"
			class="flex-1 rounded-md border-0 bg-slate-900/25 px-2 py-1 font-mono text-sm shadow-sm placeholder:text-slate-200/80"
			placeholder="New tag..."
			bind:value={newTag}
		/>
		<button
			type="submit"
			class="rounded-md bg-white/20 px-2 text-sm shadow-sm transition-colors hover:bg-white/30"
		>
			+ Tag
		</button>
	</form>

	<div class="mt-1.5 flex gap-1.5">
		<button
			type="button"
			class="rounded-md bg-white/20 px-2.5 py-0.5 font-mono text-xl shadow-sm transition-colors hover:bg-white/30"
			on:click={() => handleMove(-1)}
			title="Move left"
		>
			←
		</button>
		<button
			type="button"
			class="rounded-md bg-white/20 px-2.5 py-0.5 font-mono text-xl shadow-sm transition-colors hover:bg-white/30"
			on:click={() => handleMove(1)}
			title="Move right"
		>
			→
		</button>
	</div>
</li>
