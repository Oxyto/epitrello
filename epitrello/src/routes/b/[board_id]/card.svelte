<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const { card, listIndex, cardIndex } = $props<{
	card: { uuid?: string; id: number; title: string; tags?: string[] };
	listIndex: number;
	cardIndex: number;
	}>();

const dispatch = createEventDispatcher<{
	updateTitle: { listIndex: number; cardIndex: number; title: string };
	deleteCard: { listIndex: number; cardIndex: number };
	addTag: { listIndex: number; cardIndex: number; tag: string };
	moveCard: { listIndex: number; cardIndex: number; direction: number };
	removeTag: { cardId: number; tag: string };
	}>();

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
</script>

<li class="flex flex-col gap-2 rounded bg-sky-600 p-2 text-white shadow shadow-gray-400">
  <div class="mb-2 flex items-center gap-2">
    <input
			type="checkbox"
			class="rounded-4xl mr-2 hover:cursor-pointer focus:outline-0 checked:bg-green-500 transition-all delay-100"
			title="Mark as complete"
		/>

    <input
      class="flex-1 rounded border-0 bg-sky-700 text-sm font-semibold text-white focus:bg-sky-500 focus:outline-none"
      bind:value={title}
      on:blur={handleTitleBlur}
    />

    <button
      type="button"
      class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
      on:click={handleDelete}
    >
      X
    </button>
  </div>

  {#if card.tags && card.tags.length}
    <div class="mb-2 flex flex-wrap gap-1">
      {#each card.tags as tag}
       <span class="inline-flex items-center gap-1 rounded bg-sky-500 px-2 py-0.5 text-xs shadow select-none text-white">
        <span>{tag}</span>
        <button
          type="button"
          class="rounded bg-sky-700 px-1 text-[10px] hover:bg-sky-600"
          on:click={() => handleRemoveTag(tag)}
          title="Remove tag"
        >
          ✕
        </button>
      </span>
      {/each}
    </div>
  {/if}

  <form class="mt-2 flex gap-2" on:submit|preventDefault={handleAddTag}>
    <input
      type="text"
      class="flex-1 rounded-md border-0 bg-sky-700 px-2 py-1 font-mono placeholder:text-gray-400 shadow"
      placeholder="New tag..."
      bind:value={newTag}
    />
    <button
      type="submit"
      class="rounded-md bg-sky-500 px-2 hover:bg-sky-400 shadow hover:cursor-pointer transition-all"
    >
      + Tag
    </button>
  </form>

  <div class="mt-2 flex gap-2">
    <button
      type="button"
      class="rounded-md bg-sky-500 px-2 py-0.5 hover:bg-sky-400 shadow hover:cursor-pointer transition-all"
      on:click={() => handleMove(-1)}
      title="Move left"
    >
      ←
    </button>
    <button
      type="button"
      class="rounded-md bg-sky-500 px-2 py-0.5 hover:bg-sky-400 shadow hover:cursor-pointer transition-all"
      on:click={() => handleMove(1)}
      title="Move right"
    >
      →
    </button>
  </div>
</li>
