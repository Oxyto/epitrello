import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';


const clientId = env.GITHUB_CLIENT_ID;
const redirectUri = 'http://localhost:5173/auth/github/callback';

export const GET: RequestHandler = async () => {
	if (!clientId) {
		console.error('GITHUB_CLIENT_ID manquant');
		throw redirect(302, '/login?error=github_config');
	}

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'read:user user:email'
	});

	throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};
