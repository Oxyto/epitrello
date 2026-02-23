<script lang="ts">
	import { memberLabel } from './board-filters';
	import type { BoardMember, DueDateOperator } from './board.types';

	let {
		boardMembers,
		allTags,
		hasActiveFilters,
		assigneeFilter = $bindable(),
		dueDateOperator = $bindable(),
		dueDateFilterValue = $bindable(),
		tagFilter = $bindable(),
		onResetFilters
	} = $props<{
		boardMembers: BoardMember[];
		allTags: string[];
		hasActiveFilters: boolean;
		assigneeFilter: string;
		dueDateOperator: DueDateOperator;
		dueDateFilterValue: string;
		tagFilter: string;
		onResetFilters: () => void;
	}>();
</script>

<div
	id="board-filters-panel"
	class="mx-2 mb-2 rounded-xl border border-sky-300/20 bg-slate-800/65 px-3 py-2 text-slate-100 shadow-sm shadow-slate-950/40"
>
	<div class="flex flex-wrap items-end gap-2">
		<div class="flex min-w-45 flex-col gap-1">
			<label
				for="board-filter-assignee"
				class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300"
			>
				Assignee
			</label>
			<select
				id="board-filter-assignee"
				class="hover:cursor-pointer rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100"
				bind:value={assigneeFilter}
			>
				<option value="all">Toutes</option>
				<option value="me">Moi</option>
				{#each boardMembers as member (member.userId)}
					<option value={`member:${member.userId}`}>{memberLabel(member)}</option>
				{/each}
			</select>
		</div>

		<div class="flex min-w-30 flex-col gap-1">
			<label
				for="board-filter-due-op"
				class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300"
			>
				Due Date
			</label>
			<select
				id="board-filter-due-op"
				class="hover:cursor-pointer rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100"
				bind:value={dueDateOperator}
			>
				<option value="none">Toutes</option>
				<option value="lt">&lt;</option>
				<option value="lte">&lt;=</option>
				<option value="gt">&gt;</option>
				<option value="gte">&gt;=</option>
				<option value="eq">==</option>
				<option value="neq">~=</option>
			</select>
		</div>

		<div class="flex min-w-42.5 flex-col gap-1">
			<label
				for="board-filter-due-date"
				class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300"
			>
				Date
			</label>
			<input
				id="board-filter-due-date"
				type="date"
				class="hover:cursor-pointer rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100 scheme-dark"
				bind:value={dueDateFilterValue}
			/>
		</div>

		<div class="flex min-w-40 flex-col gap-1">
			<label
				for="board-filter-tag"
				class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300"
			>
				Tag
			</label>
			<select
				id="board-filter-tag"
				class="hover:cursor-pointer rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100"
				bind:value={tagFilter}
			>
				<option value="all">Tous</option>
				{#each allTags as tag (tag)}
					<option value={tag}>{tag}</option>
				{/each}
			</select>
		</div>

		<button
			type="button"
			class="hover:cursor-pointer mb-0.5 h-9 rounded-md border border-slate-400/60 bg-slate-700/80 px-3 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
			onclick={onResetFilters}
			disabled={!hasActiveFilters}
		>
			Reset
		</button>
	</div>
	{#if hasActiveFilters}
		<p class="mt-2 text-xs text-amber-200">
			Filtre actif: le drag and drop est temporairement désactivé.
		</p>
	{/if}
</div>
