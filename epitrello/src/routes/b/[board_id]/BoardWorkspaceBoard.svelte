<script lang="ts">
	import BoardCardDetailsModal from './BoardCardDetailsModal.svelte';
	import BoardWorkspaceAddListForm from './BoardWorkspaceAddListForm.svelte';
	import BoardWorkspaceColumns from './BoardWorkspaceColumns.svelte';
	import {
		createCardApi,
		createListApi,
		deleteCardApi,
		deleteListApi,
		patchCardFieldsApi,
		patchCardMoveApi,
		patchListsOrderApi,
		renameListApi
	} from './board-workspace-api';
	import { moveCardInLists, moveListInLists } from './board-dnd';
	import type { BoardMember, CardRef, FilteredListView, UiList } from './board.types';

	let {
		boardId,
		currentUserId,
		canEdit,
		canDragAndDrop,
		boardMembers,
		lists = $bindable(),
		visibleLists
	}: {
		boardId: string | undefined;
		currentUserId: string;
		canEdit: boolean;
		canDragAndDrop: boolean;
		boardMembers: BoardMember[];
		lists: UiList[];
		visibleLists: FilteredListView[];
	} = $props();

	let newListName = $state('');
	let nextLocalCardId = 1;
	let selectedCardRef = $state<CardRef | null>(null);
	let selectedCardKey = $state<string | null>(null);

	const selectedList = $derived<UiList | null>(
		selectedCardRef && lists[selectedCardRef.listIndex] ? lists[selectedCardRef.listIndex] : null
	);
	const selectedCard = $derived(
		selectedCardRef && selectedList && selectedList.cards[selectedCardRef.cardIndex]
			? selectedList.cards[selectedCardRef.cardIndex]
			: null
	);

	function selectionKeyForCard(card: { uuid?: string; id: number }) {
		return card.uuid ? `uuid:${card.uuid}` : `local:${card.id}`;
	}

	$effect(() => {
		const maxId = lists.reduce(
			(currentMax, list) => Math.max(currentMax, ...list.cards.map((card) => card.id), 0),
			0
		);
		if (maxId >= nextLocalCardId) nextLocalCardId = maxId + 1;
	});

	$effect(() => {
		if (!selectedCardKey) {
			selectedCardRef = null;
			return;
		}

		let restoredRef: CardRef | null = null;
		for (let listIndex = 0; listIndex < lists.length; listIndex += 1) {
			const cardIndex = lists[listIndex].cards.findIndex(
				(card) => selectionKeyForCard(card) === selectedCardKey
			);
			if (cardIndex >= 0) {
				restoredRef = { listIndex, cardIndex };
				break;
			}
		}

		if (!restoredRef) {
			selectedCardRef = null;
			selectedCardKey = null;
			return;
		}

		if (
			!selectedCardRef ||
			selectedCardRef.listIndex !== restoredRef.listIndex ||
			selectedCardRef.cardIndex !== restoredRef.cardIndex
		) {
			selectedCardRef = restoredRef;
		}
	});

	async function addList() {
		if (!canEdit) return;
		const name = newListName.trim();
		if (!name || !boardId || !currentUserId) return;

		const payload = await createListApi(boardId, currentUserId, name);
		if (!payload) return;
		lists = [...lists, { uuid: payload.id, name: payload.name, cards: [], newCardTitle: '' }];
		newListName = '';
	}

	async function deleteList(index: number) {
		if (!canEdit) return;
		const list = lists[index];
		if (!list) return;
		if (selectedCardRef && selectedCardRef.listIndex === index) closeDetails();

		lists = lists.filter((_, i) => i !== index);
		if (list.uuid) await deleteListApi(list.uuid, currentUserId);
	}

	async function updateListName(index: number, event: Event) {
		if (!canEdit) return;
		const target = event.currentTarget as HTMLInputElement;
		if (!lists[index]) return;

		const newName = target.value;
		lists[index].name = newName;
		const listUuid = lists[index].uuid;
		if (listUuid) await renameListApi(listUuid, currentUserId, newName);
	}

	function updateListNewCardTitle(index: number, event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (!lists[index]) return;
		lists[index].newCardTitle = target.value;
	}

	async function addCard(listIndex: number) {
		if (!canEdit) return;
		const list = lists[listIndex];
		if (!list || !list.uuid) return;

		const title = (list.newCardTitle ?? '').trim();
		if (!title) return;
		const localId = nextLocalCardId++;
		list.cards.push({
			id: localId,
			title,
			description: '',
			dueDate: '',
			assignees: [],
			completed: false,
			tags: [],
			uuid: undefined
		});
		list.newCardTitle = '';

		const payload = await createCardApi(list.uuid, currentUserId, title);
		if (!payload) return;
		const card = list.cards.find((entry) => entry.id === localId);
		if (card) card.uuid = payload.id;
	}

	async function deleteCardAt(listIndex: number, cardIndex: number) {
		if (!canEdit || !lists[listIndex]?.cards[cardIndex]) return;

		const card = lists[listIndex].cards[cardIndex];
		const cardKey = selectionKeyForCard(card);
		const cardUuid = card.uuid;
		if (selectedCardKey === cardKey) {
			closeDetails();
		} else if (
			selectedCardRef &&
			selectedCardRef.listIndex === listIndex &&
			selectedCardRef.cardIndex > cardIndex
		) {
			selectedCardRef = { listIndex, cardIndex: selectedCardRef.cardIndex - 1 };
		}

		lists = lists.map((list, li) =>
			li === listIndex ? { ...list, cards: list.cards.filter((_, ci) => ci !== cardIndex) } : list
		);
		if (cardUuid) await deleteCardApi(cardUuid, currentUserId);
	}

	async function handleDeleteCard(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		await deleteCardAt(event.detail.listIndex, event.detail.cardIndex);
	}

	async function handleDeleteCardFromEditor() {
		if (!selectedCardRef) return;
		await deleteCardAt(selectedCardRef.listIndex, selectedCardRef.cardIndex);
	}

	function handleOpenDetails(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		const { listIndex, cardIndex } = event.detail;
		const card = lists[listIndex]?.cards[cardIndex];
		if (!card) return;
		selectedCardRef = { listIndex, cardIndex };
		selectedCardKey = selectionKeyForCard(card);
	}

	function closeDetails() {
		selectedCardRef = null;
		selectedCardKey = null;
	}

	async function persistCardFields(cardUuid: string | undefined, fields: Record<string, unknown>) {
		if (!cardUuid || !canEdit) return;
		await patchCardFieldsApi(cardUuid, currentUserId, fields);
	}

	async function handleUpdateCompleted(
		event: CustomEvent<{ listIndex: number; cardIndex: number; completed: boolean }>
	) {
		const { listIndex, cardIndex, completed } = event.detail;
		const card = lists[listIndex]?.cards[cardIndex];
		if (!card) return;
		card.completed = completed;
		await persistCardFields(card.uuid, { completed });
	}

	async function handleMoveCardRequest(params: {
		fromListIndex: number;
		fromCardIndex: number;
		toListIndex: number;
		targetIndex: number;
	}) {
		if (!canDragAndDrop) return;
		const moved = moveCardInLists(
			lists,
			params.fromListIndex,
			params.fromCardIndex,
			params.toListIndex,
			params.targetIndex
		);
		if (!moved || moved.unchanged) return;

		lists = moved.nextLists;
		if (moved.card.uuid && moved.fromListUuid && moved.toListUuid) {
			await patchCardMoveApi(
				moved.card.uuid,
				currentUserId,
				moved.fromListUuid,
				moved.toListUuid,
				moved.insertIndex
			);
		}
	}

	async function handleMoveListRequest(params: { fromIndex: number; targetInsertIndex: number }) {
		if (!canDragAndDrop) return;
		const moved = moveListInLists(lists, params.fromIndex, params.targetInsertIndex);
		if (!moved || !moved.changed) return;

		lists = moved.nextLists;
		await patchListsOrderApi(lists, currentUserId);
	}
</script>

<BoardWorkspaceColumns
	{visibleLists}
	{canEdit}
	{canDragAndDrop}
	{boardMembers}
	onDeleteList={deleteList}
	onUpdateListName={updateListName}
	onUpdateListNewCardTitle={updateListNewCardTitle}
	onAddCard={addCard}
	onUpdateCompleted={handleUpdateCompleted}
	onDeleteCard={handleDeleteCard}
	onOpenDetails={handleOpenDetails}
	onMoveCardRequest={handleMoveCardRequest}
	onMoveListRequest={handleMoveListRequest}
/>

<div class="flex gap-3 overflow-x-auto px-2 pb-3">
	<BoardWorkspaceAddListForm {canEdit} bind:newListName={newListName} onAddList={addList} />
</div>

<BoardCardDetailsModal
	{selectedCard}
	selectedListName={selectedList?.name ?? null}
	{boardMembers}
	{currentUserId}
	{canEdit}
	on:close={closeDetails}
	on:delete={() => void handleDeleteCardFromEditor()}
/>
