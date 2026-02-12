import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { BoardConnector, UserConnector, rdb, type UUID } from '$lib/server/redisConnector';
import { requireBoardAccess } from '$lib/server/boardAccess';
import type { ShareRole } from '$lib/interfaces/IBoard';

function normalizeId(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeShareRole(value: unknown): ShareRole | null {
	if (value === 'viewer' || value === 'editor') {
		return value;
	}

	return null;
}

type MemberRole = 'owner' | ShareRole;

export const GET: RequestHandler = async ({ url }) => {
	const boardId = normalizeId(url.searchParams.get('boardId'));
	const requesterId = normalizeId(url.searchParams.get('requesterId'));

	if (!boardId || !requesterId) {
		throw error(400, 'boardId and requesterId required');
	}

	const { board } = await requireBoardAccess(boardId as UUID, requesterId, 'owner');

	let shareToken = board.share_token ?? '';
	const defaultRole = board.share_default_role ?? 'viewer';

	if (!shareToken) {
		shareToken = Bun.randomUUIDv7();
		await rdb.hset(`board:${boardId}`, { share_token: shareToken });
	}

	const editorSet = new Set((board.editors ?? []).filter((memberId) => memberId !== board.owner));
	const viewerSet = new Set((board.viewers ?? []).filter((memberId) => memberId !== board.owner));
	for (const editorId of editorSet) {
		viewerSet.delete(editorId);
	}

	const memberEntries = [
		{ userId: board.owner, role: 'owner' as MemberRole },
		...Array.from(editorSet).map((userId) => ({ userId, role: 'editor' as MemberRole })),
		...Array.from(viewerSet).map((userId) => ({ userId, role: 'viewer' as MemberRole }))
	];

	const users = await Promise.all(
		memberEntries.map(async (entry) => {
			const user = await UserConnector.get(entry.userId as UUID);

			return {
				userId: entry.userId,
				role: entry.role,
				username: user?.username ?? '',
				email: user?.email ?? ''
			};
		})
	);

	return json({
		shareToken,
		defaultRole,
		sharePath: `/b/${boardId}?invite=${encodeURIComponent(shareToken)}`,
		members: users
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const boardId = normalizeId(body?.boardId);
	const userId = normalizeId(body?.userId);
	const inviteToken = normalizeId(body?.inviteToken);

	if (!boardId || !userId || !inviteToken) {
		throw error(400, 'boardId, userId and inviteToken required');
	}

	const user = await UserConnector.get(userId as UUID);
	if (!user) {
		throw error(404, 'User not found');
	}

	const board = await BoardConnector.get(boardId as UUID);
	if (!board) {
		throw error(404, 'Board not found');
	}

	if (!board.share_token || board.share_token !== inviteToken) {
		throw error(403, 'Invalid invite token');
	}

	if (board.owner === userId) {
		return json({ ok: true, role: 'owner', joined: false });
	}

	if (board.editors?.includes(userId)) {
		await rdb.sadd(`user:${userId}:shared_boards`, boardId);
		return json({ ok: true, role: 'editor', joined: false });
	}

	if (board.viewers?.includes(userId)) {
		await rdb.sadd(`user:${userId}:shared_boards`, boardId);
		return json({ ok: true, role: 'viewer', joined: false });
	}

	const role = normalizeShareRole(board.share_default_role) ?? 'viewer';
	await BoardConnector.addUserToBoardRole(boardId as UUID, userId as UUID, role);

	return json({ ok: true, role, joined: true });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	const boardId = normalizeId(body?.boardId);
	const requesterId = normalizeId(body?.requesterId);
	const defaultRole = normalizeShareRole(body?.defaultRole);
	const memberUserId = normalizeId(body?.memberUserId);
	const memberRole = body?.memberRole as ShareRole | 'remove' | undefined;

	if (!boardId || !requesterId) {
		throw error(400, 'boardId and requesterId required');
	}

	const { board } = await requireBoardAccess(boardId as UUID, requesterId, 'owner');

	const updateOps: Array<Promise<unknown>> = [];

	if (defaultRole) {
		updateOps.push(rdb.hset(`board:${boardId}`, { share_default_role: defaultRole }));
	}

	if (memberUserId && memberRole) {
		if (memberUserId === board.owner) {
			throw error(400, 'Cannot modify owner role');
		}

		const targetUser = await UserConnector.get(memberUserId as UUID);
		if (!targetUser) {
			throw error(404, 'Target user not found');
		}

		if (memberRole === 'remove') {
			updateOps.push(BoardConnector.removeUserFromBoard(boardId as UUID, memberUserId as UUID));
		} else {
			const normalizedMemberRole = normalizeShareRole(memberRole);
			if (!normalizedMemberRole) {
				throw error(400, 'memberRole must be editor, viewer or remove');
			}
			updateOps.push(
				BoardConnector.addUserToBoardRole(
					boardId as UUID,
					memberUserId as UUID,
					normalizedMemberRole
				)
			);
		}
	}

	if (updateOps.length === 0) {
		throw error(400, 'No update requested');
	}

	await Promise.all(updateOps);

	return json({ ok: true });
};
