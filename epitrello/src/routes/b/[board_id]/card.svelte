<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let card: {
		id: number;
		title: string;
		tags?: string[];
	};

	export let listIndex: number;
	export let cardIndex: number;

	const dispatch = createEventDispatcher();

	let editing = false;
	let editedTitle = card.title;
	let newTag = '';

	function startEdit() {
		editing = true;
		editedTitle = card.title;
	}

	function saveTitle() {
		const title = editedTitle.trim();
		if (!title) return;
		dispatch('updateTitle', { listIndex, cardIndex, title });
		editing = false;
	}

	function submitTag() {
		const tag = newTag.trim();
		if (!tag) return;
		dispatch('addTag', { listIndex, cardIndex, tag });
		newTag = '';
	}

	function moveLeft() {
		dispatch('moveCard', { listIndex, cardIndex, direction: -1 });
	}

	function moveRight() {
		dispatch('moveCard', { listIndex, cardIndex, direction: 1 });
	}

	function deleteCard() {
		dispatch('deleteCard', { listIndex, cardIndex });
	}

</script>

<li class="flex flex-col gap-2 rounded bg-gray-700 p-2" draggable="false">
	<div class="flex items-center gap-2">
		<input
			type="checkbox"
			class="rounded-4xl mr-2 hover:cursor-pointer"
			title="Mark as complete"
		/>

		{#if editing}
			<input
				class="flex-1 rounded border-0 bg-gray-600 px-2 py-1 text-sm"
				bind:value={editedTitle}
				on:keydown={(e) => e.key === 'Enter' && saveTitle()}
				on:blur={saveTitle}
				autofocus
			/>
		{:else}
			<a
				class="flex-1 select-none rounded border-0 bg-gray-700 px-2 py-1 text-sm hover:bg-gray-600"
				href={`#c-${card.id}`}
				on:dblclick={startEdit}
				title="Double-click pour éditer"
			>
				{card.title}
			</a>
		{/if}
	</div>

	{#if card.tags && card.tags.length}
		<div class="flex flex-wrap gap-1">
			{#each card.tags as tag}
				<span class="rounded-full bg-gray-500 px-2 py-0.5 text-xs">
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<div class="mt-1 flex gap-2">
		<input
			type="text"
			class="flex-1 rounded border-0 bg-gray-600 px-2 py-1 text-xs"
			placeholder="New tag..."
			bind:value={newTag}
			on:keydown={(e) => e.key === 'Enter' && submitTag()}
		/>
		<button
			class="rounded bg-gray-600 px-2 text-xs hover:bg-gray-500"
			type="button"
			on:click={submitTag}
		>
			+ Tag
		</button>
	</div>

	<div class="mt-1 flex items-center justify-between gap-1 text-xs text-gray-300">
		<button
			type="button"
			class="rounded bg-red-600 px-2 py-0.5 hover:bg-red-500"
			on:click={deleteCard}
		>
			Delete
		</button>

		<div class="flex gap-1">
			<button
				type="button"
				class="rounded bg-gray-600 px-2 py-0.5 hover:bg-gray-500"
				on:click={moveLeft}
			>
				←
			</button>
			<button
				type="button"
				class="rounded bg-gray-600 px-2 py-0.5 hover:bg-gray-500"
				on:click={moveRight}
			>
				→
			</button>
		</div>
	</div>
</li>
