<script lang="ts">
	import Card from './card.svelte';
	import type { BoardMember, FilteredListView } from './board.types';

	const {
		list,
		listIndex,
		canEdit,
		canDragAndDrop,
		boardMembers,
		cardDropPreview,
		draggedCardHeight,
		draggedListIndex,
		onListDragStart,
		onListDragEnd,
		onListDragOver,
		onListDrop,
		onCardsDragOver,
		onCardsDrop,
		onDeleteList,
		onUpdateListName,
		onUpdateListNewCardTitle,
		onAddCard,
		onUpdateCompleted,
		onDeleteCard,
		onOpenDetails,
		onDragStart,
		onDragEnd,
		onCardDragOver,
		onDropOnCard,
		onFormDragOver,
		onFormDrop
	} = $props<{
		list: FilteredListView;
		listIndex: number;
		canEdit: boolean;
		canDragAndDrop: boolean;
		boardMembers: BoardMember[];
		cardDropPreview: { listIndex: number; targetIndex: number } | null;
		draggedCardHeight: number;
		draggedListIndex: number | null;
		onListDragStart: (index: number, event: DragEvent) => void;
		onListDragEnd: () => void;
		onListDragOver: (index: number, event: DragEvent) => void;
		onListDrop: (index: number, event: DragEvent) => Promise<void>;
		onCardsDragOver: (index: number, event: DragEvent) => void;
		onCardsDrop: (index: number, event: DragEvent) => Promise<void>;
		onDeleteList: (index: number) => Promise<void>;
		onUpdateListName: (index: number, event: Event) => Promise<void>;
		onUpdateListNewCardTitle: (index: number, event: Event) => void;
		onAddCard: (index: number) => Promise<void>;
		onUpdateCompleted: (
			event: CustomEvent<{ listIndex: number; cardIndex: number; completed: boolean }>
		) => Promise<void>;
		onDeleteCard: (event: CustomEvent<{ listIndex: number; cardIndex: number }>) => Promise<void>;
		onOpenDetails: (event: CustomEvent<{ listIndex: number; cardIndex: number }>) => void;
		onDragStart: (
			event: CustomEvent<{ listIndex: number; cardIndex: number; height?: number | null }>
		) => void;
		onDragEnd: () => void;
		onCardDragOver: (
			event: CustomEvent<{ listIndex: number; cardIndex: number; dropAfter: boolean }>
		) => void;
		onDropOnCard: (
			event: CustomEvent<{ listIndex: number; cardIndex: number; dropAfter: boolean }>
		) => Promise<void>;
		onFormDragOver: (index: number, event: DragEvent) => void;
		onFormDrop: (index: number, event: DragEvent) => Promise<void>;
	}>();
</script>

<div
	class="group/list relative flex min-w-55 flex-col rounded-xl border border-sky-300/20 bg-slate-800/70 p-3 text-slate-100 shadow-md shadow-slate-950/50 backdrop-blur-sm"
	role="group"
	draggable={canDragAndDrop}
	ondragstart={(event) => onListDragStart(listIndex, event)}
	ondragend={onListDragEnd}
	ondragover={(event) => onListDragOver(listIndex, event)}
	ondrop={(event) => void onListDrop(listIndex, event)}
>
	<div class="flex min-w-full flex-row items-center gap-2">
		<input
			class="w-full flex-1 rounded-md border-0 bg-transparent px-1 py-1 font-mono text-lg font-bold text-slate-100 transition-colors hover:bg-slate-700/50"
			value={list.name}
			readonly={!canEdit}
			oninput={(event) => void onUpdateListName(listIndex, event)}
		/>
		{#if canEdit}
			<div class="group/list-corner relative h-8 w-8 shrink-0">
				<button
					type="button"
					title="Delete list"
					class="absolute right-0 top-0 h-8 w-8 cursor-pointer rounded-full border border-rose-300/20 bg-slate-800/90 text-center text-sm font-bold text-rose-200 shadow-sm shadow-black/30 transition-all hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
					onclick={() => void onDeleteList(listIndex)}
				>
					✕
				</button>
			</div>
		{/if}
	</div>

	<ol
		class="mt-3 flex min-h-0 flex-1 flex-col gap-1.5"
		ondragover={(event) => onCardsDragOver(listIndex, event)}
		ondrop={(event) => void onCardsDrop(listIndex, event)}
	>
		{#each list.cards as cardRef, j (cardRef.card.uuid ?? cardRef.card.id ?? j)}
			{#if canDragAndDrop && cardDropPreview && cardDropPreview.listIndex === listIndex && cardDropPreview.targetIndex === j}
				<li
					class="pointer-events-none rounded-lg border-2 border-dashed border-sky-300/70 bg-sky-400/20"
					style={`height: ${draggedCardHeight}px;`}
				></li>
			{/if}
			<Card
				card={cardRef.card}
				{boardMembers}
				{canEdit}
				canDrag={canDragAndDrop}
				listIndex={listIndex}
				cardIndex={cardRef.cardIndex}
				on:updateCompleted={onUpdateCompleted}
				on:deleteCard={onDeleteCard}
				on:openDetails={onOpenDetails}
				on:dragStart={onDragStart}
				on:dragEnd={onDragEnd}
				on:dragOverCard={onCardDragOver}
				on:dropOnCard={onDropOnCard}
			/>
		{/each}
		{#if canDragAndDrop && cardDropPreview && cardDropPreview.listIndex === listIndex && cardDropPreview.targetIndex === list.cards.length}
			<li
				class="pointer-events-none rounded-lg border-2 border-dashed border-sky-300/70 bg-sky-400/20"
				style={`height: ${draggedCardHeight}px;`}
			></li>
		{/if}
	</ol>

	<form
		class="mt-2.5 flex gap-1.5"
		ondragover={(event) => onFormDragOver(listIndex, event)}
		ondrop={(event) => void onFormDrop(listIndex, event)}
		onsubmit={(event) => {
			event.preventDefault();
			void onAddCard(listIndex);
		}}
	>
		<input
			type="text"
			class="w-full rounded-md border border-slate-600/60 bg-slate-700/80 p-1.5 font-mono text-sm text-slate-100 shadow-sm shadow-black/20 placeholder:text-slate-300"
			placeholder="New card title..."
			value={list.newCardTitle}
			disabled={!canEdit}
			oninput={(event) => onUpdateListNewCardTitle(listIndex, event)}
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
