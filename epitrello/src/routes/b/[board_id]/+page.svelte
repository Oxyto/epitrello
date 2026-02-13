<script lang="ts">
	import UserSearchBar from '../../user_search_bar.svelte';
	import Card from './card.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	type UiCard = {
		id: number;
		uuid?: string;
		title: string;
		description: string;
		dueDate: string;
		assignees: string[];
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
		board: {
			id: string;
			name: string;
			role: 'owner' | 'editor' | 'viewer';
			canEdit: boolean;
			canManage: boolean;
		};
		lists: Array<{
			uuid: string;
			name: string;
			order: number;
			cards: Array<{
				uuid: string;
				title: string;
				description: string;
				dueDate: string;
				assignees: string[];
				order: number;
				completed: boolean;
				tags: string[];
			}>;
		}>;
	};

	type BoardUpdatedRealtimeEvent = {
		actorId?: string | null;
	};

	const { data } = $props<{
		data: {
			board: { id: string; name: string } | undefined;
		};
	}>();

	const boardId = $derived(data.board?.id);

	let ready = $state(false);
	let board_name = $state('Board');
	let currentUserId = $state('');
	let boardRole = $state<'owner' | 'editor' | 'viewer' | null>(null);
	let canEdit = $state(false);
	let canManage = $state(false);
	let loadError = $state('');
	let inviteMessage = $state('');

	let lists = $state<UiList[]>([]);
	let newListName = $state('');
	let nextLocalCardId = 1;
	let selectedCardRef = $state<{ listIndex: number; cardIndex: number } | null>(null);
	let draggedCardRef = $state<{ listIndex: number; cardIndex: number } | null>(null);
	let cardDropPreview = $state<{ listIndex: number; targetIndex: number } | null>(null);
	let draggedListIndex = $state<number | null>(null);
	let listDropPreviewIndex = $state<number | null>(null);
	let editorDescription = $state('');
	let editorDueDate = $state('');
	let editorNewTag = $state('');
	let editorNewAssignee = $state('');
	let boardEventsSource = $state<EventSource | null>(null);
	let realtimeReloadTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let realtimeReloadInFlight = $state(false);
	let realtimeReloadQueued = $state(false);

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

		const selectedUuid =
			selectedCardRef &&
			lists[selectedCardRef.listIndex] &&
			lists[selectedCardRef.listIndex].cards[selectedCardRef.cardIndex]
				? lists[selectedCardRef.listIndex].cards[selectedCardRef.cardIndex].uuid
				: null;

		board_name = payload.board.name ?? board_name;
		boardRole = payload.board.role;
		canEdit = payload.board.canEdit;
		canManage = payload.board.canManage;
		let localId = 1;

		const mapped: UiList[] = payload.lists.map((list) => ({
			uuid: list.uuid,
			name: list.name,
			newCardTitle: '',
			cards: list.cards.map((card) => ({
				id: localId++,
				uuid: card.uuid,
				title: card.title,
				description: card.description ?? '',
				dueDate: card.dueDate ?? '',
				assignees: card.assignees ?? [],
				completed: card.completed ?? false,
				tags: card.tags ?? []
			}))
		}));

		nextLocalCardId = localId;
		lists = mapped;

		if (!selectedUuid) {
			return;
		}

		let restoredRef: { listIndex: number; cardIndex: number } | null = null;
		for (let listIndex = 0; listIndex < mapped.length; listIndex += 1) {
			const cardIndex = mapped[listIndex].cards.findIndex((card) => card.uuid === selectedUuid);
			if (cardIndex >= 0) {
				restoredRef = { listIndex, cardIndex };
				break;
			}
		}

		if (!restoredRef) {
			closeDetails();
			return;
		}

		selectedCardRef = restoredRef;
		const restoredCard = mapped[restoredRef.listIndex].cards[restoredRef.cardIndex];
		editorDescription = restoredCard.description ?? '';
		editorDueDate = restoredCard.dueDate ?? '';
	}

	async function loadBoardFull() {
		if (!browser || !boardId || !currentUserId) return;
		loadError = '';

		try {
			const res = await fetch(
				`/api/board-full?boardId=${boardId}&userId=${encodeURIComponent(currentUserId)}`
			);
			if (!res.ok) {
				loadError = res.status === 403 ? 'Access denied for this board.' : 'Unable to load board.';
				console.warn('Erreur /api/board-full', await res.text());
				return;
			}
			const payload = (await res.json()) as BoardFullResponse;
			console.log('board-full payload', payload);
			applyLoadedState(payload);
		} catch (err) {
			loadError = 'Network error while loading board.';
			console.error('Erreur réseau /api/board-full', err);
		}
	}

	async function tryJoinWithInvite(inviteToken: string) {
		if (!browser || !boardId || !currentUserId || !inviteToken) return;

		try {
			const res = await fetch('/api/board-sharing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					boardId,
					userId: currentUserId,
					inviteToken
				})
			});

			if (!res.ok) {
				inviteMessage = 'Invalid or expired invite link.';
				console.error('Erreur join invite', await res.text());
				return;
			}

			const payload = (await res.json()) as { joined: boolean };
			inviteMessage = payload.joined ? 'You joined this board.' : '';

			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.delete('invite');
			window.history.replaceState({}, '', nextUrl.toString());
		} catch (err) {
			inviteMessage = 'Unable to join board with invite link.';
			console.error('Erreur réseau join invite', err);
		}
	}

	function stopRealtimeSync() {
		if (boardEventsSource) {
			boardEventsSource.close();
			boardEventsSource = null;
		}
		if (realtimeReloadTimer) {
			clearTimeout(realtimeReloadTimer);
			realtimeReloadTimer = null;
		}
		realtimeReloadInFlight = false;
		realtimeReloadQueued = false;
	}

	async function runRealtimeReload() {
		if (realtimeReloadInFlight) {
			realtimeReloadQueued = true;
			return;
		}

		realtimeReloadInFlight = true;
		try {
			await loadBoardFull();
		} finally {
			realtimeReloadInFlight = false;
			if (realtimeReloadQueued) {
				realtimeReloadQueued = false;
				void runRealtimeReload();
			}
		}
	}

	function scheduleRealtimeReload(delayMs = 120) {
		if (realtimeReloadTimer) {
			clearTimeout(realtimeReloadTimer);
		}

		realtimeReloadTimer = setTimeout(() => {
			realtimeReloadTimer = null;
			void runRealtimeReload();
		}, delayMs);
	}

	function startRealtimeSync() {
		if (!browser || !boardId || !currentUserId) {
			return;
		}

		stopRealtimeSync();

		const params = new URLSearchParams({
			boardId,
			userId: currentUserId
		});
		const source = new EventSource(`/api/board-events?${params.toString()}`);
		boardEventsSource = source;

		source.addEventListener('board-updated', (event: Event) => {
			let actorId: string | null = null;
			try {
				const payload = JSON.parse((event as MessageEvent).data) as BoardUpdatedRealtimeEvent;
				if (typeof payload.actorId === 'string') {
					actorId = payload.actorId;
				}
			} catch {}

			if (actorId && actorId === currentUserId) {
				return;
			}

			scheduleRealtimeReload();
		});
	}

	onMount(() => {
		let cancelled = false;

		const bootstrap = async () => {
			if (!browser) {
				ready = true;
				return;
			}

			const raw = localStorage.getItem('user');
			if (!raw) {
				goto('/login');
				return;
			}

			let currentUser: { id?: string } | null = null;
			try {
				currentUser = JSON.parse(raw);
			} catch {
				localStorage.removeItem('user');
				localStorage.removeItem('authToken');
				goto('/login');
				return;
			}

			if (!currentUser?.id) {
				goto('/login');
				return;
			}

			currentUserId = currentUser.id;
			board_name = data.board?.name ?? board_name;

			const inviteToken = new URL(window.location.href).searchParams.get('invite') ?? '';
			if (inviteToken) {
				await tryJoinWithInvite(inviteToken);
			}

			await loadBoardFull();
			if (cancelled) {
				return;
			}

			startRealtimeSync();
			ready = true;
		};

		void bootstrap();

		return () => {
			cancelled = true;
			stopRealtimeSync();
		};
	});

	async function addList() {
		if (!canEdit) return;
		const name = newListName.trim();
		if (!name || !boardId || !currentUserId) return;

		try {
			const res = await fetch('/api/lists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId, name, userId: currentUserId })
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
		if (!canEdit) return;
		const list = lists[index];
		if (!list) return;
		lists = lists.filter((_, i) => i !== index);
		if (list.uuid) {
			try {
				const userParam = encodeURIComponent(currentUserId);
				const listParam = encodeURIComponent(list.uuid);
				const res = await fetch(`/api/lists?id=${listParam}&userId=${userParam}`, {
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
		if (!canEdit) return;
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
				body: JSON.stringify({ listId: listUuid, name: newName.trim(), userId: currentUserId })
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
		if (!browser || !boardId || !canManage) return;

		const name = board_name.trim();
		if (!name) return;

		try {
			await fetch('/api/boards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId, name, userId: currentUserId })
			});
		} catch (err) {
			console.error('Erreur rename board', err);
		}
	}

	async function addCard(listIndex: number) {
		if (!canEdit) return;
		const list = lists[listIndex];
		if (!list || !list.uuid) return;

		const title = (list.newCardTitle ?? '').trim();
		if (!title) return;
		const localId = nextLocalCardId++;
		const newCard: UiCard = {
			id: localId,
			title,
			description: '',
			dueDate: '',
			assignees: [],
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
				body: JSON.stringify({ listId: list.uuid, title, userId: currentUserId })
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
		if (!canEdit) return;
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

		if (selectedCardRef && selectedCardRef.listIndex === listIndex) {
			if (selectedCardRef.cardIndex === cardIndex) {
				closeDetails();
			} else if (selectedCardRef.cardIndex > cardIndex) {
				selectedCardRef = {
					listIndex,
					cardIndex: selectedCardRef.cardIndex - 1
				};
			}
		}

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
				const encodedCardId = encodeURIComponent(cardUuid);
				const encodedUserId = encodeURIComponent(currentUserId);
				const res = await fetch(`/api/cards?id=${encodedCardId}&userId=${encodedUserId}`, {
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

		const card = lists[listIndex]?.cards[cardIndex];
		if (!card) return;

		editorDescription = card.description ?? '';
		editorDueDate = card.dueDate ?? '';
		editorNewTag = '';
		editorNewAssignee = '';
	}

	function closeDetails() {
		selectedCardRef = null;
		editorDescription = '';
		editorDueDate = '';
		editorNewTag = '';
		editorNewAssignee = '';
	}

	function getSelectedCardContext() {
		if (!selectedCardRef) return null;
		const { listIndex, cardIndex } = selectedCardRef;
		const list = lists[listIndex];
		const card = list?.cards[cardIndex];

		if (!list || !card) return null;
		return { listIndex, cardIndex, list, card };
	}

	async function persistCardFields(cardUuid: string | undefined, fields: Record<string, unknown>) {
		if (!browser || !cardUuid || !canEdit) return;
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

	async function handleUpdateCompleted(
		event: CustomEvent<{ listIndex: number; cardIndex: number; completed: boolean }>
	) {
		const { listIndex, cardIndex, completed } = event.detail;
		const list = lists[listIndex];
		if (!list || !list.cards[cardIndex]) return;

		const card = list.cards[cardIndex];
		card.completed = completed;
		await persistCardFields(card.uuid, { completed });
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
		if (!browser || !cardUuid || !fromListUuid || !toListUuid || !canEdit) return;

		try {
			await fetch('/api/cards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardId: cardUuid,
					fromListId: fromListUuid,
					toListId: toListUuid,
					targetIndex,
					userId: currentUserId
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
		if (!browser || !canEdit) return;

		const updates = lists
			.map((list, order) => (list.uuid ? { listId: list.uuid, order } : null))
			.filter((entry): entry is { listId: string; order: number } => entry !== null);

		await Promise.all(
			updates.map(async ({ listId, order }) => {
				try {
					const res = await fetch('/api/lists', {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ listId, order, userId: currentUserId })
					});
					if (!res.ok) {
						console.error('Erreur persist list order', listId, order, await res.text());
					}
				} catch (err) {
					console.error('Erreur persist list order', err);
				}
			})
		);
	}

	function setCardDropPreview(targetListIndex: number, targetCardIndex: number) {
		if (!draggedCardRef) return;
		cardDropPreview = {
			listIndex: targetListIndex,
			targetIndex: targetCardIndex
		};
	}

	function handleDragStart(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		if (!canEdit) return;
		draggedCardRef = event.detail;
		cardDropPreview = null;
		listDropPreviewIndex = null;
	}

	function handleDragEnd() {
		draggedCardRef = null;
		cardDropPreview = null;
	}

	function handleListDragStart(index: number, event: DragEvent) {
		if (!canEdit) {
			event.preventDefault();
			return;
		}
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
		listDropPreviewIndex = null;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', `list:${index}`);
		}
	}

	function handleListDragEnd() {
		draggedListIndex = null;
		listDropPreviewIndex = null;
	}

	function setListDropPreview(targetInsertIndex: number) {
		if (draggedListIndex === null) return;
		const previewIndex = Math.max(0, Math.min(targetInsertIndex, lists.length));
		const isNoOpPosition =
			previewIndex === draggedListIndex || previewIndex === draggedListIndex + 1;
		listDropPreviewIndex = isNoOpPosition ? null : previewIndex;
	}

	function handleListDragOver(targetIndex: number, event: DragEvent) {
		if (draggedListIndex === null) return;
		event.preventDefault();

		const targetElement = event.currentTarget as HTMLElement | null;
		const rect = targetElement?.getBoundingClientRect();
		const dropAfter = rect ? event.clientX > rect.left + rect.width / 2 : false;
		const targetInsertIndex = dropAfter ? targetIndex + 1 : targetIndex;
		setListDropPreview(targetInsertIndex);
	}

	async function handleListDrop(targetIndex: number, event: DragEvent) {
		if (!canEdit) return;
		if (draggedListIndex === null) return;
		event.preventDefault();

		const targetElement = event.currentTarget as HTMLElement | null;
		const rect = targetElement?.getBoundingClientRect();
		const dropAfter = rect ? event.clientX > rect.left + rect.width / 2 : false;
		const targetInsertIndex = dropAfter ? targetIndex + 1 : targetIndex;

		const moved = moveListInMemory(draggedListIndex, targetInsertIndex);
		draggedListIndex = null;
		listDropPreviewIndex = null;
		if (!moved || !moved.changed) return;

		selectedCardRef = null;
		await persistListsOrder();
	}

	function handleListPreviewDragOver(insertIndex: number, event: DragEvent) {
		if (draggedListIndex === null) return;
		event.preventDefault();
		setListDropPreview(insertIndex);
	}

	async function handleListPreviewDrop(insertIndex: number, event: DragEvent) {
		if (!canEdit) return;
		if (draggedListIndex === null) return;
		event.preventDefault();

		const moved = moveListInMemory(draggedListIndex, insertIndex);
		draggedListIndex = null;
		listDropPreviewIndex = null;
		if (!moved || !moved.changed) return;

		selectedCardRef = null;
		await persistListsOrder();
	}

	function handleCardDragOver(
		event: CustomEvent<{ listIndex: number; cardIndex: number; dropAfter: boolean }>
	) {
		if (!canEdit) return;
		if (!draggedCardRef) return;
		const { listIndex, cardIndex, dropAfter } = event.detail;
		const targetIndex = cardIndex + (dropAfter ? 1 : 0);
		setCardDropPreview(listIndex, targetIndex);
	}

	function getCardInsertIndexFromPointer(listIndex: number, event: DragEvent) {
		const list = lists[listIndex];
		const currentTarget = event.currentTarget as HTMLElement | null;
		if (!list || !currentTarget) return 0;

		const cardElements = Array.from(
			currentTarget.querySelectorAll<HTMLElement>('[data-card-item="true"]')
		);
		if (!cardElements.length) return 0;

		for (let i = 0; i < cardElements.length; i += 1) {
			const rect = cardElements[i].getBoundingClientRect();
			const shouldInsertBefore = event.clientY < rect.top + rect.height / 2;
			if (shouldInsertBefore) {
				return i;
			}
		}

		return cardElements.length;
	}

	function handleCardListDragOver(listIndex: number, event: DragEvent) {
		if (!canEdit) return;
		if (!draggedCardRef || !lists[listIndex]) return;
		event.preventDefault();
		const targetIndex = getCardInsertIndexFromPointer(listIndex, event);
		setCardDropPreview(listIndex, targetIndex);
	}

	async function handleDropOnCard(
		event: CustomEvent<{ listIndex: number; cardIndex: number; dropAfter: boolean }>
	) {
		if (!canEdit) return;
		if (!draggedCardRef) return;
		const { listIndex, cardIndex, dropAfter } = event.detail;
		const targetIndex = cardIndex + (dropAfter ? 1 : 0);

		const moved = moveCardInMemory(
			draggedCardRef.listIndex,
			draggedCardRef.cardIndex,
			listIndex,
			targetIndex
		);

		draggedCardRef = null;
		cardDropPreview = null;
		if (!moved || moved.unchanged) return;

		await persistCardMove(moved.card.uuid, moved.fromListUuid, moved.toListUuid, moved.insertIndex);
	}

	async function handleDropOnList(listIndex: number, event: DragEvent) {
		if (!canEdit) return;
		if (!draggedCardRef || !lists[listIndex]) return;
		event.preventDefault();
		const targetIndex = getCardInsertIndexFromPointer(listIndex, event);

		const moved = moveCardInMemory(
			draggedCardRef.listIndex,
			draggedCardRef.cardIndex,
			listIndex,
			targetIndex
		);

		draggedCardRef = null;
		cardDropPreview = null;
		if (!moved || moved.unchanged) return;

		await persistCardMove(moved.card.uuid, moved.fromListUuid, moved.toListUuid, moved.insertIndex);
	}

	function handleEditorTitleInput(event: Event) {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		const target = event.currentTarget as HTMLInputElement;
		context.card.title = target.value;
	}

	async function handleEditorTitleBlur() {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		const normalizedTitle = context.card.title.trim();
		if (!normalizedTitle) return;

		context.card.title = normalizedTitle;
		await persistCardFields(context.card.uuid, { name: normalizedTitle });
	}

	function handleEditorDescriptionInput(event: Event) {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		const target = event.currentTarget as HTMLTextAreaElement;
		editorDescription = target.value;
		context.card.description = target.value;
	}

	async function handleEditorDescriptionBlur() {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		await persistCardFields(context.card.uuid, { description: editorDescription });
	}

	function handleEditorDueDateInput(event: Event) {
		if (!canEdit) return;
		const target = event.currentTarget as HTMLInputElement;
		editorDueDate = target.value;
	}

	async function saveEditorDueDate() {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		context.card.dueDate = editorDueDate;
		await persistCardFields(context.card.uuid, { dueDate: editorDueDate });
	}

	async function clearEditorDueDate() {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		editorDueDate = '';
		context.card.dueDate = '';
		await persistCardFields(context.card.uuid, { dueDate: '' });
	}

	async function addEditorAssignee() {
		if (!canEdit) return;
		const assignee = editorNewAssignee.trim();
		if (!assignee) return;

		const context = getSelectedCardContext();
		if (!context) return;

		if (
			context.card.assignees.some(
				(existingAssignee) => existingAssignee.toLowerCase() === assignee.toLowerCase()
			)
		) {
			editorNewAssignee = '';
			return;
		}

		context.card.assignees = [...context.card.assignees, assignee];
		editorNewAssignee = '';
		await persistCardFields(context.card.uuid, { assignees: context.card.assignees });
	}

	async function removeEditorAssignee(assignee: string) {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context) return;

		context.card.assignees = context.card.assignees.filter((entry) => entry !== assignee);
		await persistCardFields(context.card.uuid, { assignees: context.card.assignees });
	}

	async function addEditorTag() {
		if (!canEdit) return;
		const tag = editorNewTag.trim();
		if (!tag) return;

		const context = getSelectedCardContext();
		if (!context || !context.card.uuid) return;

		if (context.card.tags.some((existingTag) => existingTag.toLowerCase() === tag.toLowerCase())) {
			editorNewTag = '';
			return;
		}

		context.card.tags = [...context.card.tags, tag];
		editorNewTag = '';

		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: context.card.uuid, name: tag, userId: currentUserId })
			});

			if (!res.ok) {
				context.card.tags = context.card.tags.filter((existingTag) => existingTag !== tag);
				console.error('Erreur API add tag', await res.text());
			}
		} catch (err) {
			context.card.tags = context.card.tags.filter((existingTag) => existingTag !== tag);
			console.error('Erreur réseau add tag', err);
		}
	}

	async function removeEditorTag(tag: string) {
		if (!canEdit) return;
		const context = getSelectedCardContext();
		if (!context || !context.card.uuid) return;

		context.card.tags = context.card.tags.filter((entry) => entry !== tag);

		try {
			const res = await fetch('/api/tags', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: context.card.uuid, name: tag, userId: currentUserId })
			});

			if (!res.ok) {
				console.error('Erreur API delete tag', await res.text());
			}
		} catch (err) {
			console.error('Erreur réseau API delete tag', err);
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
				class="flex-1 rounded-md border-0 bg-transparent px-2 py-1 text-2xl font-bold text-slate-100 transition-colors hover:bg-slate-700/60 focus:outline-0"
				title="Board Name"
				type="text"
				bind:value={board_name}
				placeholder="Board name..."
				readonly={!canManage}
				onblur={persistBoardName}
			/>
			{#if boardId && canManage}
				<a
					href={`/b/${boardId}/settings`}
					class="rounded-md border border-sky-300/25 bg-slate-700/75 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-600/90"
				>
					Paramètres
				</a>
			{/if}
		</div>
		{#if inviteMessage}
			<p
				class="mb-3 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
			>
				{inviteMessage}
			</p>
		{/if}
		{#if loadError}
			<p
				class="mb-3 rounded-md border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
			>
				{loadError}
			</p>
		{/if}
		<p class="mb-1 px-2 text-xs uppercase tracking-wider text-slate-300">
			Role: {boardRole ?? 'unknown'}
			{canEdit ? '(editor access)' : '(read only)'}
		</p>

		<div class="flex gap-3 overflow-x-auto px-2 py-3">
			{#each lists as list, i}
				{#if listDropPreviewIndex === i}
					<div
						class={`min-w-[220px] self-stretch rounded-xl border-2 border-dashed border-sky-300/70 bg-sky-400/20 ${draggedListIndex === null ? 'pointer-events-none' : ''}`}
						role="group"
						aria-label="List drop preview"
						ondragover={(event) => handleListPreviewDragOver(i, event)}
						ondrop={(event) => void handleListPreviewDrop(i, event)}
					></div>
				{/if}
				<div
					class="group/list relative flex min-w-[220px] flex-col rounded-xl border border-sky-300/20 bg-slate-800/70 p-3 text-slate-100 shadow-md shadow-slate-950/50 backdrop-blur-sm"
					role="group"
					draggable={canEdit}
					ondragstart={(event) => handleListDragStart(i, event)}
					ondragend={handleListDragEnd}
					ondragover={(event) => handleListDragOver(i, event)}
					ondrop={(event) => handleListDrop(i, event)}
				>
					<div class="flex min-w-full flex-row items-center gap-2">
						<input
							class="w-full flex-1 rounded-md border-0 bg-transparent px-1 py-1 font-mono text-lg font-bold text-slate-100 transition-colors hover:bg-slate-700/50"
							value={list.name}
							readonly={!canEdit}
							oninput={(e) => updateListName(i, e)}
						/>
						{#if canEdit}
							<div class="group/list-corner relative h-8 w-8 shrink-0">
								<button
									type="button"
									title="Delete list"
									class="pointer-events-none absolute right-0 top-0 h-8 w-8 cursor-pointer rounded-full border border-rose-300/20 bg-slate-800/90 text-center text-sm font-bold text-rose-200 opacity-0 shadow-sm shadow-black/30 transition-all group-hover/list-corner:pointer-events-auto group-hover/list-corner:opacity-100 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
									onclick={() => deleteList(i)}
								>
									✕
								</button>
							</div>
						{/if}
					</div>

					<ol
						class="mt-3 flex min-h-0 flex-1 flex-col gap-1.5"
						ondragover={(event) => {
							if (draggedListIndex !== null) {
								handleListDragOver(i, event);
								return;
							}
							handleCardListDragOver(i, event);
						}}
						ondrop={(event) => {
							if (draggedListIndex !== null) {
								void handleListDrop(i, event);
								return;
							}
							void handleDropOnList(i, event);
						}}
					>
						{#each list.cards as card, j}
							{#if cardDropPreview && cardDropPreview.listIndex === i && cardDropPreview.targetIndex === j}
								<li
									class="pointer-events-none h-14 rounded-lg border-2 border-dashed border-sky-300/70 bg-sky-400/20"
								></li>
							{/if}
							<Card
								{card}
								{canEdit}
								listIndex={i}
								cardIndex={j}
								on:updateCompleted={handleUpdateCompleted}
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

					<form
						class="mt-2.5 flex gap-1.5"
						ondragover={(event) => {
							if (draggedListIndex !== null) {
								handleListDragOver(i, event);
							}
						}}
						ondrop={(event) => {
							if (draggedListIndex !== null) {
								void handleListDrop(i, event);
							}
						}}
						onsubmit={(event) => {
							event.preventDefault();
							addCard(i);
						}}
					>
						<input
							type="text"
							class="w-full rounded-md border border-slate-600/60 bg-slate-700/80 p-1.5 font-mono text-sm text-slate-100 shadow-sm shadow-black/20 placeholder:text-slate-300"
							placeholder="New card title..."
							value={list.newCardTitle}
							disabled={!canEdit}
							oninput={(e) => updateListNewCardTitle(i, e)}
						/>
						<button
							type="submit"
							disabled={!canEdit}
							class="w-20 cursor-pointer rounded-md bg-sky-600 px-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/50 transition-colors hover:bg-sky-500"
						>
							+ Add
						</button>
					</form>
				</div>
			{/each}
			{#if listDropPreviewIndex === lists.length}
				<div
					class={`min-w-[220px] self-stretch rounded-xl border-2 border-dashed border-sky-300/70 bg-sky-400/20 ${draggedListIndex === null ? 'pointer-events-none' : ''}`}
					role="group"
					aria-label="List drop preview"
					ondragover={(event) => handleListPreviewDragOver(lists.length, event)}
					ondrop={(event) => void handleListPreviewDrop(lists.length, event)}
				></div>
			{/if}

			{#if canEdit}
				<div
					class="min-w-[220px] rounded-xl border border-dashed border-sky-300/35 bg-slate-800/55 p-3 text-slate-100 shadow-md shadow-slate-950/40 backdrop-blur-sm"
				>
					<form
						onsubmit={(event) => {
							event.preventDefault();
							addList();
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
		</div>
	</div>
	{#if selectedCard && selectedList}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
			<div
				class="relative w-full max-w-3xl rounded-xl border border-sky-300/30 bg-slate-900/95 p-5 text-slate-100 shadow-xl shadow-slate-950/70 backdrop-blur-sm"
			>
				<div class="mb-1 flex items-start gap-2">
					<input
						type="text"
						class="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-lg font-bold text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						value={selectedCard.title}
						readonly={!canEdit}
						oninput={handleEditorTitleInput}
						onblur={handleEditorTitleBlur}
					/>
					<button
						type="button"
						class="ml-2 mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded-full border border-slate-500/70 bg-slate-800/90 text-slate-300 shadow-md shadow-slate-950/70 transition-all hover:border-sky-300/70 hover:bg-sky-500/20 hover:text-slate-100"
						onclick={closeDetails}
					>
						✕
					</button>
				</div>
				<p class="mb-4 text-xs text-slate-300">
					in list <span class="font-semibold text-sky-200">{selectedList.name}</span>
				</p>

				<div class="grid gap-4 md:grid-cols-2">
					<section class="md:col-span-2">
						<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
							Description
						</h3>
						<textarea
							class="min-h-28 w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
							placeholder="Write a description..."
							value={editorDescription}
							readonly={!canEdit}
							oninput={handleEditorDescriptionInput}
							onblur={handleEditorDescriptionBlur}
						></textarea>
					</section>

					<section class="min-w-0">
						<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
							Assignées
						</h3>
						<div class="mb-2 flex flex-wrap gap-1.5">
							{#if selectedCard.assignees?.length}
								{#each selectedCard.assignees as assignee}
									<span
										class="inline-flex items-center gap-1 rounded-md bg-slate-700/90 px-2 py-1 text-xs text-slate-100 ring-1 ring-slate-500"
									>
										{assignee}
										{#if canEdit}
											<button
												type="button"
												class="cursor-pointer rounded px-1 text-slate-300 shadow-sm shadow-slate-950/60 transition-all hover:bg-rose-500/25 hover:text-rose-200 active:translate-y-px"
												onclick={() => removeEditorAssignee(assignee)}
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
								addEditorAssignee();
							}}
						>
							<input
								type="text"
								class="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
								placeholder="Add assignee..."
								disabled={!canEdit}
								bind:value={editorNewAssignee}
							/>
							<button
								type="submit"
								disabled={!canEdit}
								class="h-8 w-16 min-w-[4rem] shrink-0 cursor-pointer whitespace-nowrap rounded-md bg-sky-600 px-2 py-1 text-center text-xs font-semibold text-white shadow-md shadow-sky-900/50 transition-all hover:bg-sky-500 active:translate-y-px"
							>
								+ Add
							</button>
						</form>
					</section>

					<section>
						<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
							Due Date
						</h3>
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
											onclick={clearEditorDueDate}
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
								saveEditorDueDate();
							}}
						>
							<input
								type="date"
								class="min-w-0 flex-1 appearance-none rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm text-slate-100 focus:border-sky-400 focus:outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-0 [&::-webkit-calendar-picker-indicator]:w-0 [&::-webkit-calendar-picker-indicator]:opacity-0"
								value={editorDueDate}
								disabled={!canEdit}
								oninput={handleEditorDueDateInput}
							/>
							<button
								type="submit"
								disabled={!canEdit}
								class="h-8 w-16 min-w-[4rem] shrink-0 cursor-pointer whitespace-nowrap rounded-md bg-sky-600 px-2 py-1 text-center text-xs font-semibold text-white shadow-md shadow-sky-900/50 transition-all hover:bg-sky-500 active:translate-y-px"
							>
								Set
							</button>
						</form>
					</section>

					<section class="md:col-span-2">
						<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-200">Tags</h3>
						<div class="mb-2 flex flex-wrap gap-1.5">
							{#if selectedCard.tags?.length}
								{#each selectedCard.tags as tag}
									<span
										class="inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-xs text-sky-100 ring-1 ring-sky-300/30"
									>
										{tag}
										{#if canEdit}
											<button
												type="button"
												class="cursor-pointer rounded px-1 text-sky-200 shadow-sm shadow-slate-950/60 transition-all hover:bg-rose-500/25 hover:text-rose-200 active:translate-y-px"
												onclick={() => removeEditorTag(tag)}
												title="Remove tag"
											>
												✕
											</button>
										{/if}
									</span>
								{/each}
							{:else}
								<p class="text-xs text-slate-400">No tags yet.</p>
							{/if}
						</div>
						<form
							class="flex gap-1.5"
							onsubmit={(event) => {
								event.preventDefault();
								addEditorTag();
							}}
						>
							<input
								type="text"
								class="w-full rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
								placeholder="Add tag..."
								disabled={!canEdit}
								bind:value={editorNewTag}
							/>
							<button
								type="submit"
								disabled={!canEdit}
								class="h-8 w-16 min-w-[4rem] shrink-0 cursor-pointer whitespace-nowrap rounded-md bg-sky-600 px-2 py-1 text-center text-xs font-semibold text-white shadow-md shadow-sky-900/50 transition-all hover:bg-sky-500 active:translate-y-px"
							>
								+ Add
							</button>
						</form>
					</section>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div
		class="flex min-h-[calc(100vh-4rem)] w-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900"
	>
		<p
			class="rounded-md border border-sky-300/30 bg-slate-900/85 px-3 py-1.5 text-sm text-slate-100 shadow-sm shadow-slate-950/60"
		>
			Chargement du board...
		</p>
	</div>
{/if}
