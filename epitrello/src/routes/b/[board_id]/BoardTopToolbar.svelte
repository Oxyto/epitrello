<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		boardName = $bindable(),
		boardId,
		canManage,
		historyPanelOpen,
		filtersPanelOpen = $bindable(),
		mcpPanelOpen = $bindable(),
		onToggleHistory,
		onPersistBoardName
	} = $props<{
		boardName: string;
		boardId: string | undefined;
		canManage: boolean;
		historyPanelOpen: boolean;
		filtersPanelOpen: boolean;
		mcpPanelOpen: boolean;
		onToggleHistory: () => void;
		onPersistBoardName: () => Promise<void>;
	}>();
</script>

<div
	class="mb-3 flex items-center gap-3 rounded-xl border border-sky-300/30 bg-slate-800/70 p-3 shadow-md shadow-slate-950/50 backdrop-blur-sm"
>
	<input
		class="flex-1 rounded-md border-0 bg-transparent px-2 py-1 text-2xl font-bold text-slate-100 transition-colors hover:bg-slate-700/60 focus:outline-0"
		title="Board Name"
		type="text"
		bind:value={boardName}
		placeholder="Board name..."
		readonly={!canManage}
		onblur={() => void onPersistBoardName()}
	/>
	<button
		type="button"
		onclick={onToggleHistory}
		class="hover:cursor-pointer rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
		aria-expanded={historyPanelOpen}
		aria-controls="board-history-panel"
	>
		Activity
	</button>
	<button
		type="button"
		onclick={() => (filtersPanelOpen = !filtersPanelOpen)}
		class="hover:cursor-pointer rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
		aria-expanded={filtersPanelOpen}
		aria-controls="board-filters-panel"
	>
		Filter
	</button>
	<button
		type="button"
		onclick={() => (mcpPanelOpen = !mcpPanelOpen)}
		class="hover:cursor-pointer rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
		aria-expanded={mcpPanelOpen}
		aria-controls="board-mcp-panel"
	>
		AI Tools
	</button>
	{#if boardId && canManage}
		<a
			href={resolve(`/b/${boardId}/settings`)}
			class="rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
		>
			Board Settings
		</a>
	{/if}
</div>
