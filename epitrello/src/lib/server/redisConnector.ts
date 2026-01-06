import { RedisClient, randomUUIDv7 } from 'bun';
import { UserSchema, type IUser } from '$lib/interfaces/IUser';
import { BoardSchema, type IBoard } from '$lib/interfaces/IBoard';
import type { UUID } from 'crypto';

export const rdb = new RedisClient(process.env.REDIS_URL);

export class UserConnector {
	static async save(user: IUser) {
		await rdb.hset(`user:${user.uuid}`, {
			uuid: user.uuid,
			username: user.username,
			email: user.email,
			admin: user.admin,
			password_hash: user.password_hash ?? '',
			profile_picture_url: user.profile_picture_url ?? ''
		});

		if (user.boards) {
			await Promise.all(user.boards.map((board) => rdb.sadd(`user:${user.uuid}:boards`, board)));
		}
	}

	static async get(userId: UUID): Promise<IUser | null> {
		const user_query = await rdb.hgetall(`user:${userId}`);

		if (!user_query || Object.keys(user_query).length === 0) {
			return null;
		}

		const user = UserSchema.parse(user_query);
		user.boards = await rdb.smembers(`user:${userId}:boards`);

		return user;
	}

	static async getAll(): Promise<IUser[]> {
		const keys = await rdb.keys('user:*');
		const users_query = await Promise.all(keys.map((key) => rdb.hgetall(key)));

		const users = users_query.filter((user) => user !== null).map((user) => UserSchema.parse(user));
		return await Promise.all(
			users.map(async (user) => {
				user.boards = await rdb.smembers(`user:${user.uuid}:boards`);
				return user;
			})
		);
	}

	static async del(userId: UUID) {
		await rdb.del(`user:${userId}`);
		const boards_query = await rdb.smembers(`user:${userId}:boards`);

		if (boards_query && Object.keys(boards_query).length > 0) {
			await Promise.all(boards_query.map((boardId) => BoardConnector.del(boardId as UUID)));
		}
	}
}

export class BoardConnector {
	static async create(ownerId: UUID, name: string): Promise<UUID> {
		const uuid = randomUUIDv7();

		await rdb.hset(`board:${uuid}`, {
			uuid: uuid,
			name,
			owner: ownerId,
			background_image_url: '',
			theme: 'default'
		});

		return uuid as UUID;
	}

	static async save(board: IBoard) {
		await rdb.hset(`board:${board.uuid}`, {
			uuid: board.uuid,
			name: board.name,
			owner: board.owner,
			background_image_url: board.background_image_url,
			theme: board.theme
		});

		if (board.editors) {
			await Promise.all(
				board.editors.map((editor) => rdb.sadd(`board:${board.uuid}:editors`, editor))
			);
		}
		if (board.viewers) {
			await Promise.all(
				board.viewers.map((viewer) => rdb.sadd(`board:${board.uuid}:viewers`, viewer))
			);
		}
		if (board.lists) {
			await Promise.all(board.lists.map((list) => rdb.sadd(`board:${board.uuid}:lists`, list)));
		}
	}

	static async get(boardId: UUID): Promise<IBoard | null> {
		const board_query = await rdb.hgetall(`board:${boardId}`);

		if (!board_query || Object.keys(board_query).length === 0) {
			return null;
		}

		const board = BoardSchema.parse(board_query);

		board.editors = await rdb.smembers(`board:${boardId}:editors`);
		board.viewers = await rdb.smembers(`board:${boardId}:viewers`);
		board.lists = await rdb.smembers(`board:${boardId}:lists`);

		return board;
	}

	static async getAllByOwnerId(ownerUUID: UUID): Promise<IBoard[] | null> {
		const boards_query = await rdb.smembers(`user:${ownerUUID}:boards`);

		if (!boards_query || Object.keys(boards_query).length === 0) {
			return null;
		}

		return (
			await Promise.all(
				boards_query
					.filter((boardId) => boardId !== null)
					.map((boardId) => BoardConnector.get(boardId as UUID))
			)
		).filter((board) => board !== null);
	}

	static async del(boardId: UUID) {
		await Promise.all([
			await rdb.del(`board:${boardId}`),
			await rdb.del(`board:${boardId}:editors`),
			await rdb.del(`board:${boardId}:viewers`),
			await rdb.del(`board:${boardId}:lists`)
		]);
	}
}

export class ListConnector {

}

export class CardConnector {
	
}

export class TagConnector {
	
}
