import { RedisClient, randomUUIDv7 } from 'bun';
import type { IUser } from '$lib/interfaces/IUser';
import type { IBoard } from '$lib/interfaces/IBoard';
import type { UUID } from 'crypto';

export const rdb = new RedisClient(process.env.REDIS_URL);

export async function saveUser(user: IUser) {
	await rdb.set(`user:${user.uuid}`, JSON.stringify(user));
}

export async function getUserById(uuid: UUID): Promise<IUser | null> {
	const user_query = await rdb.get(`user:${uuid}`);

	if (!user_query) {
		return null;
	}
	return JSON.parse(user_query);
}

export async function getAllUsers(): Promise<IUser[]> {
	const keys = await rdb.keys('user:*');
	const users = await Promise.all(keys.map((key) => rdb.get(key)));

	return users.filter((user) => user !== null).map((user) => JSON.parse(user));
}

export async function createBoard(ownerUUID: UUID, name: string): Promise<IBoard> {
	const board: IBoard = {
		uuid: randomUUIDv7() as UUID,
		name,
		owner: ownerUUID
	};

	await rdb.set(`board:${board.uuid}`, JSON.stringify(board));
	return board;
}

export async function getBoardById(uuid: UUID): Promise<IBoard | null> {
	const board_query = await rdb.get(`board:${uuid}`);

	if (!board_query) {
		return null;
	}
	return JSON.parse(board_query);
}

export async function getBoardsByOwnerId(ownerUUID: UUID): Promise<IBoard[] | null> {
	const user_query = await rdb.get(`user:${ownerUUID}`);

	if (!user_query) {
		return null;
	}

	const user: IUser = JSON.parse(user_query);

	if (!user.boards) {
		return null;
	}

	const board_query = await Promise.all(user.boards.map((uuid) => rdb.get(`board:${uuid}`)));

	return board_query.filter((board) => board !== null).map((board) => JSON.parse(board));
}

export async function deleteBoard(uuid: UUID) {
	return await rdb.del(uuid) > 0
}
