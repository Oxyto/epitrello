<script lang="ts">
	import EpitrelloLogo from '$lib/assets/logos/epitrello-logo.png';
	import LogoutButton from '$lib/LogoutButton.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import UserSearchBoardPicker from './user_search_bar/UserSearchBoardPicker.svelte';
	import UserSearchCreateBoardPanel from './user_search_bar/UserSearchCreateBoardPanel.svelte';
	import UserSearchNotificationsMenu from './user_search_bar/UserSearchNotificationsMenu.svelte';
	import type { SessionUser } from './user_search_bar/user-search.types';

	let currentUserId = $state('');
	let closeSearchSignal = $state(0);
	let closeNotificationsSignal = $state(0);
	let closeCreateSignal = $state(0);

	function readCurrentUser(): SessionUser | null {
		if (!browser) return null;

		const raw = localStorage.getItem('user');
		if (!raw) {
			return null;
		}

		let parsedUser: { id?: string } | null = null;
		try {
			parsedUser = JSON.parse(raw);
		} catch {
			return null;
		}

		if (!parsedUser?.id) {
			return null;
		}

		return { id: parsedUser.id };
	}

	function getCurrentUserOrRedirect(): SessionUser | null {
		const user = readCurrentUser();
		if (!user) {
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
			goto(resolve('/login'));
			return null;
		}

		currentUserId = user.id;
		return user;
	}

	function closeAllPopovers() {
		closeSearchSignal += 1;
		closeNotificationsSignal += 1;
		closeCreateSignal += 1;
	}

	function handleSearchOpen() {
		closeNotificationsSignal += 1;
		closeCreateSignal += 1;
	}

	function handleNotificationsOpen() {
		closeSearchSignal += 1;
		closeCreateSignal += 1;
	}

	function handleCreateOpen() {
		closeSearchSignal += 1;
		closeNotificationsSignal += 1;
	}

	function handleProfileClick() {
		const user = getCurrentUserOrRedirect();
		if (!user?.id) {
			return;
		}

		closeAllPopovers();
		goto(resolve(`/u/${user.id}#profile`));
	}

	onMount(() => {
		void getCurrentUserOrRedirect();
	});
</script>

<div
	id="user-search-bar"
	class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sky-300/20 bg-slate-900/85 p-4 shadow-lg shadow-slate-950/50 backdrop-blur-sm"
>
	<a
		href={resolve(currentUserId ? `/u/${currentUserId}` : '/login')}
		class="flex select-none flex-row items-center gap-2"
		draggable="false"
	>
		<img src={EpitrelloLogo} alt="EpiTrello Logo" class="w-12" draggable="false" />
		<p class="text-xl font-semibold tracking-wide text-slate-100">EpiTrello</p>
	</a>

	<UserSearchBoardPicker
		{getCurrentUserOrRedirect}
		closeSignal={closeSearchSignal}
		on:open={handleSearchOpen}
	/>
	<UserSearchCreateBoardPanel
		{getCurrentUserOrRedirect}
		closeSignal={closeCreateSignal}
		on:open={handleCreateOpen}
	/>
	<UserSearchNotificationsMenu
		{getCurrentUserOrRedirect}
		closeSignal={closeNotificationsSignal}
		on:open={handleNotificationsOpen}
	/>
	<button
		type="button"
		class="cursor-pointer rounded-md border border-sky-300/25 bg-sky-700/85 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/60 transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-900/70"
		onclick={handleProfileClick}
	>
		Profile
	</button>
	<LogoutButton />
</div>
