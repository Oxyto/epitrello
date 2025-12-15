import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { saveUser, type User } from '$lib/server/fakeDb';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(302, '/login?error=github_missing_code');
	}

	const clientId = env.GITHUB_CLIENT_ID;
	const clientSecret = env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error('GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET manquants');
		throw redirect(302, '/login?error=github_config');
	}

	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			Accept: 'application/json'
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code
		})
	});

	const tokenJson = await tokenRes.json();
	const accessToken = tokenJson.access_token;
	if (!accessToken) {
		console.error('Erreur token GitHub', tokenJson);
		throw redirect(302, '/login?error=github_token');
	}
	const userRes = await fetch('https://api.github.com/user', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'User-Agent': 'epitrello-app'
		}
	});

	const ghUser = await userRes.json();

	const user: User = {
		id: `github-${ghUser.id}`,
		email: ghUser.email ?? '',
		name: ghUser.name ?? ghUser.login
	};

	saveUser(user);
	const qs = new URLSearchParams({
		id: user.id,
		email: user.email,
		name: user.name ?? ''
	});

	throw redirect(302, `/auth/github/success?${qs.toString()}`);
};