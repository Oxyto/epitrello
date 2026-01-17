<script lang="ts">
	import Epitrellologo from '$lib/assets/logos/epitrello-logo.png';
	import GithubLogo from '$lib/assets/logos/github.svg';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	onMount(() => {
		if (!browser) return;

		const raw = localStorage.getItem('user');
		if (!raw) return;

		try {
			const user = JSON.parse(raw);
			if (user?.id) {
				goto(`/u/${user.id}#profile`);
			}
		} catch (e) {
			console.error('user invalide dans localStorage', e);
			localStorage.removeItem('user');
			localStorage.removeItem('authToken');
		}
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

<div id="login-content" class="flex h-[calc(100vh)] items-center justify-center bg-gray-100 p-8 select-none">
	<div
		id="login-form-container"
		class="flex max-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center gap-2 rounded-md bg-white p-8 shadow-lg"
	>
		<img id="epitrello-logo" src={Epitrellologo} alt="Epitrello Logo" class="w-12 invert-100 m-4 scale-120" />
		<h2 class="m-2 text-center font-mono text-2xl">Login to EpiTrello</h2>

		{#if error}
			<div class="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
				{error}
			</div>
		{/if}

		<form class="flex flex-col gap-6 w-[80%] m-4" on:submit|preventDefault={handleSubmit}>
			<div class="flex flex-col">
				<input
					type="email"
					id="email"
					name="email"
					class="rounded-md border border-gray-300 p-2"
					placeholder="Email"
					required
					bind:value={email}
				/>
			</div>

			<div class="flex flex-col">
				<input
					type="password"
					id="password"
					name="password"
					class="rounded-md border border-gray-300 p-2"
					placeholder="Password"
					required
					bind:value={password}
				/>
			</div>

			<button
				type="submit"
				class="rounded-md bg-sky-600 px-4 py-2 text-white shadow-md shadow-gray-300 hover:bg-sky-500 disabled:opacity-60 transition-all hover:cursor-pointer"
				disabled={loading}
			>
				{#if loading}
					Connecting...
				{:else}
					Login
				{/if}
			</button>
		</form>
		<div class="border-t pt-4 text-center w-[80%]">
			<p class="mb-2 font-mono text-sm text-gray-500">Or continue with</p>
			<a
				href="/auth/github"
				class="inline-flex items-center gap-4 justify-center rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800 transition-all shadow-md"
			>
				<img src={GithubLogo} alt="GitHub Logo" class="w-6 invert" />
				<p>Login with GitHub</p>
			</a>
		</div>
	</div>
</div>
