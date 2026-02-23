<script lang="ts">
	let {
		mcpLoading,
		mcpError,
		mcpUseAiPlanner = $bindable(),
		mcpAiProvider = $bindable(),
		mcpAiModel = $bindable(),
		mcpAiApiKey = $bindable(),
		mcpBatchName = $bindable(),
		mcpPrompt = $bindable(),
		lastAiBatchOperations,
		lastAiBatchLabel,
		onRun,
		onUndo
	}: {
		mcpLoading: boolean;
		mcpError: string;
		mcpUseAiPlanner: boolean;
		mcpAiProvider: 'openai' | 'openrouter';
		mcpAiModel: string;
		mcpAiApiKey: string;
		mcpBatchName: string;
		mcpPrompt: string;
		lastAiBatchOperations: Array<unknown>;
		lastAiBatchLabel: string;
		onRun: () => void;
		onUndo: () => void;
	} = $props();
</script>

<div id="board-mcp-panel" class="mb-3 rounded-xl border border-sky-300/20 bg-slate-800/65 p-3 text-slate-100 shadow-sm shadow-slate-950/40">
	<div class="flex flex-wrap items-end gap-2">
		<div class="flex min-w-[38rem] flex-1 flex-col gap-1">
			<label for="board-mcp-batch-name" class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300">Batch name (optional)</label>
			<input id="board-mcp-batch-name" type="text" class="rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100" placeholder="ex: sprint-setup-v1" bind:value={mcpBatchName} />
			<label for="board-mcp-prompt" class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300">Prompt IA</label>
			<textarea id="board-mcp-prompt" rows="5" class="rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100" bind:value={mcpPrompt}></textarea>
			<label class="mt-1 inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" class="h-4 w-4 rounded border-slate-500/70 bg-slate-700/80" bind:checked={mcpUseAiPlanner} />Use AI planner (user token + model)</label>
			{#if mcpUseAiPlanner}
				<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
					<div class="flex flex-col gap-1"><label for="board-mcp-ai-provider" class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300">Provider</label><select id="board-mcp-ai-provider" class="rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100" bind:value={mcpAiProvider}><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option></select></div>
					<div class="flex flex-col gap-1"><label for="board-mcp-ai-model" class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300">Model</label><input id="board-mcp-ai-model" type="text" class="rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100" placeholder="gpt-4.1-mini" bind:value={mcpAiModel} /></div>
					<div class="flex flex-col gap-1"><label for="board-mcp-ai-key" class="select-none text-[11px] font-semibold uppercase tracking-wide text-slate-300">API key</label><input id="board-mcp-ai-key" type="password" class="rounded-md border border-slate-500/70 bg-slate-700/80 px-2 py-1 text-sm text-slate-100" placeholder="sk-..." bind:value={mcpAiApiKey} /></div>
				</div>
				<p class="text-xs text-slate-400">Token is used server-side for this request and not written to board history.</p>
			{/if}
			<div class="text-xs text-slate-300"><p>{mcpUseAiPlanner ? 'Prompt naturel recommandé:' : 'Format recommandé:'}</p>{#if !mcpUseAiPlanner}<p><code>list: nom1, nom2, nom3</code></p><p><code>card: listName | cardName</code></p><p><code>tag: cardName | tagName</code></p>{/if}<p class="mt-1">Exemple naturel:</p><p>Crée les listes Todo, Doing, Done; ajoute des cartes dans Todo: Préparer sprint, Écrire tests; ajoute le tag urgent sur Préparer sprint</p></div>
		</div>

		<button type="button" class="mb-0.5 h-9 rounded-md bg-sky-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60" onclick={onRun} disabled={mcpLoading}>{mcpLoading ? 'Running...' : 'Run MCP Action'}</button>
		<button type="button" class="mb-0.5 h-9 rounded-md border border-amber-300/40 bg-amber-500/20 px-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60" onclick={onUndo} disabled={mcpLoading || lastAiBatchOperations.length === 0}>Undo last AI batch</button>
	</div>

	{#if lastAiBatchOperations.length > 0}
		<p class="mt-2 text-xs text-amber-100/90">Undo disponible pour le batch: {lastAiBatchLabel || `${lastAiBatchOperations.length} operations`}</p>
	{/if}
	{#if mcpError}
		<p class="mt-2 whitespace-pre-wrap rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">{mcpError}</p>
	{/if}
</div>
