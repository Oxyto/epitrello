import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REDIRECT_URI) {
		console.error(
			'Microsoft OAuth mal configuré',
			process.env.MICROSOFT_CLIENT_ID,
			process.env.MICROSOFT_REDIRECT_URI
		);
		throw error(500, 'Microsoft OAuth is not configured correctly');
	}

	const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

	console.log(
		'Initiating Microsoft OAuth flow with:',
		'\n clientId =',
		process.env.MICROSOFT_CLIENT_ID,
		'\n tenantId =',
		tenantId,
		'\n redirectUri =',
		process.env.MICROSOFT_REDIRECT_URI
	);

	const state = crypto.randomUUID();

	const authorizeUrl = new URL(
		`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
	);

	authorizeUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID);
	authorizeUrl.searchParams.set('response_type', 'code');
	authorizeUrl.searchParams.set('redirect_uri', process.env.MICROSOFT_REDIRECT_URI);
	authorizeUrl.searchParams.set('response_mode', 'query');
	authorizeUrl.searchParams.set('scope', 'openid profile email User.Read');
	authorizeUrl.searchParams.set('state', state);

	throw redirect(302, authorizeUrl.toString());
};
