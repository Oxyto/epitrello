import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getFullBoard, rdb } from '$lib/server/redisConnector';

type UUID = string;

export const GET: RequestHandler = async ({ url }) => {
	const boardId = url.searchParams.get('boardId');
	if (!boardId) {
		throw error(400, 'boardId required');
	}

	const full = await getFullBoard(boardId as UUID);
	if (!full) {
		throw error(404, 'Board not found');
	}
	const lists = await Promise.all(
		full.lists.map(async (list) => {
			const cards = await Promise.all(
				(list.cards ?? []).map(async (card, idx) => {
					const tagIds = await rdb.smembers(`card:${card.uuid}:tags`);
					const tagNames: string[] = [];

					for (const tagId of tagIds) {
						const tagHash = await rdb.hgetall(`tag:${tagId}`);
						if (tagHash && tagHash.name) {
							tagNames.push(String(tagHash.name));
						}
					}

					return {
						uuid: card.uuid,
						title: card.name,
						order: card.order,
						tags: tagNames
					};
				})
			);

			return {
				uuid: list.uuid,
				name: list.name,
				order: list.order,
				cards
			};
		})
	);

	return json({
		board: {
			id: full.board.uuid,
			name: full.board.name
		},
		lists
	});
};
