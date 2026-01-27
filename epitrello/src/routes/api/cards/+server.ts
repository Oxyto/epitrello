import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { CardConnector, rdb, type UUID } from '$lib/server/redisConnector';

export const POST: RequestHandler = async ({ request }) => {
	const { listId, title } = await request.json();

	if (!listId || !title) {
		throw error(400, 'listId and title required');
	}

	try {
		const cardId = await CardConnector.create(listId as string, title);

		await rdb.sadd(`list:${listId}:cards`, cardId);

		return json({ id: cardId, title });
	} catch (err) {
		console.error('create card failed', err);
		throw error(500, 'create card failed');
	}
};
export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { cardId, name, fromListId, toListId } = body;

	if (!cardId) {
		throw error(400, 'cardId required');
	}
	if (typeof name === 'string') {
		await rdb.hset(`card:${cardId}`, { name });
	}

	if (fromListId && toListId && fromListId !== toListId) {
		await rdb.srem(`list:${fromListId}:cards`, cardId);
		await rdb.sadd(`list:${toListId}:cards`, cardId);
		await rdb.hset(`card:${cardId}`, { list: toListId });
	}

	return json({ ok: true });
};
export const DELETE: RequestHandler = async ({ url, request }) => {
	let id = url.searchParams.get('id');

	if (!id) {
		try {
			const body = await request.json();
			if (body && typeof body.cardId === 'string') {
				id = body.cardId;
			}
		} catch {
		}
	}

	if (!id) {
		throw error(400, 'cardId required');
	}

	try {
		await CardConnector.del(id as UUID);
		return json({ ok: true });
	} catch (e) {
		console.error('Erreur delete card', e);
		throw error(500, 'delete card failed');
	}
};