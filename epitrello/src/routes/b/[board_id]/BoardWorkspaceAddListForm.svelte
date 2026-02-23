<script lang="ts">
	let {
		canEdit,
		newListName = $bindable(),
		onAddList
	} = $props<{
		canEdit: boolean;
		newListName: string;
		onAddList: () => Promise<void>;
	}>();
</script>

{#if canEdit}
	<div
		class="min-w-55 rounded-xl border border-dashed border-sky-300/35 bg-slate-800/55 p-3 text-slate-100 shadow-md shadow-slate-950/40 backdrop-blur-sm"
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void onAddList();
			}}
			class="flex flex-col gap-2"
		>
			<input
				type="text"
				class="h-9 w-full rounded-md border border-slate-600/60 bg-slate-700/80 p-1.5 font-mono text-sm text-slate-100 shadow-sm shadow-black/20 placeholder:text-slate-300"
				placeholder="New list name..."
				bind:value={newListName}
			/>
			<button
				type="submit"
				class="h-9 w-full rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-sky-900/50 transition-colors hover:cursor-pointer hover:bg-sky-500"
			>
				+ Add List
			</button>
		</form>
	</div>
{/if}
