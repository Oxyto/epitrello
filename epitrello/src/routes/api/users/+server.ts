import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import type { UUID } from 'crypto';
import { UserConnector } from '$lib/server/redisConnector';

const MAX_DISPLAY_NAME_LENGTH = 80;

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) {
		return json({ error: 'Invalid body' }, { status: 400 });
	}

	const userId = String(body.userId ?? '').trim();
	const requesterId = String(body.requesterId ?? '').trim();
	const displayName = String(body.displayName ?? body.name ?? '').trim();

	if (!userId || !requesterId || !displayName) {
		return json({ error: 'userId, requesterId and displayName are required' }, { status: 400 });
	}

	if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
		return json(
			{ error: `displayName cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters` },
			{ status: 400 }
		);
	}

	if (requesterId !== userId) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const user = await UserConnector.get(userId as UUID);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	await UserConnector.updateProfile(userId as UUID, { username: displayName });
	return json({ ok: true, name: displayName });
};

export const DELETE: RequestHandler = async ({ url }) => {
	const userId = String(url.searchParams.get('id') ?? '').trim();
	const requesterId = String(url.searchParams.get('requesterId') ?? '').trim();

	if (!userId || !requesterId) {
		return json({ error: 'id and requesterId are required' }, { status: 400 });
	}

	if (requesterId !== userId) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const user = await UserConnector.get(userId as UUID);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	await UserConnector.del(userId as UUID);
	return json({ ok: true });
};
