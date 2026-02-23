<script lang="ts">
	import {
		assigneeLabel,
		getAvailableAssigneeMembers,
		isMemberAssignedToCard,
		memberLabel
	} from './board-filters';
	import type { BoardMember, UiCard } from './board.types';

	const { selectedCard, boardMembers, canEdit, persistCardFields } = $props<{
		selectedCard: UiCard;
		boardMembers: BoardMember[];
		canEdit: boolean;
		persistCardFields: (
			cardUuid: string | undefined,
			fields: Record<string, unknown>
		) => Promise<void>;
	}>();

	let editorSelectedAssignee = $state('');
	let initializedForCard = $state<string | null>(null);

	const selectedCardKey = $derived(
		selectedCard.uuid ? `uuid:${selectedCard.uuid}` : `local:${selectedCard.id}`
	);

	const availableAssigneeMembers = $derived(
		getAvailableAssigneeMembers(selectedCard, boardMembers)
	);

	$effect(() => {
		if (selectedCardKey === initializedForCard) {
			return;
		}

		initializedForCard = selectedCardKey;
		editorSelectedAssignee = '';
	});

	async function addEditorAssignee() {
		if (!canEdit) return;
		const memberId = editorSelectedAssignee.trim();
		if (!memberId) return;

		const member = boardMembers.find((entry: BoardMember) => entry.userId === memberId);
		if (!member) {
			editorSelectedAssignee = '';
			return;
		}

		if (isMemberAssignedToCard(selectedCard, member)) {
			editorSelectedAssignee = '';
			return;
		}

		selectedCard.assignees = [...selectedCard.assignees, member.userId];
		editorSelectedAssignee = '';
		await persistCardFields(selectedCard.uuid, { assignees: selectedCard.assignees });
	}

	async function removeEditorAssignee(assignee: string) {
		if (!canEdit) return;

		selectedCard.assignees = selectedCard.assignees.filter((entry: string) => entry !== assignee);
		await persistCardFields(selectedCard.uuid, { assignees: selectedCard.assignees });
	}

	function formatAssigneeLabel(assignee: string) {
		return assigneeLabel(assignee, boardMembers);
	}
</script>

<section class="min-w-0">
	<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">Assignees</h3>
	<div class="mb-2 flex flex-wrap gap-1.5">
		{#if selectedCard.assignees?.length}
			{#each selectedCard.assignees as assignee (assignee)}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-slate-700/90 px-2 py-1 text-xs text-slate-100 ring-1 ring-slate-500"
				>
					{formatAssigneeLabel(assignee)}
					{#if canEdit}
						<button
							type="button"
							class="cursor-pointer rounded px-1 text-slate-300 shadow-sm shadow-slate-950/60 transition-all hover:bg-rose-500/25 hover:text-rose-200 active:translate-y-px"
							onclick={() => void removeEditorAssignee(assignee)}
							title="Remove assignee"
						>
							✕
						</button>
					{/if}
				</span>
			{/each}
		{:else}
			<p class="text-xs text-slate-400">No assignees yet.</p>
		{/if}
	</div>
	<form
		class="flex w-full gap-1.5"
		onsubmit={(event) => {
			event.preventDefault();
			void addEditorAssignee();
		}}
	>
		<select
			class="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
			disabled={!canEdit}
			bind:value={editorSelectedAssignee}
		>
			<option value="">Select a board member...</option>
			{#each availableAssigneeMembers as member (member.userId)}
				<option value={member.userId}>{memberLabel(member)}</option>
			{/each}
		</select>
		<button
			type="submit"
			disabled={!canEdit || !editorSelectedAssignee}
			class="h-8 w-16 min-w-16 shrink-0 cursor-pointer whitespace-nowrap rounded-md bg-sky-600 px-2 py-1 text-center text-xs font-semibold text-white shadow-md shadow-sky-900/50 transition-all hover:bg-sky-500 active:translate-y-px"
		>
			+ Add
		</button>
	</form>
	{#if availableAssigneeMembers.length === 0}
		<p class="mt-1 text-xs text-slate-400">All board members are already assigned.</p>
	{/if}
</section>
