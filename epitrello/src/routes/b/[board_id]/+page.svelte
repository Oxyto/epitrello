<script lang="ts">
	import { page } from '$app/state';
	import UserSearchBar from '../../user_search_bar.svelte';
	import Card from './card.svelte';
	import EditCard from './edit_card.svelte';

	const { data } = $props();

	let board_name = $state(data.board_name ?? 'Mon board');

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

	function handleDeleteCard(event: CustomEvent<{ listIndex: number; cardIndex: number }>) {
		const { listIndex, cardIndex } = event.detail;
		lists[listIndex].cards.splice(cardIndex, 1);
	}

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

	function handleUpdateTitle(
		event: CustomEvent<{ listIndex: number; cardIndex: number; title: string }>
	) {
		const { listIndex, cardIndex, title } = event.detail;
		lists[listIndex].cards[cardIndex].title = title;
	}

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

<div id="board-page" class="min-h-[calc(100vh-4rem)] w-screen bg-sky-700 p-4">
	<div
		id="board-header"
		class="mb-4 flex items-center gap-4 rounded bg-gray-100 p-4 font-mono shadow-md"
	>
		<input
			class="rounded border-0 bg-transparent text-3xl font-bold hover:bg-gray-200 w-full transition-all"
			title="Board Name"
			type="text"
			bind:value={board_name}
			placeholder="Board name..."
		/>
	</div>

	<div id="board-content" class="flex gap-4 overflow-x-auto p-4">
		{#each lists as list, i}
			<div id={list.name} class="min-w-[250px] rounded-md bg-white p-4 text-gray-700 shadow-md">
				<div class="flex flex-row items-center">
					<input
						class="w-full rounded-md border-0 bg-white hover:bg-gray-200 font-mono text-lg font-bold transition-all"
						bind:value={list.name}
					/>
					<button
						type="button"
						class="w-8 h-8 ml-2 px-2 py-1 hover:text-red-500 hover:cursor-pointer transition-all"
						onclick={() => deleteList(i)}
					>
						X
					</button>
				</div>
				<ol id={list.name + '-cards'} class="mt-4 flex flex-col gap-2 bg-white">
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

				<form class="mt-3 flex gap-2" onsubmit={() => addCard(i)}>
					<input
						type="text"
						class="w-full rounded-md border-0 bg-sky-700 p-2 font-mono shadow-md shadow-gray-300 placeholder:text-gray-400 text-gray-100"
						placeholder="New card title..."
						bind:value={list.newCardTitle}
					/>
					<button
						type="submit"
						class="w-24 rounded-md bg-sky-500 px-3 text-white shadow-md shadow-gray-300 hover:bg-sky-400 hover:cursor-pointer transition-all"
					>
						+ Add
					</button>
				</form>
			</div>
		{/each}

		<div id="add-list" class="min-w-[250px] rounded-md bg-white p-4 text-white shadow-md">
			<form onsubmit={addList} class="flex flex-col gap-2">
				<input
					type="text"
					class="w-full rounded-md border-0 bg-sky-700 p-2 font-mono shadow shadow-gray-300 placeholder:text-gray-400"
					placeholder="New list name..."
					bind:value={newListName}
				/>
				<button
					type="submit"
					class="w-full rounded-md bg-sky-500 px-4 py-2 shadow shadow-gray-300 hover:bg-sky-400 hover:cursor-pointer transition-all"
				>
					+ Add List
				</button>
			</form>
		</div>
	</div>
</div>
