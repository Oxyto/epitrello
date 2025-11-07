<script lang="ts">
	import { page } from '$app/state';
	import UserSearchBar from '../../user_search_bar.svelte';
	import EditCard from './edit_card.svelte';

	const { data } = $props();
	let board_name = $state('');
	let lists = $state([
		{
			name: 'To Do',
			cards: [
				{ id: 1, title: 'Task 1' },
				{ id: 2, title: 'Task 2' }
			]
		},
		{ name: 'In Progress', cards: [{ id: 3, title: 'Task 3' }] },
		{
			name: 'Done',
			cards: [
				{ id: 4, title: 'Task 4' },
				{ id: 5, title: 'Task 5' }
			]
		}
	]);
</script>

<UserSearchBar />
{#if page.url.hash.startsWith('#c')}
	<EditCard />
{/if}
<div id="board-page" class="h-[calc(100vh-4rem)] w-screen bg-gray-600 p-4">
	<div id="board-header" class="mb-4 flex items-center gap-4 bg-gray-100 p-4 shadow-md">
		<input
			class="rounded border-0 bg-transparent text-3xl font-bold hover:bg-gray-200 focus:outline-0"
			title="Board Name"
			type="text"
			bind:value={board_name}
			placeholder="Board name..."
		/>
	</div>
	<div id="board-content" class="flex gap-4 overflow-x-auto p-4">
		{#each lists as list}
			<div id={list.name} class="min-w-[250px] rounded bg-gray-800 p-4 text-gray-200 shadow-md">
				<input class="rounded border-0 bg-gray-800 text-lg font-bold" bind:value={list.name} />
				<div id={list.name + '-cards'} class="mt-4 flex flex-col gap-2 bg-gray-800">
					{#each list.cards as card}
						<div class="card-item flex items-center gap-2 rounded bg-gray-700 p-2">
							<input type="checkbox" class="rounded-4xl mr-2" title="Mark as complete" />
							<a class="text-md rounded border-0 bg-gray-700" href="#c-{card.id}">{card.title}</a>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
