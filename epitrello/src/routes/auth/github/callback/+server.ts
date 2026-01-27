import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { redirect, isRedirect } from '@sveltejs/kit';
import { UserConnector } from '$lib/server/redisConnector';
import type { UUID } from 'crypto';
import { randomUUIDv7 } from 'bun';

const redirectUri = 'http://localhost:5173/auth/github/callback';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');
	if (!code) {
		console.error('GitHub callback sans ?code');
		throw redirect(302, '/login?error=github_code');
	}

	const clientId = env.GITHUB_CLIENT_ID;
	const clientSecret = env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error('GITHUB_CLIENT_ID ou GITHUB_CLIENT_SECRET manquants');
		throw redirect(302, '/login?error=github_config');
	}

	try {
		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri
			})
		});

		if (!tokenRes.ok) {
			const body = await tokenRes.text();
			console.error('GitHub token error', tokenRes.status, body);
			throw redirect(302, '/login?error=github_token');
		}

		const tokenJson = (await tokenRes.json()) as { access_token?: string };
		const accessToken = tokenJson.access_token;
		if (!accessToken) {
			console.error('Pas de access_token dans la réponse GitHub', tokenJson);
			throw redirect(302, '/login?error=github_token');
		}

		const userRes = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/json'
			}
		});

		if (!userRes.ok) {
			console.error('GitHub user error', userRes.status, await userRes.text());
			throw redirect(302, '/login?error=github_user');
		}

		const ghUser = (await userRes.json()) as {
			id: number;
			login: string;
			avatar_url?: string;
		};

		let email = '';
		try {
			const emailsRes = await fetch('https://api.github.com/user/emails', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/json'
				}
			});

			if (emailsRes.ok) {
				const emails = (await emailsRes.json()) as { email: string; primary?: boolean }[];
				const primary = emails.find((e) => e.primary) ?? emails[0];
				if (primary?.email) email = primary.email;
			} else {
				console.warn(
					'GitHub emails non OK',
					emailsRes.status,
					await emailsRes.text()
				);
			}
		} catch (err) {
			console.warn('Erreur en récupérant les emails GitHub', err);
		}

		const pseudoEmail = email || `${ghUser.login}@github.local`;

		let user = await UserConnector.getByEmail(pseudoEmail);

		if (!user) {
			const newUuid = randomUUIDv7() as UUID;

			user = {
				uuid: newUuid,
				username: ghUser.login,
				email: pseudoEmail,
				admin: 'no',
				password_hash: '',
				profile_picture_url: ghUser.avatar_url ?? '',
				boards: []
			};

			await UserConnector.save(user);
		}

		const safeUser = {
			id: user.uuid,
			email: user.email,
			name: user.username
		};

		return new Response(
			`<script>
				localStorage.setItem('authToken', 'github-' + Date.now());
				localStorage.setItem('user', ${JSON.stringify(
					JSON.stringify(safeUser)
				)});
				window.location.href = '/u/${user.uuid}#profile';
			</script>`,
			{
				headers: {
					'Content-Type': 'text/html; charset=utf-8'
				}
			}
		);
	} catch (err) {
		if (isRedirect(err)) throw err;

		console.error('Unexpected GitHub callback error', err);
		throw redirect(302, '/login?error=github_internal');
	}
};
