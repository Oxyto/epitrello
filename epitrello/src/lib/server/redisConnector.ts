import { UserSchema, type IUser } from '$lib/interfaces/IUser';
import { BoardSchema, type IBoard } from '$lib/interfaces/IBoard';
import { ListSchema, type IList } from '$lib/interfaces/IList';
import { TagSchema, type ITag } from '$lib/interfaces/ITag';
import { CardSchema, type ICard } from '$lib/interfaces/ICard';
export type UUID = string;

export const rdb = new Bun.RedisClient(process.env.REDIS_URL);

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

		if (user.email) {
			await rdb.set(`user_email:${user.email.toLowerCase()}`, user.uuid);
		}

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

		static async getByEmail(email: string): Promise<IUser | null> {
		const uuid = await rdb.get(`user_email:${email.toLowerCase()}`);
		if (!uuid) return null;

		const user_query = await rdb.hgetall(`user:${uuid}`);
		if (!user_query) return null;

		const user = UserSchema.parse(user_query);
		user.boards = await rdb.smembers(`user:${user.uuid}:boards`);

		return user;
	}

	static async del(userId: UUID) {
		const boards_query = await rdb.smembers(`user:${userId}:boards`);

		if (boards_query) {
			await Promise.all(boards_query.map((boardId) => BoardConnector.del(boardId as UUID)));
		}
		await Promise.all([rdb.del(`user:${userId}`), rdb.del(`user:${userId}:boards`)]);
	}
}

export class BoardConnector {
	static async create(ownerId: UUID, name: string): Promise<UUID> {
		const uuid = Bun.randomUUIDv7();

		await rdb.hset(`board:${uuid}`, {
			uuid: uuid,
			name,
			owner: ownerId,
			background_image_url: '',
			theme: 'default'
		});

		await rdb.sadd(`user:${ownerId}:boards`, uuid);
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

		[board.editors, board.viewers, board.lists] = await Promise.all([
			rdb.smembers(`board:${boardId}:editors`),
			rdb.smembers(`board:${boardId}:viewers`),
			rdb.smembers(`board:${boardId}:lists`)
		]);

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
		const lists_query = await rdb.smembers(`board:${boardId}:lists`);


		if (lists_query) {
			await Promise.all(lists_query.map((listId) => ListConnector.del(listId as UUID)));
		}

		await Promise.all([
			await rdb.del(`board:${boardId}`),
			await rdb.del(`board:${boardId}:editors`),
			await rdb.del(`board:${boardId}:viewers`),
			await rdb.del(`board:${boardId}:lists`)
		]);
	}
}

export class ListConnector {
		static async create(boardId: UUID, name: string) {
		const uuid = Bun.randomUUIDv7();

		await rdb.hset(`list:${uuid}`, {
			uuid,
			name,
			board: boardId,
			order: 100
		});
		await rdb.sadd(`board:${boardId}:lists`, uuid);

		return uuid as UUID;
	}

	static async save(list: IList) {
		await rdb.hset(`list:${list.uuid}`, {
			uuid: list.uuid,
			name: list.name,
			board: list.board,
			order: list.order
		});

		if (list.cards) {
			await Promise.all(list.cards.map((cardId) => rdb.sadd(`list:${list.uuid}:cards`, cardId)));
		}
	}

	static async get(listId: UUID) {
		const list_query = await rdb.hgetall(`list:${listId}`);

		if (!list_query || Object.keys(list_query).length === 0) {
			return null;
		}

		const list = ListSchema.parse(list_query);
		list.cards = await rdb.smembers(`list:${listId}:cards`);

		return list;
	}

static async del(listId: UUID) {
	const cards_query = await rdb.smembers(`list:${listId}:cards`);

	if (cards_query && cards_query.length > 0) {
		await Promise.all(cards_query.map((cardId) => CardConnector.del(cardId as UUID)));
	}
	await Promise.all([
		rdb.del(`list:${listId}`),
		rdb.del(`list:${listId}:cards`)
	]);
}
}

export class CardConnector {
	static async create(listId: UUID, name: string) {
		const uuid = Bun.randomUUIDv7();

		await rdb.hset(`card:${uuid}`, {
			uuid: uuid,
			name,
			list: listId,
			order: 0,
			description: '',
			date: ''
		});

		return uuid;
	}

	static async save(card: ICard) {
		await rdb.hset(`card:${card.uuid}`, {
			uuid: card.uuid,
			name: card.name,
			description: card.description,
			order: card.order,
			date: card.date.toLocaleString(),
			checklist: JSON.stringify(card.checklist)
		})

		if (card.tags) {
			await Promise.all(card.tags.map((tagId) => rdb.sadd(`card:${card.uuid}:tags`, tagId)))
		}
		if (card.assignees) {
			await Promise.all(card.assignees.map((assigneeId) => rdb.sadd(`card:${card.uuid}:assignees`, assigneeId)))
		}
	}

	static async get(cardId: UUID) {
		const card_query = await rdb.hgetall(`card:${cardId}`);

		if (!card_query || Object.keys(card_query).length === 0) {
			return null;
		}

		const card = CardSchema.parse(card_query);
		card.tags = await rdb.smembers(`card:${cardId}:tags`);

		return card;
	}

	static async getByListId(listId: UUID) {
		const cards_query = await rdb.smembers(`list:${listId}:cards`);

		return Promise.all(cards_query.map((cardId) => CardConnector.get(cardId as UUID)));
	}

static async del(cardId: UUID) {
    const cardData = await rdb.hgetall(`card:${cardId}`);
    const listId = cardData?.list;
    const tags_query = await rdb.smembers(`card:${cardId}:tags`);

    if (tags_query && tags_query.length > 0) {
      await Promise.all(tags_query.map((tagId) => TagConnector.del(tagId as UUID)));
    }
    await Promise.all([
      rdb.del(`card:${cardId}`),
      rdb.del(`card:${cardId}:assignees`),
      rdb.del(`card:${cardId}:tags`)
    ]);

    if (listId) {
      await rdb.srem(`list:${listId}:cards`, cardId);
    }
  }
}

export class TagConnector {
	static async create(cardId: UUID, name: string, type: string, color: string) {
		const uuid = Bun.randomUUIDv7();

		await rdb.hset(`tag:${uuid}`, {
			uuid: uuid,
			card: cardId,
			name,
			type,
			color
		});

		await rdb.sadd(`card:${cardId}:tags`, uuid);

		return uuid;
	}

	static async save(tag: ITag) {
		await rdb.hset(`tag:${tag.uuid}`, {
			uuid: tag.uuid,
			card: tag.card,
			name: tag.name,
			type: tag.type,
			color: tag.color
		});
	}

	static async get(tagId: UUID) {
		const tag_query = await rdb.hgetall(`tag:${tagId}`);

		if (!tag_query || Object.keys(tag_query).length === 0) {
			return null;
		}

		return TagSchema.parse(tag_query);
	}

	static async getAllByCardId(cardId: UUID) {
		const tags_query = await rdb.smembers(`card:${cardId}:tags`);

		const tags = await Promise.all(tags_query.map((tagId) => TagConnector.get(tagId as UUID)));
		return tags.filter((t): t is ITag => t !== null);
	}

static async del(tagId: UUID) {
    const tagData = await rdb.hgetall(`tag:${tagId}`);

    const cardId = tagData?.card;
    if (cardId) {
      await rdb.srem(`card:${cardId}:tags`, tagId);
    }

    await Promise.all([
      rdb.del(`tag:${tagId}`),
      rdb.del(`tag:${tagId}:attributes`)
    ]);
  }
}

export async function getFullBoard(boardId: UUID) {
  try {
    const board = await BoardConnector.get(boardId);
    if (!board) return null;

    const listIds = board.lists ?? [];

    const lists = (
      await Promise.all(
        listIds.map(async (listId) => {
          const list = await ListConnector.get(listId as UUID);
          if (!list) return null;

          const cardsRaw = await CardConnector.getByListId(list.uuid as UUID);
          const cards = await Promise.all(
            (cardsRaw ?? [])
              .filter((c): c is ICard => c !== null)
              .map(async (card) => {
                let tagNames: string[] = [];

                try {
                  const tagsRaw = await TagConnector.getAllByCardId(card.uuid as UUID);
                  tagNames =
                    (tagsRaw ?? [])
                      .filter((t): t is ITag => t !== null)
                      .map((t) => t.name);
                } catch (err) {
                  console.error(
                    'getFullBoard: erreur chargement tags pour la carte',
                    card.uuid,
                    err
                  );
                }

                return {
                  uuid: card.uuid,
                  name: card.name,
                  description: card.description,
                  order: card.order,
                  date: card.date,
                  tags: tagNames
                };
              })
          );

          return {
            uuid: list.uuid,
            name: list.name,
            board: list.board,
            order: list.order,
            cards
          };
        })
      )
    ).filter((l) => l !== null);

    return { board, lists };
  } catch (err) {
    console.error('getFullBoard: fatal error', err);
    throw err;
  }
}
