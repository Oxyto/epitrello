import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { UUID } from 'crypto';
import { UserConnector, BoardConnector } from '$lib/server/redisConnector';

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.user_id as UUID;

	const user = await UserConnector.get(userId);
	if (!user) {
		throw error(404, 'User not found');
	}

	const [ownedBoards, sharedBoards] = await Promise.all([
		BoardConnector.getAllByOwnerId(userId),
		BoardConnector.getAllSharedByUserId(userId)
	]);

	const slimOwnedBoards =
		ownedBoards?.map((board) => ({
			uuid: board.uuid,
			name: board.name,
			owner: board.owner,
			role: 'owner' as const
		})) ?? [];

	const filteredSharedBoards = (sharedBoards ?? []).filter((board) => board.owner !== userId);
	const ownerIds = Array.from(new Set(filteredSharedBoards.map((board) => board.owner)));
	const ownerEntries = await Promise.all(
		ownerIds.map(async (ownerId) => [ownerId, await UserConnector.get(ownerId)] as const)
	);
	const ownerNameById = new Map(
		ownerEntries.map(([ownerId, owner]) => [ownerId, owner?.username ?? 'Unknown'])
	);

	const slimSharedBoards = filteredSharedBoards.map((board) => ({
		uuid: board.uuid,
		name: board.name,
		owner: board.owner,
		ownerName: ownerNameById.get(board.owner) ?? 'Unknown',
		role: board.editors?.includes(userId) ? ('editor' as const) : ('viewer' as const)
	}));

	return {
		user_id: user.uuid,
		email: user.email,
		name: user.username ?? null,
		ownedBoards: slimOwnedBoards,
		sharedBoards: slimSharedBoards
	};
};
