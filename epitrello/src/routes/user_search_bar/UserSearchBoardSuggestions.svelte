<script lang="ts">
	import type { SuggestionEntry } from './user-search.types';

	const {
		isSearchLoading,
		searchError,
		searchSuggestionEntries,
		ownedSuggestionEntries,
		sharedSuggestionEntries,
		highlightedSuggestionIndex,
		onSuggestionMouseEnter,
		onSuggestionMouseDown,
		onNavigate
	} = $props<{
		isSearchLoading: boolean;
		searchError: string;
		searchSuggestionEntries: SuggestionEntry[];
		ownedSuggestionEntries: SuggestionEntry[];
		sharedSuggestionEntries: SuggestionEntry[];
		highlightedSuggestionIndex: number;
		onSuggestionMouseEnter: (index: number) => void;
		onSuggestionMouseDown: (event: MouseEvent) => void;
		onNavigate: (index: number) => void;
	}>();

	function boardRoleLabel(role: SuggestionEntry['board']['role']) {
		if (role === 'owner') return 'Owner';
		if (role === 'editor') return 'Editor';
		return 'Viewer';
	}

	function boardSubtitle(entry: SuggestionEntry) {
		if (entry.group === 'owned') {
			return 'Owned by you';
		}

		return `Shared by ${entry.board.ownerName}`;
	}
</script>

<div
	id="board-search-suggestions"
	class="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 max-h-96 overflow-y-auto rounded-lg border border-sky-300/25 bg-slate-900/95 p-2 shadow-xl shadow-slate-950/70 backdrop-blur-sm"
>
	{#if isSearchLoading}
		<p class="px-2 py-2 text-sm text-slate-300">Searching boards...</p>
	{:else if searchError}
		<p class="px-2 py-2 text-sm text-rose-200">{searchError}</p>
	{:else if searchSuggestionEntries.length === 0}
		<p class="px-2 py-2 text-sm text-slate-300">No board found.</p>
	{:else}
		{#if ownedSuggestionEntries.length}
			<p class="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
				My boards
			</p>
			<ul class="mb-2">
				{#each ownedSuggestionEntries as entry (entry.board.uuid)}
					<li>
						<button
							type="button"
							class={`flex w-full items-center justify-between gap-3 rounded-md border px-2 py-2 text-left transition-colors ${
								highlightedSuggestionIndex === entry.index
									? 'border-sky-300/35 bg-sky-500/20'
									: 'border-transparent hover:bg-slate-700/80'
							}`}
							onmouseenter={() => onSuggestionMouseEnter(entry.index)}
							onmousedown={onSuggestionMouseDown}
							onclick={() => onNavigate(entry.index)}
						>
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-slate-100">{entry.board.name}</p>
								<p class="truncate text-xs text-slate-400">{boardSubtitle(entry)}</p>
							</div>
							<span
								class="rounded-md border border-slate-500/60 bg-slate-700/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200"
							>
								{boardRoleLabel(entry.board.role)}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if sharedSuggestionEntries.length}
			<p class="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
				Shared with me
			</p>
			<ul>
				{#each sharedSuggestionEntries as entry (entry.board.uuid)}
					<li>
						<button
							type="button"
							class={`flex w-full items-center justify-between gap-3 rounded-md border px-2 py-2 text-left transition-colors ${
								highlightedSuggestionIndex === entry.index
									? 'border-sky-300/35 bg-sky-500/20'
									: 'border-transparent hover:bg-slate-700/80'
							}`}
							onmouseenter={() => onSuggestionMouseEnter(entry.index)}
							onmousedown={onSuggestionMouseDown}
							onclick={() => onNavigate(entry.index)}
						>
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-slate-100">{entry.board.name}</p>
								<p class="truncate text-xs text-slate-400">{boardSubtitle(entry)}</p>
							</div>
							<span
								class="rounded-md border border-slate-500/60 bg-slate-700/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200"
							>
								{boardRoleLabel(entry.board.role)}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
