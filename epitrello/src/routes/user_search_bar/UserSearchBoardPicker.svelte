<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createEventDispatcher, onMount } from 'svelte';
	import UserSearchBoardSuggestions from './UserSearchBoardSuggestions.svelte';
	import type {
		BoardSearchItem,
		BoardSearchResponse,
		SessionUser,
		SuggestionEntry
	} from './user-search.types';

	const SEARCH_DEBOUNCE_MS = 180;
	const SEARCH_SUGGESTIONS_LIMIT = 8;

	const { getCurrentUserOrRedirect, closeSignal = 0 } = $props<{
		getCurrentUserOrRedirect: () => SessionUser | null;
		closeSignal?: number;
	}>();

	const dispatch = createEventDispatcher<{ open: undefined }>();

	let pickerElement = $state<HTMLElement | null>(null);
	let searchQuery = $state('');
	let isSearchOpen = $state(false);
	let isSearchLoading = $state(false);
	let searchError = $state('');
	let searchOwnedBoards = $state<BoardSearchItem[]>([]);
	let searchSharedBoards = $state<BoardSearchItem[]>([]);
	let highlightedSuggestionIndex = $state(-1);
	let searchDebounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let lastSearchFetchToken = 0;
	let lastCloseSignal = $state(0);

	const ownedSuggestionEntries = $derived<SuggestionEntry[]>(
		searchOwnedBoards.map((board, index) => ({ board, group: 'owned', index }))
	);

	const sharedSuggestionEntries = $derived<SuggestionEntry[]>(
		searchSharedBoards.map((board, index) => ({
			board,
			group: 'shared',
			index: searchOwnedBoards.length + index
		}))
	);

	const searchSuggestionEntries = $derived<SuggestionEntry[]>([
		...ownedSuggestionEntries,
		...sharedSuggestionEntries
	]);

	const shouldShowSuggestionDropdown = $derived(
		isSearchOpen &&
			(isSearchLoading ||
				searchError.length > 0 ||
				searchQuery.trim().length > 0 ||
				searchSuggestionEntries.length > 0)
	);

	$effect(() => {
		if (closeSignal === lastCloseSignal) {
			return;
		}

		lastCloseSignal = closeSignal;
		closeSearchSuggestions();
	});

	function clearSearchDebounceTimer() {
		if (!searchDebounceTimer) {
			return;
		}

		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = null;
	}

	function closeSearchSuggestions() {
		isSearchOpen = false;
		highlightedSuggestionIndex = -1;
	}

	function openSearchSuggestions() {
		if (!isSearchOpen) {
			dispatch('open');
		}
		isSearchOpen = true;
	}

	async function fetchSearchSuggestions(rawQuery: string) {
		const user = getCurrentUserOrRedirect();
		if (!user) {
			return;
		}

		const query = rawQuery.trim();
		const fetchToken = ++lastSearchFetchToken;
		isSearchLoading = true;
		searchError = '';

		const params = new URLSearchParams({
			userId: user.id,
			q: query,
			limit: String(SEARCH_SUGGESTIONS_LIMIT)
		});

		try {
			const response = await fetch(`/api/boards?${params.toString()}`);
			if (!response.ok) {
				const message = await response.text();
				throw new Error(message || 'Unable to search boards');
			}

			const payload = (await response.json()) as Partial<BoardSearchResponse>;
			if (fetchToken !== lastSearchFetchToken) {
				return;
			}

			const nextOwnedBoards = Array.isArray(payload.ownedBoards) ? payload.ownedBoards : [];
			const nextSharedBoards = Array.isArray(payload.sharedBoards) ? payload.sharedBoards : [];
			searchOwnedBoards = nextOwnedBoards;
			searchSharedBoards = nextSharedBoards;

			const totalSuggestions = nextOwnedBoards.length + nextSharedBoards.length;
			if (totalSuggestions === 0) {
				highlightedSuggestionIndex = -1;
			} else if (highlightedSuggestionIndex >= totalSuggestions) {
				highlightedSuggestionIndex = 0;
			}
		} catch (fetchError) {
			if (fetchToken !== lastSearchFetchToken) {
				return;
			}

			searchOwnedBoards = [];
			searchSharedBoards = [];
			searchError =
				fetchError instanceof Error ? fetchError.message : 'Unable to search boards right now.';
		} finally {
			if (fetchToken === lastSearchFetchToken) {
				isSearchLoading = false;
			}
		}
	}

	function scheduleSearchSuggestionsFetch() {
		clearSearchDebounceTimer();
		searchDebounceTimer = setTimeout(() => {
			void fetchSearchSuggestions(searchQuery);
		}, SEARCH_DEBOUNCE_MS);
	}

	function handleSearchFocus() {
		openSearchSuggestions();
		void fetchSearchSuggestions(searchQuery);
	}

	function handleSearchInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		searchQuery = target.value;
		openSearchSuggestions();
		highlightedSuggestionIndex = -1;
		scheduleSearchSuggestionsFetch();
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		const suggestionsCount = searchSuggestionEntries.length;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			openSearchSuggestions();
			if (suggestionsCount === 0) return;
			highlightedSuggestionIndex =
				highlightedSuggestionIndex < suggestionsCount - 1 ? highlightedSuggestionIndex + 1 : 0;
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			openSearchSuggestions();
			if (suggestionsCount === 0) return;
			highlightedSuggestionIndex =
				highlightedSuggestionIndex > 0 ? highlightedSuggestionIndex - 1 : suggestionsCount - 1;
			return;
		}

		if (event.key === 'Enter') {
			if (!isSearchOpen || suggestionsCount === 0) {
				return;
			}

			event.preventDefault();
			const suggestionIndex = highlightedSuggestionIndex >= 0 ? highlightedSuggestionIndex : 0;
			void navigateToSearchSuggestion(suggestionIndex);
			return;
		}

		if (event.key === 'Escape' && isSearchOpen) {
			event.preventDefault();
			closeSearchSuggestions();
		}
	}

	async function navigateToSearchSuggestion(index: number) {
		const entry = searchSuggestionEntries[index];
		if (!entry) {
			return;
		}

		searchQuery = entry.board.name;
		closeSearchSuggestions();
		await goto(resolve(`/b/${entry.board.uuid}`));
	}

	function handleSuggestionMouseEnter(index: number) {
		highlightedSuggestionIndex = index;
	}

	function handleSuggestionMouseDown(event: MouseEvent) {
		event.preventDefault();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isSearchOpen) {
			event.preventDefault();
			closeSearchSuggestions();
		}
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		void fetchSearchSuggestions('');
		const handleDocumentMousedown = (event: MouseEvent) => {
			if (!pickerElement || !(event.target instanceof Node)) {
				return;
			}

			if (pickerElement.contains(event.target)) {
				return;
			}

			closeSearchSuggestions();
		};

		document.addEventListener('mousedown', handleDocumentMousedown);

		return () => {
			clearSearchDebounceTimer();
			document.removeEventListener('mousedown', handleDocumentMousedown);
		};
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="relative min-w-0 flex-1" bind:this={pickerElement}>
	<input
		type="text"
		placeholder="Search boards"
		bind:value={searchQuery}
		class="w-full rounded-md border border-slate-600/60 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 shadow-sm shadow-slate-950/40 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
		role="combobox"
		aria-autocomplete="list"
		aria-expanded={shouldShowSuggestionDropdown}
		aria-controls="board-search-suggestions"
		autocomplete="off"
		onfocus={handleSearchFocus}
		oninput={handleSearchInput}
		onkeydown={handleSearchKeydown}
	/>

	{#if shouldShowSuggestionDropdown}
		<UserSearchBoardSuggestions
			{isSearchLoading}
			{searchError}
			{searchSuggestionEntries}
			{ownedSuggestionEntries}
			{sharedSuggestionEntries}
			{highlightedSuggestionIndex}
			onSuggestionMouseEnter={handleSuggestionMouseEnter}
			onSuggestionMouseDown={handleSuggestionMouseDown}
			onNavigate={(index) => void navigateToSearchSuggestion(index)}
		/>
	{/if}
</div>
