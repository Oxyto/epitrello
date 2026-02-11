<script lang="ts">
	import UserSearchBar from '../../user_search_bar.svelte';
	import Card from './card.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type UiCard = {
		id: number;
		uuid?: string;
		title: string;
		completed: boolean;
		tags: string[];
	};

	type UiList = {
		uuid?: string;
		name: string;
		cards: UiCard[];
		newCardTitle: string;
	};
	type BoardFullResponse = {
		board: { id: string; name: string };
		lists: Array<{
			uuid: string;
			name: string;
			order: number;
			cards: Array<{
				uuid: string;
				title: string;
				order: number;
				completed: boolean;
				tags: string[];
			}>;
		}>;
	};
	const { data } = $props<{
		data: {
			board: { id: string; name: string } | undefined;
		};
	}>();

	const boardId: string | undefined = data.board?.id;

	let ready = $state(false);
	let board_name = $state(data.board?.name ?? 'Board');

	let lists = $state<UiList[]>([]);
	let newListName = $state('');
	let nextLocalCardId = 1;
	let selectedCardRef = $state<{ listIndex: number; cardIndex: number } | null>(null);
	let draggedCardRef = $state<{ listIndex: number; cardIndex: number } | null>(null);
	let cardDropPreview = $state<{ listIndex: number; targetIndex: number } | null>(null);
	let draggedListIndex = $state<number | null>(null);

	const selectedList = $derived<UiList | null>(
		selectedCardRef && lists[selectedCardRef.listIndex] ? lists[selectedCardRef.listIndex] : null
	);

	const selectedCard = $derived<UiCard | null>(
		selectedCardRef && selectedList && selectedList.cards[selectedCardRef.cardIndex]
			? selectedList.cards[selectedCardRef.cardIndex]
			: null
	);

	function applyLoadedState(payload: BoardFullResponse) {
		if (!payload || !payload.board) return;

		board_name = payload.board.name ?? board_name;
		let localId = 1;

		const mapped: UiList[] = payload.lists.map((list) => ({
			uuid: list.uuid,
			name: list.name,
			newCardTitle: '',
			cards: list.cards.map((card) => ({
				id: localId++,
				uuid: card.uuid,
				title: card.title,
				completed: card.completed ?? false,
				tags: card.tags ?? []
			}))
		}));

		nextLocalCardId = localId;
		lists = mapped;
	}

	async function loadBoardFull() {
		if (!browser || !boardId) return;

		try {
			const res = await fetch(`/api/board-full?boardId=${boardId}`);
			if (!res.ok) {
				console.warn('Erreur /api/board-full', await res.text());
				return;
			}
			const payload = (await res.json()) as BoardFullResponse;
			console.log('board-full payload', payload);
			applyLoadedState(payload);
		} catch (err) {
			console.error('Erreur réseau /api/board-full', err);
		}
	}

	async function loadBoardFromRedis() {
		if (!browser || !boardId) return;

		try {
			const res = await fetch(`/api/board-full?boardId=${boardId}`);
			if (!res.ok) {
				console.warn('board-full error', await res.text());
				return;
			}

			const payload = (await res.json()) as {
				board: { uuid: string; name: string };
				lists: Array<{
					uuid: string;
					name: string;
					cards: Array<{ uuid: string; title: string; completed: boolean; tags: string[] }>;
				}>;
			};

			board_name = payload.board.name;

			let localId = 1;
			lists = payload.lists.map((l) => ({
				uuid: l.uuid,
				name: l.name,
				newCardTitle: '',
				cards: (l.cards ?? []).map((c) => ({
					id: localId++,
					uuid: c.uuid,
					title: c.title,
					completed: c.completed ?? false,
					tags: c.tags ?? []
				}))
			}));
		} catch (err) {
			console.error('Erreur loadBoardFromRedis', err);
		}
	}

	onMount(async () => {
		if (!browser) {
			ready = true;
			return;
		}

		await loadBoardFull();
		ready = true;
	});

	async function addList() {
		const name = newListName.trim();
		if (!name || !boardId) return;

		try {
			const res = await fetch('/api/lists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId, name })
			});

			if (!res.ok) {
				console.error('Erreur création liste', await res.text());
				return;
			}

			const payload = (await res.json()) as { id: string; name: string };

			lists = [
				...lists,
				{
					uuid: payload.id,
					name: payload.name,
					cards: [],
					newCardTitle: ''
				}
			];

			newListName = '';
		} catch (err) {
			console.error('Erreur réseau /api/lists', err);
		}
	}

	async function deleteList(index: number) {
		const list = lists[index];
		if (!list) return;
		lists = lists.filter((_, i) => i !== index);
		if (list.uuid) {
			try {
				const res = await fetch(`/api/lists?id=${encodeURIComponent(list.uuid)}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					console.error('Erreur API delete list', await res.text());
				}
			} catch (err) {
				console.error('Erreur réseau delete list', err);
			}
		}
	}

	async function updateListName(index: number, event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (!lists[index]) return;

		const newName = target.value;
		lists[index].name = newName;

		const listUuid = lists[index].uuid;
		if (!browser || !listUuid) return;

		try {
			await fetch('/api/lists', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ listId: listUuid, name: newName.trim() })
			});
		} catch (err) {
			console.error('Erreur rename list', err);
		}
	}

	function updateListNewCardTitle(index: number, event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (!lists[index]) return;
		lists[index].newCardTitle = target.value;
	}
	async function persistBoardName() {
		if (!browser || !boardId) return;

		const name = board_name.trim();
		if (!name) return;

		try {
			await fetch('/api/boards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId, name })
			});
		} catch (err) {
			console.error('Erreur rename board', err);
		}
	}

	async function addCard(listIndex: number) {
		const list = lists[listIndex];
		if (!list || !list.uuid) return;

		const title = (list.newCardTitle ?? '').trim();
		if (!title) return;
		const localId = nextLocalCardId++;
		const newCard: UiCard = {
			id: localId,
			title,
			completed: false,
			tags: [],
			uuid: undefined
		};
		list.cards.push(newCard);
		list.newCardTitle = '';
		try {
			const res = await fetch('/api/cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ listId: list.uuid, title })
			});

			if (!res.ok) {
				console.error('Erreur création carte', await res.text());
				return;
			}

			const payload = (await res.json()) as { id: string; title: string };
			const card = list.cards.find((c) => c.id === localId);
			if (card) {
				card.uuid = payload.id;
			}
		} catch (err) {
			console.error('Erreur réseau /api/cards', err);
		}
	}

	async function handleDeleteCard(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		const { listIndex, cardIndex } = event.detail;

		if (!Array.isArray(lists) || !lists[listIndex]) {
			console.warn('handleDeleteCard: listIndex invalide', listIndex, lists);
			return;
		}

		const list = lists[listIndex];
		if (!Array.isArray(list.cards) || !list.cards[cardIndex]) {
			console.warn('handleDeleteCard: cardIndex invalide', cardIndex, list.cards);
			return;
		}

		const card = list.cards[cardIndex];
		const cardUuid = card.uuid;

		const newLists = lists.map((l, li) => {
			if (li !== listIndex) return l;

			return {
				...l,
				cards: l.cards.filter((_, ci) => ci !== cardIndex)
			};
		});

		lists = newLists;
		if (cardUuid) {
			try {
				const res = await fetch(`/api/cards?id=${cardUuid}`, {
					method: 'DELETE'
				});

				if (!res.ok) {
					console.error('Erreur API delete card', await res.text());
				}
			} catch (err) {
				console.error('Erreur réseau API delete card', err);
			}
		} else {
			console.warn('handleDeleteCard: pas de uuid sur la carte, API non appelée');
		}
	}
	function handleOpenDetails(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		const { listIndex, cardIndex } = event.detail;
		selectedCardRef = { listIndex, cardIndex };
	}

	function closeDetails() {
		selectedCardRef = null;
	}

	async function handleUpdateTitle(
		event: CustomEvent<{ listIndex: number; cardIndex: number; title: string }>
	) {
		const { listIndex, cardIndex, title } = event.detail;

		const list = lists[listIndex];
		if (!list || !list.cards[cardIndex]) return;

		const card = list.cards[cardIndex];
		card.title = title;

		const cardUuid = card.uuid;
		if (!browser || !cardUuid) return;

		try {
			await fetch('/api/cards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: cardUuid, name: title.trim() })
			});
		} catch (err) {
			console.error('Erreur rename card', err);
		}
	}

	async function handleUpdateCompleted(
		event: CustomEvent<{ listIndex: number; cardIndex: number; completed: boolean }>
	) {
		const { listIndex, cardIndex, completed } = event.detail;
		const list = lists[listIndex];
		if (!list || !list.cards[cardIndex]) return;

		const card = list.cards[cardIndex];
		card.completed = completed;

		if (!browser || !card.uuid) return;
		try {
			await fetch('/api/cards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardId: card.uuid,
					completed
				})
			});
		} catch (err) {
			console.error('Erreur update completed card', err);
		}
	}

	function moveCardInMemory(
		fromListIndex: number,
		fromCardIndex: number,
		toListIndex: number,
		toCardIndex: number
	) {
		const fromList = lists[fromListIndex];
		const toList = lists[toListIndex];
		if (!fromList || !toList || !fromList.cards[fromCardIndex]) {
			return null;
		}

		const [card] = fromList.cards.splice(fromCardIndex, 1);

		let insertIndex = toCardIndex;
		if (fromListIndex === toListIndex && fromCardIndex < insertIndex) {
			insertIndex -= 1;
		}
		insertIndex = Math.max(0, Math.min(insertIndex, toList.cards.length));
		toList.cards.splice(insertIndex, 0, card);

		return {
			card,
			insertIndex,
			fromListUuid: fromList.uuid,
			toListUuid: toList.uuid,
			unchanged: fromListIndex === toListIndex && insertIndex === fromCardIndex
		};
	}

	async function persistCardMove(
		cardUuid: string | undefined,
		fromListUuid: string | undefined,
		toListUuid: string | undefined,
		targetIndex: number
	) {
		if (!browser || !cardUuid || !fromListUuid || !toListUuid) return;

		try {
			await fetch('/api/cards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardId: cardUuid,
					fromListId: fromListUuid,
					toListId: toListUuid,
					targetIndex
				})
			});
		} catch (err) {
			console.error('Erreur move card', err);
		}
	}

	function moveListInMemory(fromIndex: number, toIndex: number) {
		if (!lists[fromIndex]) {
			return null;
		}

		const nextLists = [...lists];
		const [movedList] = nextLists.splice(fromIndex, 1);
		let insertIndex = toIndex;

		if (fromIndex < insertIndex) {
			insertIndex -= 1;
		}
		insertIndex = Math.max(0, Math.min(insertIndex, nextLists.length));
		nextLists.splice(insertIndex, 0, movedList);

		const changed = insertIndex !== fromIndex;
		lists = nextLists;

		return { changed };
	}

	async function persistListsOrder() {
		if (!browser) return;

		const updates = lists
			.map((list, order) => (list.uuid ? { listId: list.uuid, order } : null))
			.filter((entry): entry is { listId: string; order: number } => entry !== null);

		await Promise.all(
			updates.map(async ({ listId, order }) => {
				try {
					await fetch('/api/lists', {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ listId, order })
					});
				} catch (err) {
					console.error('Erreur persist list order', err);
				}
			})
		);
	}

	function getPreviewInsertIndex(targetListIndex: number, targetCardIndex: number) {
		if (!draggedCardRef) return targetCardIndex;

		if (
			draggedCardRef.listIndex === targetListIndex &&
			draggedCardRef.cardIndex < targetCardIndex
		) {
			return Math.max(0, targetCardIndex - 1);
		}

		return targetCardIndex;
	}

	function setCardDropPreview(targetListIndex: number, targetCardIndex: number) {
		if (!draggedCardRef) return;
		cardDropPreview = {
			listIndex: targetListIndex,
			targetIndex: getPreviewInsertIndex(targetListIndex, targetCardIndex)
		};
	}

	function handleDragStart(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		draggedCardRef = event.detail;
		cardDropPreview = null;
	}

	function handleDragEnd() {
		draggedCardRef = null;
		cardDropPreview = null;
	}

	function handleListDragStart(index: number, event: DragEvent) {
		const target = event.target as HTMLElement | null;
		if (
			target?.closest(
				'input, button, textarea, select, a, [contenteditable="true"], li[draggable="true"]'
			)
		) {
			event.preventDefault();
			return;
		}

		draggedListIndex = index;
		cardDropPreview = null;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', `list:${index}`);
		}
	}

	function handleListDragEnd() {
		draggedListIndex = null;
	}

	function handleListDragOver(event: DragEvent) {
		if (draggedListIndex === null) return;
		event.preventDefault();
	}

	async function handleListDrop(targetIndex: number, event: DragEvent) {
		if (draggedListIndex === null) return;
		event.preventDefault();

		const targetElement = event.currentTarget as HTMLElement | null;
		const rect = targetElement?.getBoundingClientRect();
		const dropAfter = rect ? event.clientX > rect.left + rect.width / 2 : false;
		const targetInsertIndex = dropAfter ? targetIndex + 1 : targetIndex;

		const moved = moveListInMemory(draggedListIndex, targetInsertIndex);
		draggedListIndex = null;
		if (!moved || !moved.changed) return;

		selectedCardRef = null;
		await persistListsOrder();
	}

	function handleCardDragOver(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		if (!draggedCardRef) return;
		const { listIndex, cardIndex } = event.detail;
		setCardDropPreview(listIndex, cardIndex);
	}

	function handleCardListDragOver(listIndex: number) {
		if (!draggedCardRef || !lists[listIndex]) return;
		setCardDropPreview(listIndex, lists[listIndex].cards.length);
	}

	async function handleDropOnCard(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		if (!draggedCardRef) return;
		const { listIndex, cardIndex } = event.detail;

		const moved = moveCardInMemory(
			draggedCardRef.listIndex,
			draggedCardRef.cardIndex,
			listIndex,
			cardIndex
		);

		draggedCardRef = null;
		cardDropPreview = null;
		if (!moved || moved.unchanged) return;

		await persistCardMove(moved.card.uuid, moved.fromListUuid, moved.toListUuid, moved.insertIndex);
	}

	async function handleDropOnList(listIndex: number) {
		if (!draggedCardRef || !lists[listIndex]) return;

		const moved = moveCardInMemory(
			draggedCardRef.listIndex,
			draggedCardRef.cardIndex,
			listIndex,
			lists[listIndex].cards.length
		);

		draggedCardRef = null;
		cardDropPreview = null;
		if (!moved || moved.unchanged) return;

		await persistCardMove(moved.card.uuid, moved.fromListUuid, moved.toListUuid, moved.insertIndex);
	}

	async function handleMoveCard(
		event: CustomEvent<{ listIndex: number; cardIndex: number; direction: number }>
	) {
		const { listIndex, cardIndex, direction } = event.detail;

		const newListIndex = listIndex + direction;
		if (!lists[newListIndex]) {
			console.warn('handleMoveCard: nouvelle liste inexistante', newListIndex, lists);
			return;
		}

		const moved = moveCardInMemory(
			listIndex,
			cardIndex,
			newListIndex,
			lists[newListIndex].cards.length
		);
		if (!moved || moved.unchanged) return;

		await persistCardMove(moved.card.uuid, moved.fromListUuid, moved.toListUuid, moved.insertIndex);
	}

	async function handleAddTag(
		event: CustomEvent<{ listIndex: number; cardIndex: number; tag: string }>
	) {
		const { listIndex, cardIndex, tag } = event.detail;

		const list = lists[listIndex];
		if (!list || !list.cards[cardIndex]) return;

		const card = list.cards[cardIndex];
		if (card.tags.includes(tag)) return;

		card.tags.push(tag);
		if (!card.uuid) return;
		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: card.uuid, name: tag })
			});
			if (!res.ok) {
				console.error('Erreur API add tag', await res.text());
			}
		} catch (err) {
			console.error('Erreur réseau add tag', err);
		}
	}

	async function handleRemoveTag(e: CustomEvent<{ cardId: number; tag: string }>) {
		const { cardId, tag } = e.detail;

		let cardUuid: string | undefined;
		const updatedLists = lists.map((list) => {
			const cards = list.cards.map((card) => {
				if (card.id === cardId) {
					cardUuid = card.uuid;
					return {
						...card,
						tags: (card.tags ?? []).filter((t) => t !== tag)
					};
				}
				return card;
			});

			return { ...list, cards };
		});

		lists = updatedLists;
		if (cardUuid) {
			try {
				const res = await fetch('/api/tags', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ cardId: cardUuid, name: tag })
				});

				if (!res.ok) {
					console.error('Erreur API delete tag', await res.text());
				}
			} catch (err) {
				console.error('Erreur réseau API delete tag', err);
			}
		} else {
			console.warn('handleRemoveTag: pas de uuid sur la carte, API non appelée');
		}
	}
</script>

{#if ready}
	<UserSearchBar />
	<div
		class="min-h-[calc(100vh-4rem)] w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-3"
	>
		<div
			class="mb-3 flex items-center gap-3 rounded-xl border border-sky-300/30 bg-slate-800/70 p-3 shadow-md shadow-slate-950/50 backdrop-blur-sm"
		>
			<input
				class="rounded-md border-0 bg-transparent px-2 py-1 text-2xl font-bold text-slate-100 transition-colors hover:bg-slate-700/60 focus:outline-0"
				title="Board Name"
				type="text"
				bind:value={board_name}
				placeholder="Board name..."
				on:blur={persistBoardName}
			/>
		</div>

		<div class="flex gap-3 overflow-x-auto px-2 py-3">
			{#each lists as list, i}
				<div
					class="group/list relative min-w-[220px] rounded-xl border border-sky-300/20 bg-slate-800/70 p-3 text-slate-100 shadow-md shadow-slate-950/50 backdrop-blur-sm"
					draggable="true"
					on:dragstart={(event) => handleListDragStart(i, event)}
					on:dragend={handleListDragEnd}
					on:dragover={handleListDragOver}
					on:drop={(event) => handleListDrop(i, event)}
				>
					<div class="absolute right-1 top-1 h-10 w-10 rounded-tr-xl group/corner">
						<button
							type="button"
							title="Delete list"
							class="pointer-events-none absolute right-0 top-0 h-8 w-8 rounded-full border border-rose-300/20 bg-slate-800/90 text-center text-sm font-bold text-rose-200 opacity-0 shadow-sm shadow-black/30 transition-all group-hover/corner:pointer-events-auto group-hover/corner:opacity-100 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
							on:click={() => deleteList(i)}
						>
							✕
						</button>
					</div>

					<div class="flex min-w-full flex-row items-center justify-center gap-2 pr-7">
						<input
							class="w-full rounded-md border-0 bg-transparent px-1 py-1 font-mono text-lg font-bold text-slate-100 transition-colors hover:bg-slate-700/50"
							value={list.name}
							on:input={(e) => updateListName(i, e)}
						/>
					</div>

					<ol
						class="mt-3 flex min-h-14 flex-col gap-1.5"
						on:dragover|preventDefault={() => handleCardListDragOver(i)}
						on:drop|preventDefault={() => handleDropOnList(i)}
					>
						{#each list.cards as card, j}
							{#if cardDropPreview && cardDropPreview.listIndex === i && cardDropPreview.targetIndex === j}
								<li
									class="pointer-events-none h-14 rounded-lg border-2 border-dashed border-sky-300/70 bg-sky-400/20"
								></li>
							{/if}
							<Card
								{card}
								listIndex={i}
								cardIndex={j}
								on:addTag={handleAddTag}
								on:removeTag={handleRemoveTag}
								on:updateTitle={handleUpdateTitle}
								on:updateCompleted={handleUpdateCompleted}
								on:moveCard={handleMoveCard}
								on:deleteCard={handleDeleteCard}
								on:openDetails={handleOpenDetails}
								on:dragStart={handleDragStart}
								on:dragEnd={handleDragEnd}
								on:dragOverCard={handleCardDragOver}
								on:dropOnCard={handleDropOnCard}
							/>
						{/each}
						{#if cardDropPreview && cardDropPreview.listIndex === i && cardDropPreview.targetIndex === list.cards.length}
							<li
								class="pointer-events-none h-14 rounded-lg border-2 border-dashed border-sky-300/70 bg-sky-400/20"
							></li>
						{/if}
					</ol>

					<form class="mt-2.5 flex gap-1.5" on:submit|preventDefault={() => addCard(i)}>
						<input
							type="text"
							class="w-full rounded-md border border-slate-600/60 bg-slate-700/80 p-1.5 font-mono text-sm text-slate-100 shadow-sm shadow-black/20 placeholder:text-slate-300"
							placeholder="New card title..."
							value={list.newCardTitle}
							on:input={(e) => updateListNewCardTitle(i, e)}
						/>
						<button
							type="submit"
							class="w-20 rounded-md bg-sky-500 px-2 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-900/40 transition-colors hover:bg-sky-400"
						>
							+ Add
						</button>
					</form>
				</div>
			{/each}

			<div
				class="min-w-[220px] rounded-xl border border-dashed border-sky-300/35 bg-slate-800/55 p-3 text-slate-100 shadow-md shadow-slate-950/40 backdrop-blur-sm"
			>
				<form on:submit|preventDefault={addList} class="flex flex-col gap-1.5">
					<input
						type="text"
						class="w-full rounded-md border border-slate-600/60 bg-slate-700/80 p-1.5 font-mono text-sm text-slate-100 shadow-sm shadow-black/20 placeholder:text-slate-300"
						placeholder="New list name..."
						bind:value={newListName}
					/>
					<button
						type="submit"
						class="w-full rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-900/40 transition-colors hover:bg-sky-400"
					>
						+ Add List
					</button>
				</form>
			</div>
		</div>
	</div>
	{#if selectedCard && selectedList}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45">
			<div
				class="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl shadow-slate-400/30"
			>
				<button
					type="button"
					class="absolute right-3 top-3 text-slate-400 transition-colors hover:text-slate-700"
					on:click={closeDetails}
				>
					✕
				</button>

				<!-- Header -->
				<h2 class="mb-1 text-lg font-bold">{selectedCard.title}</h2>
				<p class="mb-3 text-xs text-slate-500">
					in list <span class="font-semibold text-slate-700">{selectedList.name}</span>
				</p>

				<!-- Description (placeholder pour l’instant) -->
				<section class="mb-3">
					<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
						Description
					</h3>
					<p class="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
						(Description à venir)
					</p>
				</section>

				<!-- Tags en lecture seule pour l’instant -->
				{#if selectedCard.tags?.length}
					<section>
						<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</h3>
						<div class="flex flex-wrap gap-2">
							{#each selectedCard.tags as tag}
								<span
									class="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200"
								>
									{tag}
								</span>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		</div>
	{/if}
{:else}
	<div
		class="flex min-h-[calc(100vh-4rem)] w-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900"
	>
		<p
			class="rounded-md bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm shadow-slate-300/40"
		>
			Chargement du board...
		</p>
	</div>
{/if}
