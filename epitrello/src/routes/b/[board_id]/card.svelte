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

<li class="flex flex-col gap-2 rounded bg-sky-600 p-2 text-white shadow shadow-gray-400" draggable="true">
	<div class="flex items-center gap-2">
		<input
			type="checkbox"
			class="rounded-4xl mr-2 hover:cursor-pointer focus:outline-0 checked:bg-green-500 transition-all delay-100"
			title="Mark as complete"
		/>

		{#if editing}
			<input
				class="flex-1 rounded-md border-0 bg-sky-400 px-2 py-1"
				bind:value={editedTitle}
				on:keydown={(e) => e.key === 'Enter' && saveTitle()}
				on:blur={saveTitle}
			/>
		{:else}
			<a
				class="flex-1 select-none rounded border-0 bg-sky-600 px-2 py-1 hover:bg-sky-500 font-mono transition-all"
				href={`#c-${card.id}`}
				on:dblclick={startEdit}
				title="Double-click pour éditer"
			>
				{card.title}
			</a>
		{/if}
		<button
			type="button"
			class="rounded-md px-2 py-0.5 hover:text-red-500 hover:cursor-pointer transition-all"
			on:click={deleteCard}
		>
			X
		</button>
	</div>

	{#if card.tags && card.tags.length}
		<div class="flex flex-wrap gap-1">
			{#each card.tags as tag}
				<span class="rounded-full bg-sky-500 px-2 py-0.5 text-xs shadow select-none">
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<div class="mt-1 flex gap-2">
		<input
			type="text"
			class="flex-1 rounded-md border-0 bg-sky-700 px-2 py-1 font-mono placeholder:text-gray-400 shadow"
			placeholder="New tag..."
			bind:value={newTag}
			on:keydown={(e) => e.key === 'Enter' && submitTag()}
		/>
		<button
			class="rounded-md bg-sky-500 px-2 hover:bg-sky-400 shadow hover:cursor-pointer transition-all"
			type="button"
			on:click={submitTag}
		>
			+ Tag
		</button>
	</div>

	<div class="mt-1 flex items-center justify-between gap-1 text-gray-100 ">
		<div class="flex gap-1">
			<button
				type="button"
				class="rounded-md bg-sky-500 px-2 py-0.5 hover:bg-sky-400 shadow hover:cursor-pointer transition-all"
				on:click={moveLeft}
			>
				←
			</button>
			<button
				type="button"
				class="rounded-md bg-sky-500 px-2 py-0.5 hover:bg-sky-400 shadow hover:cursor-pointer transition-all"
				on:click={moveRight}
			>
				→
			</button>
		</div>
	</div>
</li>
