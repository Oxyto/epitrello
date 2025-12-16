<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	let isLoggedIn = false;
	if (browser) {
		isLoggedIn = !!localStorage.getItem('authToken');
	}

	function handleLogout() {
		if (!browser) return;
		localStorage.removeItem('authToken');
		localStorage.removeItem('user');
		isLoggedIn = false;
		goto('/login');
	}
</script>

{#if isLoggedIn}
	<button
		type="button"
		class="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 text-sm"
		on:click={handleLogout}
	>
		Logout
	</button>
{/if}
