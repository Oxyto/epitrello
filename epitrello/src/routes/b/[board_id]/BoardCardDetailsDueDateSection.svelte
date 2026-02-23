<script lang="ts">
	import type { UiCard } from './board.types';

	const { selectedCard, canEdit, persistCardFields } = $props<{
		selectedCard: UiCard;
		canEdit: boolean;
		persistCardFields: (cardUuid: string | undefined, fields: Record<string, unknown>) => Promise<void>;
	}>();

	let editorDueDate = $state('');
	let initializedForCard = $state<string | null>(null);

	const selectedCardKey = $derived(selectedCard.uuid ? `uuid:${selectedCard.uuid}` : `local:${selectedCard.id}`);

	$effect(() => {
		if (selectedCardKey === initializedForCard) {
			return;
		}

		initializedForCard = selectedCardKey;
		editorDueDate = selectedCard.dueDate ?? '';
	});

	function handleEditorDueDateInput(event: Event) {
		if (!canEdit) return;
		const target = event.currentTarget as HTMLInputElement;
		editorDueDate = target.value;
	}

	async function saveEditorDueDate() {
		if (!canEdit) return;
		selectedCard.dueDate = editorDueDate;
		await persistCardFields(selectedCard.uuid, { dueDate: editorDueDate });
	}

	async function clearEditorDueDate() {
		if (!canEdit) return;

		editorDueDate = '';
		selectedCard.dueDate = '';
		await persistCardFields(selectedCard.uuid, { dueDate: '' });
	}
</script>

<section>
	<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">Due Date</h3>
	<div class="mb-2 flex flex-wrap gap-1.5">
		{#if selectedCard.dueDate}
			<span
				class="inline-flex items-center gap-1 rounded-md bg-slate-700/90 px-2 py-1 text-xs text-slate-100 ring-1 ring-slate-500"
			>
				{selectedCard.dueDate}
				{#if canEdit}
					<button
						type="button"
						class="cursor-pointer rounded px-1 text-slate-300 shadow-sm shadow-slate-950/60 transition-all hover:bg-rose-500/25 hover:text-rose-200 active:translate-y-px"
						onclick={() => void clearEditorDueDate()}
						title="Clear due date"
					>
						✕
					</button>
				{/if}
			</span>
		{:else}
			<p class="text-xs text-slate-400">No due date.</p>
		{/if}
	</div>
	<form
		class="flex w-full gap-1.5"
		onsubmit={(event) => {
			event.preventDefault();
			void saveEditorDueDate();
		}}
	>
		<input
			type="date"
			class="min-w-0 flex-1 appearance-none rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm text-slate-100 focus:border-sky-400 focus:outline-none scheme-dark [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-0 [&::-webkit-calendar-picker-indicator]:w-0 [&::-webkit-calendar-picker-indicator]:opacity-0"
			value={editorDueDate}
			disabled={!canEdit}
			oninput={handleEditorDueDateInput}
		/>
		<button
			type="submit"
			disabled={!canEdit}
			class="h-8 w-16 min-w-16 shrink-0 cursor-pointer whitespace-nowrap rounded-md bg-sky-600 px-2 py-1 text-center text-xs font-semibold text-white shadow-md shadow-sky-900/50 transition-all hover:bg-sky-500 active:translate-y-px"
		>
			Set
		</button>
	</form>
</section>
