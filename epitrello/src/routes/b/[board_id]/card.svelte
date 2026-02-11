<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const { card, listIndex, cardIndex } = $props();

  const dispatch = createEventDispatcher<{
    updateTitle: { listIndex: number; cardIndex: number; title: string };
    deleteCard: { listIndex: number; cardIndex: number };
    moveCard: { listIndex: number; cardIndex: number; direction: number };
    openDetails: { listIndex: number; cardIndex: number };
  }>();

  let title = card.title;

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

  function handleOpenDetails() {
    dispatch('openDetails', { listIndex, cardIndex });
  }
</script>

<li
  class="flex flex-col gap-2 rounded-md bg-sky-600 p-3 text-gray-100 shadow shadow-gray-400 hover:bg-sky-500 hover:cursor-pointer transition-colors"
  on:click={handleOpenDetails}
>
  <div class="mb-2 flex items-center gap-2 pr-2 pl-2">
    <input
      type="checkbox"
      class="scale-150 rounded border-0 shadow transition-all delay-100 checked:bg-green-500 hover:cursor-pointer focus:outline-0"
      title="Mark as complete"
      on:click|stopPropagation
    />

    <input
      class="flex-1 rounded border-0 bg-sky-600 font-mono text-xl font-semibold text-gray-100 focus:bg-sky-500 focus:outline-none"
      bind:value={title}
      on:blur={handleTitleBlur}
      on:click|stopPropagation
    />

    <button
      type="button"
      class="w-8 pb-1 font-mono text-lg font-bold text-gray-100 transition-all hover:text-red-500 hover:cursor-pointer"
      on:click|stopPropagation={handleDelete}
    >
      [X]
    </button>
  </div>

  <div class="mt-2 flex gap-2">
    <button
      type="button"
      class="font-mono text-2xl rounded-md bg-sky-500 px-3 py-0.5 shadow transition-all hover:cursor-pointer hover:bg-sky-400"
      on:click|stopPropagation={() => handleMove(-1)}
      title="Move left"
    >
      ←
    </button>
    <button
      type="button"
      class="font-mono text-2xl rounded-md bg-sky-500 px-3 py-0.5 shadow transition-all hover:cursor-pointer hover:bg-sky-400"
      on:click|stopPropagation={() => handleMove(1)}
      title="Move right"
    >
      →
    </button>
  </div>
</li>
