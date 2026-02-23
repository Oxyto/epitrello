<script lang="ts">
	import BoardMcpPanelView from './BoardMcpPanelView.svelte';
	import { collectPromptOperationErrors, parsePromptOperations, type PromptOperation } from './board-mcp-prompt';
	import type { UiList } from './board.types';

	type UndoOperation =
		| { type: 'delete_list'; listId: string; listName: string }
		| { type: 'delete_card'; cardId: string; cardTitle: string }
		| { type: 'remove_tag'; cardId: string; tagName: string; cardTitle: string };
	type SelectableList = { uuid: string; name: string };
	type SelectableCard = { uuid: string; title: string; listName: string };

	const { boardId, currentUserId, canEdit, lists, onReload } = $props<{
		boardId: string | undefined;
		currentUserId: string;
		canEdit: boolean;
		lists: UiList[];
		onReload: () => Promise<void>;
	}>();

	let mcpLoading = $state(false);
	let mcpError = $state('');
	let mcpOutput = $state('');
	let mcpPrompt = $state(
		'list: Todo, Doing, Done\ncard: Todo | Préparer sprint\ncard: Todo | Écrire tests\ntag: Préparer sprint | urgent'
	);
	let mcpUseAiPlanner = $state(false);
	let mcpAiProvider = $state<'openai' | 'openrouter'>('openai');
	let mcpAiModel = $state('gpt-4.1-mini');
	let mcpAiApiKey = $state('');
	let mcpBatchName = $state('');
	let lastAiBatchOperations = $state<UndoOperation[]>([]);
	let lastAiBatchLabel = $state('');
	let aiBatchMutationInFlight = $state(false);

	const selectableLists = $derived<SelectableList[]>(
		lists
			.filter((list: UiList) => typeof list.uuid === 'string' && list.uuid.length > 0)
			.map((list: UiList) => ({ uuid: String(list.uuid), name: list.name }))
	);

	const selectableCards = $derived<SelectableCard[]>(
		lists.flatMap((list: UiList) =>
			list.cards
				.filter((card) => typeof card.uuid === 'string' && card.uuid.length > 0)
				.map((card) => ({ uuid: String(card.uuid), title: card.title, listName: list.name }))
		)
	);

	async function callMcpTool(name: string, args: Record<string, unknown>) {
		const response = await fetch('/api/mcp', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: Date.now(),
				method: 'tools/call',
				params: { name, arguments: args }
			})
		});
		const payload = await response.json();
		if (!response.ok) {
			throw new Error(payload?.error?.message ?? `MCP request failed (${response.status})`);
		}
		return payload;
	}

	function getStructuredContent(payload: unknown): Record<string, unknown> {
		if (!payload || typeof payload !== 'object') return {};
		const root = payload as { result?: unknown };
		if (!root.result || typeof root.result !== 'object') return {};
		const result = root.result as { structuredContent?: unknown };
		return result.structuredContent && typeof result.structuredContent === 'object'
			? (result.structuredContent as Record<string, unknown>)
			: {};
	}

	function defaultBatchName() {
		const now = new Date();
		const pad = (value: number) => String(value).padStart(2, '0');
		return `ai-batch-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	}

	function resolveBatchName() {
		const candidate = mcpBatchName.trim();
		return candidate.length > 0 ? candidate : defaultBatchName();
	}

	async function logAiBatchEvent(params: {
		boardId: string;
		userId: string;
		batchName: string;
		phase: 'started' | 'undo_available' | 'undone';
		operationCount: number;
	}) {
		await fetch('/api/ai-batches', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(params)
		});
	}

	async function planPromptOperationsWithAi() {
		if (!boardId || !currentUserId) throw new Error('Board or user context is missing.');
		const apiKey = mcpAiApiKey.trim();
		const model = mcpAiModel.trim();
		if (!apiKey) throw new Error('AI API key is required when AI planner is enabled.');
		if (!model) throw new Error('AI model is required when AI planner is enabled.');

		const response = await fetch('/api/ai/plan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ boardId, userId: currentUserId, prompt: mcpPrompt, provider: mcpAiProvider, model, apiKey })
		});
		const payload = (await response.json().catch(() => ({}))) as {
			error?: string;
			message?: string;
			operations?: PromptOperation[];
		};
		if (!response.ok) throw new Error(payload.error ?? payload.message ?? 'AI planner failed.');

		const operations = Array.isArray(payload.operations) ? payload.operations : [];
		if (operations.length === 0) throw new Error('AI planner returned no operations.');
		return operations;
	}

	async function resolvePromptOperations() {
		if (mcpUseAiPlanner) return planPromptOperationsWithAi();
		const operations = parsePromptOperations(mcpPrompt);
		if (operations.length === 0) throw new Error('Prompt not understood. Use syntax: list:, card: list | title, tag: card | tag.');
		return operations;
	}

	async function runPromptAssistant() {
		if (!boardId || !currentUserId) return;
		if (!canEdit) throw new Error('Read-only mode: you cannot edit this board.');

		aiBatchMutationInFlight = true;
		try {
			const operations = await resolvePromptOperations();
			const errors = collectPromptOperationErrors(operations, {
				listNames: selectableLists.map((list) => list.name),
				cardTitles: selectableCards.map((card) => card.title)
			});
			if (errors.length > 0) throw new Error(errors.join('\n'));

			const batchName = resolveBatchName();
			await logAiBatchEvent({ boardId, userId: currentUserId, batchName, phase: 'started', operationCount: operations.length });

			const listIdByName = new Map(selectableLists.map((list) => [list.name.trim().toLowerCase(), list.uuid] as const));
			const cardIdByTitle = new Map(selectableCards.map((card) => [card.title.trim().toLowerCase(), card.uuid] as const));
			const logs: string[] = [];
			const undoOperations: UndoOperation[] = [];

			for (const operation of operations) {
				if (operation.type === 'create_list') {
					const payload = await callMcpTool('create_list', { boardId, name: operation.listName, userId: currentUserId });
					const createdListId = String(getStructuredContent(payload).id ?? '');
					if (createdListId) {
						listIdByName.set(operation.listName.trim().toLowerCase(), createdListId);
						undoOperations.push({ type: 'delete_list', listId: createdListId, listName: operation.listName });
					}
					logs.push(`list created: ${operation.listName}`);
				}

				if (operation.type === 'create_card') {
					const listId = listIdByName.get(operation.listName.trim().toLowerCase());
					if (!listId) throw new Error(`Unknown list "${operation.listName}" for card "${operation.cardTitle}".`);
					const payload = await callMcpTool('create_card', { listId, title: operation.cardTitle, userId: currentUserId });
					const createdCardId = String(getStructuredContent(payload).id ?? '');
					if (createdCardId) {
						cardIdByTitle.set(operation.cardTitle.trim().toLowerCase(), createdCardId);
						undoOperations.push({ type: 'delete_card', cardId: createdCardId, cardTitle: operation.cardTitle });
					}
					logs.push(`card created: ${operation.cardTitle} (list: ${operation.listName})`);
				}

				if (operation.type === 'add_tag') {
					const cardId = cardIdByTitle.get(operation.cardTitle.trim().toLowerCase());
					if (!cardId) throw new Error(`Unknown card "${operation.cardTitle}" for tag "${operation.tagName}".`);
					await callMcpTool('add_tag', { cardId, name: operation.tagName, userId: currentUserId });
					undoOperations.push({ type: 'remove_tag', cardId, tagName: operation.tagName, cardTitle: operation.cardTitle });
					logs.push(`tag added: ${operation.tagName} (card: ${operation.cardTitle})`);
				}
			}

			lastAiBatchOperations = undoOperations;
			lastAiBatchLabel = batchName;
			mcpBatchName = batchName;
			await logAiBatchEvent({ boardId, userId: currentUserId, batchName, phase: 'undo_available', operationCount: undoOperations.length });
			mcpOutput = JSON.stringify({ steps: logs, operationCount: operations.length, undoCount: undoOperations.length }, null, 2);
		} finally {
			aiBatchMutationInFlight = false;
		}
	}

	async function undoLastAiBatch() {
		if (!boardId || !currentUserId || lastAiBatchOperations.length === 0) return;
		mcpLoading = true;
		mcpError = '';
		aiBatchMutationInFlight = true;

		try {
			const logs: string[] = [];
			const operations = [...lastAiBatchOperations].reverse();
			for (const operation of operations) {
				if (operation.type === 'remove_tag') {
					const response = await fetch('/api/tags', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardId: operation.cardId, name: operation.tagName, userId: currentUserId }) });
					if (!response.ok) throw new Error(`Undo failed while removing tag "${operation.tagName}".`);
					logs.push(`tag removed: ${operation.tagName} (card: ${operation.cardTitle})`);
				}
				if (operation.type === 'delete_card') {
					const response = await fetch(`/api/cards?id=${encodeURIComponent(operation.cardId)}&userId=${encodeURIComponent(currentUserId)}`, { method: 'DELETE' });
					if (!response.ok) throw new Error(`Undo failed while deleting card "${operation.cardTitle}".`);
					logs.push(`card removed: ${operation.cardTitle}`);
				}
				if (operation.type === 'delete_list') {
					const response = await fetch(`/api/lists?id=${encodeURIComponent(operation.listId)}&userId=${encodeURIComponent(currentUserId)}`, { method: 'DELETE' });
					if (!response.ok) throw new Error(`Undo failed while deleting list "${operation.listName}".`);
					logs.push(`list removed: ${operation.listName}`);
				}
			}

			lastAiBatchOperations = [];
			const removedBatchName = lastAiBatchLabel || resolveBatchName();
			await logAiBatchEvent({ boardId, userId: currentUserId, batchName: removedBatchName, phase: 'undone', operationCount: operations.length });
			lastAiBatchLabel = '';
			mcpOutput = JSON.stringify({ undo: true, steps: logs }, null, 2);
			await onReload();
		} catch (error) {
			mcpError = error instanceof Error ? error.message : 'Undo failed.';
		} finally {
			mcpLoading = false;
			aiBatchMutationInFlight = false;
		}
	}

	async function runBoardMcpAction() {
		if (!boardId || !currentUserId) return;
		mcpLoading = true;
		mcpError = '';
		try {
			await runPromptAssistant();
			await onReload();
		} catch (error) {
			mcpError = error instanceof Error ? error.message : 'MCP action failed.';
		} finally {
			mcpLoading = false;
		}
	}
</script>

<BoardMcpPanelView
	{mcpLoading}
	{mcpError}
	bind:mcpUseAiPlanner
	bind:mcpAiProvider
	bind:mcpAiModel
	bind:mcpAiApiKey
	bind:mcpBatchName
	bind:mcpPrompt
	{lastAiBatchOperations}
	{lastAiBatchLabel}
	onRun={() => void runBoardMcpAction()}
	onUndo={() => void undoLastAiBatch()}
/>
