<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	if (browser) {
		const url = new URL(window.location.href);

		const id = url.searchParams.get('id');
		const email = url.searchParams.get('email') ?? '';
		const name = url.searchParams.get('name') ?? '';

		if (id) {
			const user = { id, email, name };
			localStorage.setItem('authToken', 'github-' + id);
			localStorage.setItem('user', JSON.stringify(user));
			goto(`/u/${id}`);
		} else {
			goto('/login?error=github_user');
		}
	}
</script>

<p>Connexion via GitHub en cours...</p>
