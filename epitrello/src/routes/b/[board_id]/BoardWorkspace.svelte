<script lang="ts">
	import BoardWorkspaceBoard from './BoardWorkspaceBoard.svelte';
	import BoardWorkspaceFiltersPanel from './BoardWorkspaceFiltersPanel.svelte';
	import { buildVisibleLists, extractAllTags } from './board-filters';
	import type { BoardMember, DueDateOperator, UiList } from './board.types';

	let {
		boardId,
		currentUserId,
		currentUserName,
		currentUserEmail,
		canEdit,
		boardMembers,
		lists = $bindable(),
		filtersPanelOpen = $bindable()
	}: {
		boardId: string | undefined;
		currentUserId: string;
		currentUserName: string;
		currentUserEmail: string;
		canEdit: boolean;
		boardMembers: BoardMember[];
		lists: UiList[];
		filtersPanelOpen: boolean;
	} = $props();

	let assigneeFilter = $state('all');
	let dueDateOperator = $state<DueDateOperator>('none');
	let dueDateFilterValue = $state('');
	let tagFilter = $state('all');

	const hasActiveFilters = $derived(
		assigneeFilter !== 'all' ||
			(dueDateOperator !== 'none' && dueDateFilterValue.trim().length > 0) ||
			tagFilter !== 'all'
	);

	const canDragAndDrop = $derived(canEdit && !hasActiveFilters);
	const allTags = $derived(extractAllTags(lists));

	const visibleLists = $derived(
		buildVisibleLists(lists, {
			assigneeFilter,
			dueDateOperator,
			dueDateFilterValue,
			tagFilter,
			boardMembers,
			currentUser: {
				id: currentUserId,
				name: currentUserName,
				email: currentUserEmail
			}
		})
	);

	function resetFilters() {
		assigneeFilter = 'all';
		dueDateOperator = 'none';
		dueDateFilterValue = '';
		tagFilter = 'all';
	}
</script>

{#if filtersPanelOpen}
	<BoardWorkspaceFiltersPanel
		{boardMembers}
		{allTags}
		{hasActiveFilters}
		bind:assigneeFilter
		bind:dueDateOperator
		bind:dueDateFilterValue
		bind:tagFilter
		onResetFilters={resetFilters}
	/>
{/if}

<BoardWorkspaceBoard
	{boardId}
	{currentUserId}
	{canEdit}
	{canDragAndDrop}
	{boardMembers}
	bind:lists
	{visibleLists}
/>
