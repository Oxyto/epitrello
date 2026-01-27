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

<li class="rounded bg-gray-700 p-3 shadow">
  <div class="mb-2 flex items-center gap-2">
    <input type="checkbox" class="h-4 w-4" />

    <input
      class="flex-1 rounded border-0 bg-gray-700 text-sm font-semibold text-white focus:bg-gray-600 focus:outline-none"
      bind:value={title}
      on:blur={handleTitleBlur}
    />

    <button
      type="button"
      class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
      on:click={handleDelete}
    >
      Delete
    </button>
  </div>

  {#if card.tags && card.tags.length}
    <div class="mb-2 flex flex-wrap gap-1">
      {#each card.tags as tag}
       <span class="inline-flex items-center gap-1 rounded bg-gray-500 px-2 py-0.5 text-xs text-white">
        <span>{tag}</span>
        <button
          type="button"
          class="rounded bg-gray-700 px-1 text-[10px] hover:bg-gray-600"
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
      class="flex-1 rounded border-0 bg-gray-600 p-1 text-xs text-white focus:outline-none"
      placeholder="New tag..."
      bind:value={newTag}
    />
    <button
      type="submit"
      class="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-400"
    >
      + Tag
    </button>
  </form>

  <div class="mt-2 flex gap-2">
    <button
      type="button"
      class="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-400"
      on:click={() => handleMove(-1)}
      title="Move left"
    >
      ←
    </button>
    <button
      type="button"
      class="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-400"
      on:click={() => handleMove(1)}
      title="Move right"
    >
      →
    </button>
  </div>
</li>
