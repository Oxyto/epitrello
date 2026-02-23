<script lang="ts">
	import BoardWorkspaceListColumn from './BoardWorkspaceListColumn.svelte';
	import type { BoardMember, CardRef, FilteredListView } from './board.types';

	const {
		visibleLists,
		canEdit,
		canDragAndDrop,
		boardMembers,
		onDeleteList,
		onUpdateListName,
		onUpdateListNewCardTitle,
		onAddCard,
		onUpdateCompleted,
		onDeleteCard,
		onOpenDetails,
		onMoveCardRequest,
		onMoveListRequest
	} = $props<{
		visibleLists: FilteredListView[];
		canEdit: boolean;
		canDragAndDrop: boolean;
		boardMembers: BoardMember[];
		onDeleteList: (index: number) => Promise<void>;
		onUpdateListName: (index: number, event: Event) => Promise<void>;
		onUpdateListNewCardTitle: (index: number, event: Event) => void;
		onAddCard: (index: number) => Promise<void>;
		onUpdateCompleted: (
			event: CustomEvent<{ listIndex: number; cardIndex: number; completed: boolean }>
		) => Promise<void>;
		onDeleteCard: (event: CustomEvent<{ listIndex: number; cardIndex: number }>) => Promise<void>;
		onOpenDetails: (event: CustomEvent<{ listIndex: number; cardIndex: number }>) => void;
		onMoveCardRequest: (params: {
			fromListIndex: number;
			fromCardIndex: number;
			toListIndex: number;
			targetIndex: number;
		}) => Promise<void>;
		onMoveListRequest: (params: { fromIndex: number; targetInsertIndex: number }) => Promise<void>;
	}>();

	let draggedCardRef = $state<CardRef | null>(null);
	let cardDropPreview = $state<{ listIndex: number; targetIndex: number } | null>(null);
	let draggedCardHeight = $state(56);
	let draggedListIndex = $state<number | null>(null);
	let listDropPreviewIndex = $state<number | null>(null);

	function setCardDropPreview(targetListIndex: number, targetCardIndex: number) {
		if (!draggedCardRef) return;
		cardDropPreview = { listIndex: targetListIndex, targetIndex: targetCardIndex };
	}

	function handleDragStart(
		event: CustomEvent<{ listIndex: number; cardIndex: number; height?: number | null }>
	) {
		if (!canDragAndDrop) return;
		const { listIndex, cardIndex, height } = event.detail;
		draggedCardRef = { listIndex, cardIndex };
		draggedCardHeight = height && height > 0 ? height : 56;
		cardDropPreview = null;
		listDropPreviewIndex = null;
	}

	function handleDragEnd() {
		draggedCardRef = null;
		cardDropPreview = null;
		draggedCardHeight = 56;
	}

	function handleListDragStart(index: number, event: DragEvent) {
		if (!canDragAndDrop) {
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
		const previewIndex = Math.max(0, Math.min(targetInsertIndex, visibleLists.length));
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
		if (!canDragAndDrop || draggedListIndex === null) return;
		event.preventDefault();

		const targetElement = event.currentTarget as HTMLElement | null;
		const rect = targetElement?.getBoundingClientRect();
		const dropAfter = rect ? event.clientX > rect.left + rect.width / 2 : false;
		const targetInsertIndex = dropAfter ? targetIndex + 1 : targetIndex;
		const fromIndex = draggedListIndex;

		draggedListIndex = null;
		listDropPreviewIndex = null;
		await onMoveListRequest({ fromIndex, targetInsertIndex });
	}

	function handleListPreviewDragOver(insertIndex: number, event: DragEvent) {
		if (draggedListIndex === null) return;
		event.preventDefault();
		setListDropPreview(insertIndex);
	}

	async function handleListPreviewDrop(insertIndex: number, event: DragEvent) {
		if (!canDragAndDrop || draggedListIndex === null) return;
		event.preventDefault();

		const fromIndex = draggedListIndex;
		draggedListIndex = null;
		listDropPreviewIndex = null;
		await onMoveListRequest({ fromIndex, targetInsertIndex: insertIndex });
	}

	function handleCardDragOver(
		event: CustomEvent<{ listIndex: number; cardIndex: number; dropAfter: boolean }>
	) {
		if (!canDragAndDrop || !draggedCardRef) return;
		const { listIndex, cardIndex, dropAfter } = event.detail;
		const targetIndex = cardIndex + (dropAfter ? 1 : 0);
		setCardDropPreview(listIndex, targetIndex);
	}

	function getCardInsertIndexFromPointer(listIndex: number, event: DragEvent) {
		const list = visibleLists[listIndex];
		const currentTarget = event.currentTarget as HTMLElement | null;
		if (!list || !currentTarget) return 0;

		const cardElements = Array.from(
			currentTarget.querySelectorAll<HTMLElement>('[data-card-item="true"]')
		);
		if (!cardElements.length) return 0;

		for (let i = 0; i < cardElements.length; i += 1) {
			const rect = cardElements[i].getBoundingClientRect();
			if (event.clientY < rect.top + rect.height / 2) {
				return i;
			}
		}

		return cardElements.length;
	}

	function handleCardsDragOver(listIndex: number, event: DragEvent) {
		if (!canDragAndDrop) return;
		if (draggedListIndex !== null) {
			handleListDragOver(listIndex, event);
			return;
		}
		if (!draggedCardRef || !visibleLists[listIndex]) return;
		event.preventDefault();
		setCardDropPreview(listIndex, getCardInsertIndexFromPointer(listIndex, event));
	}

	async function handleCardsDrop(listIndex: number, event: DragEvent) {
		if (!canDragAndDrop) return;
		if (draggedListIndex !== null) {
			await handleListDrop(listIndex, event);
			return;
		}
		if (!draggedCardRef || !visibleLists[listIndex]) return;
		event.preventDefault();

		const targetIndex = getCardInsertIndexFromPointer(listIndex, event);
		const from = draggedCardRef;
		draggedCardRef = null;
		cardDropPreview = null;
		draggedCardHeight = 56;
		await onMoveCardRequest({ ...from, toListIndex: listIndex, targetIndex });
	}

	function handleFormDragOver(listIndex: number, event: DragEvent) {
		if (!canDragAndDrop || draggedListIndex === null) return;
		handleListDragOver(listIndex, event);
	}

	async function handleFormDrop(listIndex: number, event: DragEvent) {
		if (!canDragAndDrop || draggedListIndex === null) return;
		await handleListDrop(listIndex, event);
	}

	async function handleDropOnCard(
		event: CustomEvent<{ listIndex: number; cardIndex: number; dropAfter: boolean }>
	) {
		if (!canDragAndDrop || !draggedCardRef) return;
		const { listIndex, cardIndex, dropAfter } = event.detail;
		const targetIndex = cardIndex + (dropAfter ? 1 : 0);
		const from = draggedCardRef;

		draggedCardRef = null;
		cardDropPreview = null;
		draggedCardHeight = 56;
		await onMoveCardRequest({ ...from, toListIndex: listIndex, targetIndex });
	}
</script>

<div class="flex gap-3 overflow-x-auto px-2 py-3">
	{#each visibleLists as list, i (list.uuid ?? i)}
		{#if canDragAndDrop && listDropPreviewIndex === i}
			<div
				class={`min-w-55 self-stretch rounded-xl border-2 border-dashed border-sky-300/70 bg-sky-400/20 ${draggedListIndex === null ? 'pointer-events-none' : ''}`}
				role="group"
				aria-label="List drop preview"
				ondragover={(event) => handleListPreviewDragOver(i, event)}
				ondrop={(event) => void handleListPreviewDrop(i, event)}
			></div>
		{/if}

		<BoardWorkspaceListColumn
			{list}
			listIndex={i}
			{canEdit}
			{canDragAndDrop}
			{boardMembers}
			{cardDropPreview}
			{draggedCardHeight}
			{draggedListIndex}
			onListDragStart={handleListDragStart}
			onListDragEnd={handleListDragEnd}
			onListDragOver={handleListDragOver}
			onListDrop={handleListDrop}
			onCardsDragOver={handleCardsDragOver}
			onCardsDrop={handleCardsDrop}
			{onDeleteList}
			{onUpdateListName}
			{onUpdateListNewCardTitle}
			{onAddCard}
			{onUpdateCompleted}
			{onDeleteCard}
			{onOpenDetails}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onCardDragOver={handleCardDragOver}
			onDropOnCard={handleDropOnCard}
			onFormDragOver={handleFormDragOver}
			onFormDrop={handleFormDrop}
		/>
	{/each}

	{#if canDragAndDrop && listDropPreviewIndex === visibleLists.length}
		<div
			class={`min-w-55 self-stretch rounded-xl border-2 border-dashed border-sky-300/70 bg-sky-400/20 ${draggedListIndex === null ? 'pointer-events-none' : ''}`}
			role="group"
			aria-label="List drop preview"
			ondragover={(event) => handleListPreviewDragOver(visibleLists.length, event)}
			ondrop={(event) => void handleListPreviewDrop(visibleLists.length, event)}
		></div>
	{/if}
</div>
