<script lang="ts">
	import { page } from '$app/state';
	import UserSearchBar from '../../user_search_bar.svelte';
	import Card from './card.svelte';
	import EditCard from './edit_card.svelte';

	// Nom du board
	let board_name = $state('Mon board');

	// Listes + cartes (state FRONT uniquement)
	let lists = $state([
		{
			name: 'To Do',
			cards: [
				{ id: 1, title: 'Task 1', tags: ['urgent', 'backend'] },
				{ id: 2, title: 'Task 2', tags: ['frontend'] }
			],
			newCardTitle: ''
		},
		{
			name: 'In Progress',
			cards: [{ id: 3, title: 'Task 3', tags: ['review'] }],
			newCardTitle: ''
		},
		{
			name: 'Done',
			cards: [
				{ id: 4, title: 'Task 4', tags: ['done'] },
				{ id: 5, title: 'Task 5', tags: ['done'] }
			],
			newCardTitle: ''
		}
	]);

	// Champ pour créer une nouvelle liste
	let newListName = $state('');

	function addList() {
		const name = newListName.trim();
		if (!name) return;

		lists.push({
			name,
			cards: [],
			newCardTitle: ''
		});

		newListName = '';
	}

	function addCard(listIndex: number) {
		const list = lists[listIndex];
		const title = (list.newCardTitle ?? '').trim();
		if (!title) return;

		// On cherche le plus grand id actuel
		let maxId = 0;
		for (const l of lists) {
			for (const c of l.cards) {
				if (c.id > maxId) maxId = c.id;
			}
		}

		list.cards.push({
			id: maxId + 1,
			title,
			tags: []
		});

		list.newCardTitle = '';
	}

	function handleDeleteCard(
		event: CustomEvent<{ listIndex: number; cardIndex: number }>
	) {
		const { listIndex, cardIndex } = event.detail;
		lists[listIndex].cards.splice(cardIndex, 1);
	}

	// ------- TAGS -------
	function handleAddTag(event: CustomEvent<{ listIndex: number; cardIndex: number; tag: string }>) {
		const { listIndex, cardIndex, tag } = event.detail;

		const card = lists[listIndex].cards[cardIndex];
		if (!card.tags) card.tags = [];
		if (!card.tags.includes(tag)) {
			card.tags.push(tag);
		}
	}

	function deleteList(index: number) {
		lists.splice(index, 1);
	}

	// ------- TITRE -------
	function handleUpdateTitle(
		event: CustomEvent<{ listIndex: number; cardIndex: number; title: string }>
	) {
		const { listIndex, cardIndex, title } = event.detail;
		lists[listIndex].cards[cardIndex].title = title;
	}

	// ------- DÉPLACEMENT (← / →) -------
	function handleMoveCard(
		event: CustomEvent<{ listIndex: number; cardIndex: number; direction: number }>
	) {
		const { listIndex, cardIndex, direction } = event.detail;

		const newListIndex = listIndex + direction;
		if (newListIndex < 0 || newListIndex >= lists.length) return;

		const [card] = lists[listIndex].cards.splice(cardIndex, 1);
		lists[newListIndex].cards.push(card);
	}
</script>

<UserSearchBar />

{#if page.url.hash.startsWith('#c')}
	<EditCard />
{/if}


<div id="board-page" class="min-h-[calc(100vh-4rem)] w-screen bg-gray-600 p-4">
	<div
		id="board-header"
		class="mb-4 flex items-center gap-4 rounded bg-gray-100 p-4 shadow-md"
	>
		<input
			class="rounded border-0 bg-transparent text-3xl font-bold hover:bg-gray-200 focus:outline-0"
			title="Board Name"
			type="text"
			bind:value={board_name}
			placeholder="Board name..."
		/>
	</div>

	<div id="board-content" class="flex gap-4 overflow-x-auto p-4">
		{#each lists as list, i}
			<div
				id={list.name}
				class="min-w-[250px] rounded bg-gray-800 p-4 text-gray-200 shadow-md"
			>
				<input
					class="w-full rounded border-0 bg-gray-800 text-lg font-bold"
					bind:value={list.name}
				/>
				<button
					type="button"
					class="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-500"
					on:click={() => deleteList(i)}
				>
					Delete
				</button>
				<ol
					id={list.name + '-cards'}
					class="mt-4 flex flex-col gap-2 bg-gray-800"
				>
					{#each list.cards as card, j}
						<Card
							{card}
							listIndex={i}
							cardIndex={j}
							on:addTag={handleAddTag}
							on:updateTitle={handleUpdateTitle}
							on:moveCard={handleMoveCard}
							on:deleteCard={handleDeleteCard} 
						/>
					{/each}
				</ol>

				<form
					class="mt-3 flex gap-2"
					on:submit|preventDefault={() => addCard(i)}
				>
					<input
						type="text"
						class="w-full rounded border-0 bg-gray-700 p-2 text-sm"
						placeholder="New card title..."
						bind:value={list.newCardTitle}
					/>
					<button
						type="submit"
						class="rounded bg-gray-700 px-3 text-sm hover:bg-gray-600"
					>
						+ Add
					</button>
				</form>
			</div>
		{/each}

		<div
			id="add-list"
			class="min-w-[250px] rounded bg-gray-800 p-4 text-gray-200 shadow-md"
		>
			<form on:submit|preventDefault={addList} class="flex flex-col gap-2">
				<input
					type="text"
					class="w-full rounded border-0 bg-gray-700 p-2"
					placeholder="New list name..."
					bind:value={newListName}
				/>
				<button
					type="submit"
					class="w-full rounded bg-gray-700 px-4 py-2 hover:bg-gray-600"
				>
					+ Add List
				</button>
			</form>
		</div>
	</div>
</div>
