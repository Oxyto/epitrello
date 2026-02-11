<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type UiCard = {
    id: number;
    uuid?: string;
    title: string;
    tags?: string[];
  };

  const { card, listName } = $props<{
    card: UiCard;
    listName: string;
  }>();

  const dispatch = createEventDispatcher<{
    close: {};
  }>();

  function close() {
    dispatch('close', {});
  }
</script>

{#if card}

  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    on:click={close}
  >
    <div
      class="flex max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-gray-900 text-gray-100 shadow-xl"
      on:click|stopPropagation
    >
      <div class="flex-1 p-6 space-y-4 overflow-y-auto">

        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs text-gray-400 mb-1">
              in list <span class="underline">{listName}</span>
            </div>
            <h2 class="text-2xl font-bold">{card.title}</h2>
          </div>

          <button
            type="button"
            class="text-gray-400 hover:text-gray-200 text-lg"
            on:click={close}
          >
            ✕
          </button>
        </div>

        <section class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-300">Labels</h3>

          {#if card.tags && card.tags.length}
            <div class="flex flex-wrap gap-2">
              {#each card.tags as tag}
                <span class="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-xs">
                  {tag}
                </span>
              {/each}
            </div>
          {:else}
            <p class="text-xs text-gray-500">No labels yet.</p>
          {/if}
        </section>

        <section class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-300">Description</h3>
          <p class="text-xs text-gray-500">
            Description and other details will come in a next step.
          </p>
        </section>
      </div>
    </div>
  </div>
{/if}
