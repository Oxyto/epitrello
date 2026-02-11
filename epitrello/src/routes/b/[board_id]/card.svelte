<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const { card, listIndex, cardIndex } = $props();

	const dispatch = createEventDispatcher();

	let title = card.title;
	let newTag = '';

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

</script>

<li class="flex flex-col gap-2 rounded-md bg-sky-600 p-3 text-gray-100 shadow shadow-gray-400">
	<div class="mb-2 flex items-center gap-2 pr-2 pl-2">
		<input
			type="checkbox"
			class="scale-150 rounded border-0 shadow transition-all delay-100 checked:bg-green-500 hover:cursor-pointer focus:outline-0"
			title="Mark as complete"
		/>

		<input
			class="flex-1 rounded border-0 bg-sky-600 font-mono text-xl font-semibold text-gray-100 focus:bg-sky-500 focus:outline-none"
			bind:value={title}
			on:blur={handleTitleBlur}
		/>
		 <button
			type="button"
			class="px-2 py-1 text-xs rounded-md bg-sky-500 hover:bg-sky-400 shadow transition-all hover:cursor-pointer"
			on:click={handleOpenDetails}
		>
			Details
		</button>
		<button
			type="button"
			class="w-8 pb-1 font-mono text-lg font-bold text-gray-100 transition-all hover:text-red-500 hover:cursor-pointer"
			on:click={handleDelete}
		>
			[X]
		</button>
	</div>

	{#if card.tags && card.tags.length}
		<div class="mb-2 flex flex-wrap gap-1">
			{#each card.tags as tag}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-sky-500 px-2 py-0.5  text-gray-100 shadow select-none font-semibold"
				>
					<span>{tag}</span>
					<button
						type="button"
						class="rounded bg-sky-700 px-1 text-[10px] hover:bg-red-500 hover:cursor-pointer transition-all"
						on:click={() => handleRemoveTag(tag)}
						title="Remove tag"
					>
						X
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<form class="mt-2 flex gap-2" on:submit|preventDefault={handleAddTag}>
		<input
			type="text"
			class="flex-1 rounded-md border-0 bg-sky-700 px-2 py-1 font-mono shadow placeholder:text-gray-300"
			placeholder="New tag..."
			bind:value={newTag}
		/>
		<button
			type="submit"
			class="rounded-md bg-sky-500 px-2 shadow transition-all hover:cursor-pointer hover:bg-sky-400"
		>
			+ Tag
		</button>
	</form>

	<div class="mt-2 flex gap-2">
		<button
			type="button"
			class="font-mono text-2xl rounded-md bg-sky-500 px-3 py-0.5 shadow transition-all hover:cursor-pointer hover:bg-sky-400"
			on:click={() => handleMove(-1)}
			title="Move left"
		>
			←
		</button>
		<button
			type="button"
			class="font-mono text-2xl rounded-md bg-sky-500 px-3 py-0.5 shadow transition-all hover:cursor-pointer hover:bg-sky-400"
			on:click={() => handleMove(1)}
			title="Move right"
		>
			→
		</button>
	</div>
</li>
