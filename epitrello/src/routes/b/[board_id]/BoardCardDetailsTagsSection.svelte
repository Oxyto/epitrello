<script lang="ts">
	import type { UiCard } from './board.types';

	const { selectedCard, canEdit, currentUserId } = $props<{
		selectedCard: UiCard;
		canEdit: boolean;
		currentUserId: string;
	}>();

	let editorNewTag = $state('');
	let initializedForCard = $state<string | null>(null);

	const selectedCardKey = $derived(
		selectedCard.uuid ? `uuid:${selectedCard.uuid}` : `local:${selectedCard.id}`
	);

	$effect(() => {
		if (selectedCardKey === initializedForCard) {
			return;
		}

		initializedForCard = selectedCardKey;
		editorNewTag = '';
	});

	async function addEditorTag() {
		if (!canEdit || !selectedCard.uuid) return;
		const tag = editorNewTag.trim();
		if (!tag) return;

		if (
			selectedCard.tags.some(
				(existingTag: string) => existingTag.toLowerCase() === tag.toLowerCase()
			)
		) {
			editorNewTag = '';
			return;
		}

		selectedCard.tags = [...selectedCard.tags, tag];
		editorNewTag = '';

		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: selectedCard.uuid, name: tag, userId: currentUserId })
			});

			if (!res.ok) {
				selectedCard.tags = selectedCard.tags.filter((existingTag: string) => existingTag !== tag);
				console.error('Erreur API add tag', await res.text());
			}
		} catch (err) {
			selectedCard.tags = selectedCard.tags.filter((existingTag: string) => existingTag !== tag);
			console.error('Erreur réseau add tag', err);
		}
	}

	async function removeEditorTag(tag: string) {
		if (!canEdit || !selectedCard.uuid) return;

		selectedCard.tags = selectedCard.tags.filter((entry: string) => entry !== tag);

		try {
			const res = await fetch('/api/tags', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: selectedCard.uuid, name: tag, userId: currentUserId })
			});

			if (!res.ok) {
				console.error('Erreur API delete tag', await res.text());
			}
		} catch (err) {
			console.error('Erreur réseau API delete tag', err);
		}
	}
</script>

<section class="md:col-span-2">
	<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">Tags</h3>
	<div class="mb-2 flex flex-wrap gap-1.5">
		{#if selectedCard.tags?.length}
			{#each selectedCard.tags as tag (tag)}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-xs text-sky-100 ring-1 ring-sky-300/30"
				>
					{tag}
					{#if canEdit}
						<button
							type="button"
							class="cursor-pointer rounded px-1 text-sky-200 shadow-sm shadow-slate-950/60 transition-all hover:bg-rose-500/25 hover:text-rose-200 active:translate-y-px"
							onclick={() => void removeEditorTag(tag)}
							title="Remove tag"
						>
							✕
						</button>
					{/if}
				</span>
			{/each}
		{:else}
			<p class="text-xs text-slate-400">No tags yet.</p>
		{/if}
	</div>
	<form
		class="flex gap-1.5"
		onsubmit={(event) => {
			event.preventDefault();
			void addEditorTag();
		}}
	>
		<input
			type="text"
			class="w-full rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
			placeholder="Add tag..."
			disabled={!canEdit}
			bind:value={editorNewTag}
		/>
		<button
			type="submit"
			disabled={!canEdit}
			class="h-8 w-16 min-w-16 shrink-0 cursor-pointer whitespace-nowrap rounded-md bg-sky-600 px-2 py-1 text-center text-xs font-semibold text-white shadow-md shadow-sky-900/50 transition-all hover:bg-sky-500 active:translate-y-px"
		>
			+ Add
		</button>
	</form>
</section>
