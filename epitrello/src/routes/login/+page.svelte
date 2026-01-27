<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import TopBar from '../top_bar.svelte';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	let checking = true;

	onMount(async () => {
		if (!browser) return;

		const raw = localStorage.getItem('user');
		if (!raw) {
			checking = false;
			return;
		}

		let user: { id?: string } | null = null;

		try {
			user = JSON.parse(raw);
		} catch (e) {
			console.error('user invalide dans localStorage', e);
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
			checking = false;
			return;
		}

		if (!user?.id) {
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
			checking = false;
			return;
		}

		try {
			const res = await fetch(`/u/${user.id}`);
			if (!res.ok) {
				console.warn('Profil utilisateur invalide, on nettoie localStorage');
				localStorage.removeItem('user');
				localStorage.removeItem('authToken');
				checking = false;
				return;
			}
		} catch (e) {
			console.warn('Erreur lors de la vérification du profil', e);
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
			checking = false;
			return;
		}

		await goto(`/u/${user.id}#profile`);
	});

	async function handleSubmit() {
		error = '';
		loading = true;

		try {
			if (!email || !password) {
				throw new Error('Email et mot de passe requis.');
			}

			const res = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error ?? 'Erreur de connexion');
			}

			const user = await res.json();

			if (browser) {
				localStorage.setItem('authToken', 'dummy-token-' + Date.now());
				localStorage.setItem('user', JSON.stringify(user));
			}

			await goto(`/u/${user.id}#profile`);
		} catch (err: any) {
			error = err?.message ?? 'Erreur de connexion.';
		} finally {
			loading = false;
		}
	}
</script>

<TopBar login={true} />

{#if checking}
	<div class="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-100 p-8">
		<p class="text-gray-500">Vérification de la session...</p>
	</div>
{:else}
	<div
		id="login-content"
		class="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-100 p-8"
	>
		<div
			id="login-form-container"
			class="max-h-[calc(100vh-6rem)] w-full max-w-md rounded bg-white p-8 shadow-lg"
		>
			<h2 class="mb-6 text-center text-2xl font-semibold">Login to EpiTrello</h2>

			{#if error}
				<div class="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			{/if}

			<form class="flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
				<div class="flex flex-col">
					<label for="email" class="mb-2 font-medium">Email:</label>
					<input
						type="email"
						id="email"
						name="email"
						class="rounded border border-gray-300 p-2"
						required
						bind:value={email}
					/>
				</div>

				<div class="flex flex-col">
					<label for="password" class="mb-2 font-medium">Password:</label>
					<input
						type="password"
						id="password"
						name="password"
						class="rounded border border-gray-300 p-2"
						required
						bind:value={password}
					/>
				</div>

				<button
					type="submit"
					class="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
					disabled={loading}
				>
					{#if loading}
						Connecting...
					{:else}
						Login
					{/if}
				</button>
			</form>

			<div class="mt-6 border-t pt-4 text-center">
				<p class="mb-2 text-sm text-gray-500">Or continue with</p>
				<a
					href="/auth/github"
					class="inline-flex items-center justify-center rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
				>
					Login with GitHub
				</a>
			</div>
		</div>
	</div>
{/if}
