<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BoardCardDetailsAssigneesSection from './BoardCardDetailsAssigneesSection.svelte';
	import BoardCardDetailsDueDateSection from './BoardCardDetailsDueDateSection.svelte';
	import BoardCardDetailsTagsSection from './BoardCardDetailsTagsSection.svelte';
	import type { BoardMember, UiCard } from './board.types';

	let {
		selectedCard,
		selectedListName,
		boardMembers,
		currentUserId,
		canEdit
	}: {
		selectedCard: UiCard | null;
		selectedListName: string | null;
		boardMembers: BoardMember[];
		currentUserId: string;
		canEdit: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		close: undefined;
		delete: undefined;
	}>();

	let editorDescription = $state('');
	let initializedForCard = $state<string | null>(null);

	const selectedCardKey = $derived(
		selectedCard
			? selectedCard.uuid
				? `uuid:${selectedCard.uuid}`
				: `local:${selectedCard.id}`
			: null
	);

	$effect(() => {
		if (selectedCardKey === initializedForCard) {
			return;
		}

		initializedForCard = selectedCardKey;
		if (!selectedCard) {
			editorDescription = '';
			return;
		}

		editorDescription = selectedCard.description ?? '';
	});

	function closeDetails() {
		dispatch('close');
	}

	async function persistCardFields(cardUuid: string | undefined, fields: Record<string, unknown>) {
		if (!cardUuid || !canEdit) {
			return;
		}

		try {
			await fetch('/api/cards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardId: cardUuid,
					userId: currentUserId,
					...fields
				})
			});
		} catch (err) {
			console.error('Erreur update card fields', err);
		}
	}

	function handleEditorTitleInput(event: Event) {
		if (!canEdit || !selectedCard) return;
		const target = event.currentTarget as HTMLInputElement;
		selectedCard.title = target.value;
	}

	async function handleEditorTitleBlur() {
		if (!canEdit || !selectedCard) return;

		const normalizedTitle = selectedCard.title.trim();
		if (!normalizedTitle) return;

		selectedCard.title = normalizedTitle;
		await persistCardFields(selectedCard.uuid, { name: normalizedTitle });
	}

	function handleEditorDescriptionInput(event: Event) {
		if (!canEdit || !selectedCard) return;
		const target = event.currentTarget as HTMLTextAreaElement;
		editorDescription = target.value;
		selectedCard.description = target.value;
	}

	async function handleEditorDescriptionBlur() {
		if (!canEdit || !selectedCard) return;
		await persistCardFields(selectedCard.uuid, { description: editorDescription });
	}

	function handleDeleteCardFromEditor() {
		dispatch('delete');
	}
</script>

{#if selectedCard}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
		<div
			class="relative w-full max-w-3xl rounded-xl border border-sky-300/30 bg-slate-900/95 p-5 text-slate-100 shadow-xl shadow-slate-950/70 backdrop-blur-sm"
		>
			<div class="mb-1 flex items-start gap-2">
				<input
					type="text"
					class="h-10 min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-lg font-bold text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
					value={selectedCard.title}
					readonly={!canEdit}
					oninput={handleEditorTitleInput}
					onblur={handleEditorTitleBlur}
				/>
				{#if canEdit}
					<button
						type="button"
						title="Delete card"
						class="ml-1 h-10 shrink-0 cursor-pointer rounded-md border border-rose-300/35 bg-rose-500/15 px-3 text-sm font-semibold text-rose-100 shadow-md shadow-slate-950/70 transition-all hover:border-rose-300/60 hover:bg-rose-500/25"
						onclick={handleDeleteCardFromEditor}
					>
						Delete
					</button>
				{/if}
				<button
					type="button"
					class="ml-2 mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded-full border border-slate-500/70 bg-slate-800/90 text-slate-300 shadow-md shadow-slate-950/70 transition-all hover:border-sky-300/70 hover:bg-sky-500/20 hover:text-slate-100"
					onclick={closeDetails}
				>
					✕
				</button>
			</div>
			<p class="mb-4 text-xs text-slate-300">
				in list <span class="font-semibold text-sky-200">{selectedListName ?? ''}</span>
			</p>

			<div class="grid gap-4 md:grid-cols-2">
				<section class="md:col-span-2">
					<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">Description</h3>
					<textarea
						class="min-h-28 w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						placeholder="Write a description..."
						value={editorDescription}
						readonly={!canEdit}
						oninput={handleEditorDescriptionInput}
						onblur={handleEditorDescriptionBlur}
					></textarea>
				</section>

				<BoardCardDetailsAssigneesSection
					{selectedCard}
					{boardMembers}
					{canEdit}
					{persistCardFields}
				/>
				<BoardCardDetailsDueDateSection {selectedCard} {canEdit} {persistCardFields} />
				<BoardCardDetailsTagsSection {selectedCard} {canEdit} {currentUserId} />
			</div>
		</div>
	</div>
{/if}
