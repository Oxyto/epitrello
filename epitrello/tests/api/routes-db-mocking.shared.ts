import { expect, mock } from 'bun:test';

type MockBoardOwner = { uuid: string } | null;
type MockBoard = { uuid: string; name: string; owner: string } | null;
type MockLoginUser = {
	uuid: string;
	email: string;
	username: string;
	admin?: string;
	password_hash?: string;
	profile_picture_url?: string;
	boards?: string[];
};
type FullBoardMock = {
	board: { uuid: string; name: string };
	lists: Array<{
		uuid: string;
		name: string;
		order: number;
		cards?: Array<{ uuid: string; name: string; order: number; completed?: boolean }>;
	}>;
} | null;

export const state = {
	boardStateGetValue: null as string | null,
	boardStateGetCalls: [] as string[],
	boardStateSetCalls: [] as Array<{ key: string; value: string }>,
	boardsUser: { uuid: 'user-1' } as MockBoardOwner,
	boardsBoard: { uuid: 'board-1', name: 'Roadmap', owner: 'user-1' } as MockBoard,
	boardsCreatedBoardId: 'board-1',
	boardsUserGetCalls: [] as string[],
	boardsCreateCalls: [] as Array<{ ownerId: string; name: string }>,
	boardsGetCalls: [] as string[],
	boardsDelCalls: [] as string[],
	rdbHsetCalls: [] as Array<{ key: string; values: unknown }>,
	rdbPublishCalls: [] as Array<{ channel: string; message: string }>,
	rdbSaddCalls: [] as Array<{ key: string; value: string }>,
	rdbSremCalls: [] as Array<{ key: string; value: string }>,
	rdbSmembersCalls: [] as string[],
	rdbSmembersValues: {} as Record<string, string[]>,
	rdbSmembersError: null as Error | null,
	rdbHgetCalls: [] as Array<{ key: string; field: string }>,
	rdbHgetValues: {} as Record<string, string | null>,
	rdbHgetallCalls: [] as string[],
	rdbHgetallValues: {} as Record<string, Record<string, unknown> | null>,
	rdbDelCalls: [] as string[],
	rdbDelError: null as Error | null,
	listsCreateCalls: [] as Array<{ boardId: string; name: string }>,
	listsCreatedListId: 'list-1',
	listsCreateError: null as Error | null,
	listsDelCalls: [] as string[],
	listsDelError: null as Error | null,
	cardsCreateCalls: [] as Array<{ listId: string; title: string }>,
	cardsCreatedCardId: 'card-1',
	cardsCreateError: null as Error | null,
	cardsDelCalls: [] as string[],
	cardsDelError: null as Error | null,
	tagsCreateCalls: [] as Array<{ cardId: string; name: string; type: string; color: string }>,
	tagsCreatedTagId: 'tag-1',
	tagsCreateError: null as Error | null,
	getFullBoardCalls: [] as string[],
	getFullBoardValue: null as FullBoardMock,
	loginUsersByEmail: {} as Record<string, MockLoginUser | null>,
	loginGetByEmailCalls: [] as string[],
	loginSaveCalls: [] as MockLoginUser[],
	userUpdateCalls: [] as Array<{ userId: string; updates: { username?: string } }>,
	userUpdateError: null as Error | null,
	userDeleteCalls: [] as string[],
	userDeleteError: null as Error | null
};

const rdb = {
	get: async (key: string) => {
		state.boardStateGetCalls.push(key);
		return state.boardStateGetValue;
	},
	set: async (key: string, value: string) => {
		state.boardStateSetCalls.push({ key, value });
		return 'OK';
	},
	hset: async (key: string, values: unknown) => {
		state.rdbHsetCalls.push({ key, values });
		return 1;
	},
	publish: async (channel: string, message: string) => {
		state.rdbPublishCalls.push({ channel, message });
		return 1;
	},
	sadd: async (key: string, value: string) => {
		state.rdbSaddCalls.push({ key, value });
		return 1;
	},
	srem: async (key: string, value: string) => {
		state.rdbSremCalls.push({ key, value });
		return 1;
	},
	smembers: async (key: string) => {
		state.rdbSmembersCalls.push(key);

		if (state.rdbSmembersError) {
			throw state.rdbSmembersError;
		}

		return state.rdbSmembersValues[key] ?? [];
	},
	hget: async (key: string, field: string) => {
		state.rdbHgetCalls.push({ key, field });
		const combinedKey = `${key}:${field}`;
		return state.rdbHgetValues[combinedKey] ?? null;
	},
	hgetall: async (key: string) => {
		state.rdbHgetallCalls.push(key);
		return state.rdbHgetallValues[key] ?? null;
	},
	del: async (key: string) => {
		state.rdbDelCalls.push(key);

		if (state.rdbDelError) {
			throw state.rdbDelError;
		}

		return 1;
	}
};

const UserConnector = {
	get: async (ownerId: string) => {
		state.boardsUserGetCalls.push(ownerId);
		return state.boardsUser;
	},
	getByEmail: async (email: string) => {
		state.loginGetByEmailCalls.push(email);
		return state.loginUsersByEmail[email] ?? null;
	},
	save: async (user: MockLoginUser) => {
		state.loginSaveCalls.push(user);
		state.loginUsersByEmail[user.email] = user;
	},
	updateProfile: async (userId: string, updates: { username?: string }) => {
		state.userUpdateCalls.push({ userId, updates });

		if (state.userUpdateError) {
			throw state.userUpdateError;
		}
	},
	del: async (userId: string) => {
		state.userDeleteCalls.push(userId);

		if (state.userDeleteError) {
			throw state.userDeleteError;
		}
	}
};

const BoardConnector = {
	create: async (ownerId: string, name: string) => {
		state.boardsCreateCalls.push({ ownerId, name });
		return state.boardsCreatedBoardId;
	},
	get: async (boardId: string) => {
		state.boardsGetCalls.push(boardId);
		return state.boardsBoard;
	},
	del: async (boardId: string) => {
		state.boardsDelCalls.push(boardId);
	}
};

const ListConnector = {
	create: async (boardId: string, name: string) => {
		state.listsCreateCalls.push({ boardId, name });

		if (state.listsCreateError) {
			throw state.listsCreateError;
		}

		return state.listsCreatedListId;
	},
	del: async (listId: string) => {
		state.listsDelCalls.push(listId);

		if (state.listsDelError) {
			throw state.listsDelError;
		}
	}
};

const CardConnector = {
	create: async (listId: string, title: string) => {
		state.cardsCreateCalls.push({ listId, title });

		if (state.cardsCreateError) {
			throw state.cardsCreateError;
		}

		return state.cardsCreatedCardId;
	},
	del: async (cardId: string) => {
		state.cardsDelCalls.push(cardId);

		if (state.cardsDelError) {
			throw state.cardsDelError;
		}
	}
};

const TagConnector = {
	create: async (cardId: string, name: string, type: string, color: string) => {
		state.tagsCreateCalls.push({ cardId, name, type, color });

		if (state.tagsCreateError) {
			throw state.tagsCreateError;
		}

		return state.tagsCreatedTagId;
	}
};

const getFullBoard = async (boardId: string) => {
	state.getFullBoardCalls.push(boardId);
	return state.getFullBoardValue;
};

mock.module('$lib/server/redisConnector', () => ({
	rdb,
	UserConnector,
	BoardConnector,
	ListConnector,
	CardConnector,
	TagConnector,
	getFullBoard
}));

export const boardStateRoute = await import('../../src/routes/api/board-state/+server');
export const boardsRoute = await import('../../src/routes/api/boards/+server');
export const listsRoute = await import('../../src/routes/api/lists/+server');
export const cardsRoute = await import('../../src/routes/api/cards/+server');
export const tagsRoute = await import('../../src/routes/api/tags/+server');
export const boardFullRoute = await import('../../src/routes/api/board-full/+server');
export const loginRoute = await import('../../src/routes/api/login/+server');
export const usersRoute = await import('../../src/routes/api/users/+server');

export const expectHttpErrorStatus = async (
	maybePromise: PromiseLike<unknown> | unknown,
	status: number
) => {
	try {
		await maybePromise;
		throw new Error('Expected handler to throw an HttpError');
	} catch (error: unknown) {
		const maybeHttpError = error as { status?: number } | null;
		expect(maybeHttpError?.status).toBe(status);
	}
};

export function resetMockState() {
	state.boardStateGetValue = null;
	state.boardStateGetCalls.length = 0;
	state.boardStateSetCalls.length = 0;
	state.boardsUser = { uuid: 'user-1' };
	state.boardsBoard = { uuid: 'board-1', name: 'Roadmap', owner: 'user-1' };
	state.boardsCreatedBoardId = 'board-1';
	state.boardsUserGetCalls.length = 0;
	state.boardsCreateCalls.length = 0;
	state.boardsGetCalls.length = 0;
	state.boardsDelCalls.length = 0;
	state.rdbHsetCalls.length = 0;
	state.rdbPublishCalls.length = 0;
	state.rdbSaddCalls.length = 0;
	state.rdbSremCalls.length = 0;
	state.rdbSmembersCalls.length = 0;
	state.rdbSmembersValues = {};
	state.rdbSmembersError = null;
	state.rdbHgetCalls.length = 0;
	state.rdbHgetValues = {};
	state.rdbHgetallCalls.length = 0;
	state.rdbHgetallValues = {};
	state.rdbDelCalls.length = 0;
	state.rdbDelError = null;
	state.listsCreateCalls.length = 0;
	state.listsCreatedListId = 'list-1';
	state.listsCreateError = null;
	state.listsDelCalls.length = 0;
	state.listsDelError = null;
	state.cardsCreateCalls.length = 0;
	state.cardsCreatedCardId = 'card-1';
	state.cardsCreateError = null;
	state.cardsDelCalls.length = 0;
	state.cardsDelError = null;
	state.tagsCreateCalls.length = 0;
	state.tagsCreatedTagId = 'tag-1';
	state.tagsCreateError = null;
	state.getFullBoardCalls.length = 0;
	state.getFullBoardValue = null;
	state.loginUsersByEmail = {};
	state.loginGetByEmailCalls.length = 0;
	state.loginSaveCalls.length = 0;
	state.userUpdateCalls.length = 0;
	state.userUpdateError = null;
	state.userDeleteCalls.length = 0;
	state.userDeleteError = null;
}
