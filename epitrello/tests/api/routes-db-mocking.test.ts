import { beforeEach, describe, expect, it, mock } from 'bun:test';

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

const state = {
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
	loginSaveCalls: [] as MockLoginUser[]
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

const boardStateRoute = await import('../../src/routes/api/board-state/+server');
const boardsRoute = await import('../../src/routes/api/boards/+server');
const listsRoute = await import('../../src/routes/api/lists/+server');
const cardsRoute = await import('../../src/routes/api/cards/+server');
const tagsRoute = await import('../../src/routes/api/tags/+server');
const boardFullRoute = await import('../../src/routes/api/board-full/+server');
const loginRoute = await import('../../src/routes/api/login/+server');

const expectHttpErrorStatus = async (
	maybePromise: PromiseLike<unknown> | unknown,
	status: number
) => {
	try {
		await maybePromise;
		throw new Error('Expected handler to throw an HttpError');
	} catch (error: any) {
		expect(error?.status).toBe(status);
	}
};

beforeEach(() => {
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
});

describe('api/board-state +server', () => {
	it('GET throws 400 when boardId is missing', async () => {
		await expectHttpErrorStatus(
			boardStateRoute.GET({
				url: new URL('http://localhost/api/board-state')
			} as any),
			400
		);
		expect(state.boardStateGetCalls).toHaveLength(0);
	});

	it('GET returns 404 JSON when no board state is stored', async () => {
		const response = await boardStateRoute.GET({
			url: new URL('http://localhost/api/board-state?boardId=board-1')
		} as any);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: 'Not found' });
		expect(state.boardStateGetCalls).toEqual(['board_state:board-1']);
	});

	it('GET returns parsed board state payload', async () => {
		state.boardStateGetValue = JSON.stringify({
			board_name: 'Roadmap',
			lists: [{ id: 'list-1', name: 'Todo' }]
		});

		const response = await boardStateRoute.GET({
			url: new URL('http://localhost/api/board-state?boardId=board-1')
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			board_name: 'Roadmap',
			lists: [{ id: 'list-1', name: 'Todo' }]
		});
	});

	it('GET throws 500 when stored payload is invalid JSON', async () => {
		state.boardStateGetValue = '{not-json}';

		await expectHttpErrorStatus(
			boardStateRoute.GET({
				url: new URL('http://localhost/api/board-state?boardId=board-1')
			} as any),
			500
		);
	});

	it('POST throws 400 when boardId is missing', async () => {
		await expectHttpErrorStatus(
			boardStateRoute.POST({
				request: new Request('http://localhost/api/board-state', {
					method: 'POST',
					body: JSON.stringify({ board_name: 'Roadmap' })
				})
			} as any),
			400
		);
		expect(state.boardStateSetCalls).toHaveLength(0);
	});

	it('POST stores a normalized payload and returns ok', async () => {
		const response = await boardStateRoute.POST({
			request: new Request('http://localhost/api/board-state', {
				method: 'POST',
				body: JSON.stringify({
					boardId: 'board-1',
					board_name: 'Roadmap',
					lists: 'not-an-array'
				})
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.boardStateSetCalls).toEqual([
			{
				key: 'board_state:board-1',
				value: JSON.stringify({
					board_name: 'Roadmap',
					lists: []
				})
			}
		]);
	});
});

describe('api/boards +server', () => {
	it('POST returns 400 when ownerId or name is missing', async () => {
		const response = await boardsRoute.POST({
			request: new Request('http://localhost/api/boards', {
				method: 'POST',
				body: JSON.stringify({})
			})
		} as any);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'ownerId et name sont requis' });
		expect(state.boardsUserGetCalls).toHaveLength(0);
		expect(state.boardsCreateCalls).toHaveLength(0);
	});

	it('POST returns 404 when the owner does not exist', async () => {
		state.boardsUser = null;

		const response = await boardsRoute.POST({
			request: new Request('http://localhost/api/boards', {
				method: 'POST',
				body: JSON.stringify({ ownerId: 'missing-user', name: 'Roadmap' })
			})
		} as any);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Utilisateur introuvable' });
		expect(state.boardsCreateCalls).toHaveLength(0);
	});

	it('POST creates a board and returns hydrated board data', async () => {
		state.boardsCreatedBoardId = 'board-42';
		state.boardsBoard = { uuid: 'board-42', name: 'Sprint board', owner: 'user-1' };

		const response = await boardsRoute.POST({
			request: new Request('http://localhost/api/boards', {
				method: 'POST',
				body: JSON.stringify({ ownerId: 'user-1', name: '  Sprint board  ' })
			})
		} as any);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({
			uuid: 'board-42',
			name: 'Sprint board',
			owner: 'user-1'
		});
		expect(state.boardsCreateCalls).toEqual([{ ownerId: 'user-1', name: 'Sprint board' }]);
		expect(state.boardsGetCalls).toEqual(['board-42']);
	});

	it('PATCH updates board name in redis and returns ok', async () => {
		const response = await boardsRoute.PATCH({
			request: new Request('http://localhost/api/boards', {
				method: 'PATCH',
				body: JSON.stringify({ boardId: 'board-1', name: 'Renamed board' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbHsetCalls).toEqual([
			{
				key: 'board:board-1',
				values: { name: 'Renamed board' }
			}
		]);
	});

	it('PATCH throws 400 when payload is incomplete', async () => {
		await expectHttpErrorStatus(
			boardsRoute.PATCH({
				request: new Request('http://localhost/api/boards', {
					method: 'PATCH',
					body: JSON.stringify({ boardId: 'board-1' })
				})
			} as any),
			400
		);
		expect(state.rdbHsetCalls).toHaveLength(0);
	});

	it('DELETE calls BoardConnector.del and returns ok', async () => {
		const response = await boardsRoute.DELETE({
			url: new URL('http://localhost/api/boards?id=board-99')
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.boardsDelCalls).toEqual(['board-99']);
	});
});

describe('api/lists +server', () => {
	it('POST throws 400 when boardId or name is missing', async () => {
		await expectHttpErrorStatus(
			listsRoute.POST({
				request: new Request('http://localhost/api/lists', {
					method: 'POST',
					body: JSON.stringify({})
				})
			} as any),
			400
		);
		expect(state.listsCreateCalls).toHaveLength(0);
		expect(state.rdbSaddCalls).toHaveLength(0);
	});

	it('POST creates a list and links it to the board', async () => {
		state.listsCreatedListId = 'list-42';

		const response = await listsRoute.POST({
			request: new Request('http://localhost/api/lists', {
				method: 'POST',
				body: JSON.stringify({ boardId: 'board-1', name: 'Todo' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 'list-42', name: 'Todo' });
		expect(state.listsCreateCalls).toEqual([{ boardId: 'board-1', name: 'Todo' }]);
		expect(state.rdbSaddCalls).toContainEqual({
			key: 'board:board-1:lists',
			value: 'list-42'
		});
	});

	it('POST throws 500 when connector fails', async () => {
		state.listsCreateError = new Error('create list failed');

		await expectHttpErrorStatus(
			listsRoute.POST({
				request: new Request('http://localhost/api/lists', {
					method: 'POST',
					body: JSON.stringify({ boardId: 'board-1', name: 'Todo' })
				})
			} as any),
			500
		);
	});

	it('PATCH updates list name', async () => {
		const response = await listsRoute.PATCH({
			request: new Request('http://localhost/api/lists', {
				method: 'PATCH',
				body: JSON.stringify({ listId: 'list-1', name: 'Done' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbHsetCalls).toEqual([{ key: 'list:list-1', values: { name: 'Done' } }]);
	});

	it('PATCH updates list order', async () => {
		const response = await listsRoute.PATCH({
			request: new Request('http://localhost/api/lists', {
				method: 'PATCH',
				body: JSON.stringify({ listId: 'list-1', order: 3 })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbHsetCalls).toEqual([{ key: 'list:list-1', values: { order: 3 } }]);
	});

	it('PATCH throws 400 when payload is incomplete', async () => {
		await expectHttpErrorStatus(
			listsRoute.PATCH({
				request: new Request('http://localhost/api/lists', {
					method: 'PATCH',
					body: JSON.stringify({ listId: 'list-1' })
				})
			} as any),
			400
		);
		expect(state.rdbHsetCalls).toHaveLength(0);
	});

	it('DELETE throws 400 when id is missing', async () => {
		await expectHttpErrorStatus(
			listsRoute.DELETE({
				url: new URL('http://localhost/api/lists')
			} as any),
			400
		);
		expect(state.listsDelCalls).toHaveLength(0);
	});

	it('DELETE removes list and returns ok', async () => {
		const response = await listsRoute.DELETE({
			url: new URL('http://localhost/api/lists?id=list-9')
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.listsDelCalls).toEqual(['list-9']);
	});

	it('DELETE throws 500 when connector fails', async () => {
		state.listsDelError = new Error('delete list failed');

		await expectHttpErrorStatus(
			listsRoute.DELETE({
				url: new URL('http://localhost/api/lists?id=list-9')
			} as any),
			500
		);
	});
});

describe('api/cards +server', () => {
	it('POST throws 400 when listId or title is missing', async () => {
		await expectHttpErrorStatus(
			cardsRoute.POST({
				request: new Request('http://localhost/api/cards', {
					method: 'POST',
					body: JSON.stringify({})
				})
			} as any),
			400
		);
		expect(state.cardsCreateCalls).toHaveLength(0);
		expect(state.rdbSaddCalls).toHaveLength(0);
	});

	it('POST creates a card and links it to list cards set', async () => {
		state.cardsCreatedCardId = 'card-22';

		const response = await cardsRoute.POST({
			request: new Request('http://localhost/api/cards', {
				method: 'POST',
				body: JSON.stringify({ listId: 'list-3', title: 'Implement tests' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 'card-22', title: 'Implement tests' });
		expect(state.cardsCreateCalls).toEqual([{ listId: 'list-3', title: 'Implement tests' }]);
		expect(state.rdbSaddCalls).toContainEqual({ key: 'list:list-3:cards', value: 'card-22' });
	});

	it('POST throws 500 when connector fails', async () => {
		state.cardsCreateError = new Error('create card failed');

		await expectHttpErrorStatus(
			cardsRoute.POST({
				request: new Request('http://localhost/api/cards', {
					method: 'POST',
					body: JSON.stringify({ listId: 'list-3', title: 'Implement tests' })
				})
			} as any),
			500
		);
	});

	it('PATCH throws 400 when cardId is missing', async () => {
		await expectHttpErrorStatus(
			cardsRoute.PATCH({
				request: new Request('http://localhost/api/cards', {
					method: 'PATCH',
					body: JSON.stringify({ name: 'Renamed card' })
				})
			} as any),
			400
		);
		expect(state.rdbHsetCalls).toHaveLength(0);
	});

	it('PATCH updates card name when provided', async () => {
		const response = await cardsRoute.PATCH({
			request: new Request('http://localhost/api/cards', {
				method: 'PATCH',
				body: JSON.stringify({ cardId: 'card-1', name: 'Renamed card' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbHsetCalls).toEqual([{ key: 'card:card-1', values: { name: 'Renamed card' } }]);
		expect(state.rdbSremCalls).toHaveLength(0);
		expect(state.rdbSaddCalls).toHaveLength(0);
	});

	it('PATCH updates card completed state when provided', async () => {
		const response = await cardsRoute.PATCH({
			request: new Request('http://localhost/api/cards', {
				method: 'PATCH',
				body: JSON.stringify({ cardId: 'card-1', completed: true })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbHsetCalls).toEqual([{ key: 'card:card-1', values: { completed: 1 } }]);
	});

	it('PATCH reorders a card inside the same list when targetIndex is provided', async () => {
		state.rdbSmembersValues['list:list-a:cards'] = ['card-1', 'card-2', 'card-3'];
		state.rdbHgetValues['card:card-1:order'] = '0';
		state.rdbHgetValues['card:card-2:order'] = '1';
		state.rdbHgetValues['card:card-3:order'] = '2';

		const response = await cardsRoute.PATCH({
			request: new Request('http://localhost/api/cards', {
				method: 'PATCH',
				body: JSON.stringify({
					cardId: 'card-1',
					fromListId: 'list-a',
					toListId: 'list-a',
					targetIndex: 1
				})
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbSremCalls).toHaveLength(0);
		expect(state.rdbSaddCalls).toHaveLength(0);
		expect(state.rdbHsetCalls).toEqual([
			{ key: 'card:card-2', values: { list: 'list-a', order: 0 } },
			{ key: 'card:card-1', values: { list: 'list-a', order: 1 } },
			{ key: 'card:card-3', values: { list: 'list-a', order: 2 } }
		]);
	});

	it('PATCH moves a card between lists when both list ids are provided', async () => {
		const response = await cardsRoute.PATCH({
			request: new Request('http://localhost/api/cards', {
				method: 'PATCH',
				body: JSON.stringify({
					cardId: 'card-1',
					fromListId: 'list-a',
					toListId: 'list-b'
				})
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbSremCalls).toEqual([{ key: 'list:list-a:cards', value: 'card-1' }]);
		expect(state.rdbSaddCalls).toEqual([{ key: 'list:list-b:cards', value: 'card-1' }]);
		expect(state.rdbHsetCalls).toEqual([{ key: 'card:card-1', values: { list: 'list-b' } }]);
	});

	it('PATCH does not move card when fromListId and toListId are identical', async () => {
		const response = await cardsRoute.PATCH({
			request: new Request('http://localhost/api/cards', {
				method: 'PATCH',
				body: JSON.stringify({
					cardId: 'card-1',
					fromListId: 'list-a',
					toListId: 'list-a'
				})
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbSremCalls).toHaveLength(0);
		expect(state.rdbSaddCalls).toHaveLength(0);
		expect(state.rdbHsetCalls).toHaveLength(0);
	});

	it('DELETE removes card using query parameter id', async () => {
		const response = await cardsRoute.DELETE({
			url: new URL('http://localhost/api/cards?id=card-77'),
			request: new Request('http://localhost/api/cards?id=card-77', { method: 'DELETE' })
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.cardsDelCalls).toEqual(['card-77']);
	});

	it('DELETE removes card using JSON body fallback', async () => {
		const response = await cardsRoute.DELETE({
			url: new URL('http://localhost/api/cards'),
			request: new Request('http://localhost/api/cards', {
				method: 'DELETE',
				body: JSON.stringify({ cardId: 'card-12' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.cardsDelCalls).toEqual(['card-12']);
	});

	it('DELETE throws 400 when card id cannot be resolved', async () => {
		await expectHttpErrorStatus(
			cardsRoute.DELETE({
				url: new URL('http://localhost/api/cards'),
				request: new Request('http://localhost/api/cards', {
					method: 'DELETE',
					body: '{}'
				})
			} as any),
			400
		);
		expect(state.cardsDelCalls).toHaveLength(0);
	});

	it('DELETE throws 500 when connector fails', async () => {
		state.cardsDelError = new Error('delete card failed');

		await expectHttpErrorStatus(
			cardsRoute.DELETE({
				url: new URL('http://localhost/api/cards?id=card-77'),
				request: new Request('http://localhost/api/cards?id=card-77', { method: 'DELETE' })
			} as any),
			500
		);
	});
});

describe('api/tags +server', () => {
	it('POST throws 400 when cardId or name is missing', async () => {
		await expectHttpErrorStatus(
			tagsRoute.POST({
				request: new Request('http://localhost/api/tags', {
					method: 'POST',
					body: JSON.stringify({})
				})
			} as any),
			400
		);
		expect(state.tagsCreateCalls).toHaveLength(0);
		expect(state.rdbSaddCalls).toHaveLength(0);
	});

	it('POST creates a tag and adds it to card tags set', async () => {
		state.tagsCreatedTagId = 'tag-42';

		const response = await tagsRoute.POST({
			request: new Request('http://localhost/api/tags', {
				method: 'POST',
				body: JSON.stringify({ cardId: 'card-1', name: 'urgent' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 'tag-42', name: 'urgent' });
		expect(state.tagsCreateCalls).toEqual([
			{ cardId: 'card-1', name: 'urgent', type: 'label', color: 'gray' }
		]);
		expect(state.rdbSaddCalls).toContainEqual({ key: 'card:card-1:tags', value: 'tag-42' });
	});

	it('POST throws 500 when connector fails', async () => {
		state.tagsCreateError = new Error('create tag failed');

		await expectHttpErrorStatus(
			tagsRoute.POST({
				request: new Request('http://localhost/api/tags', {
					method: 'POST',
					body: JSON.stringify({ cardId: 'card-1', name: 'urgent' })
				})
			} as any),
			500
		);
	});

	it('DELETE throws 400 when body is not valid JSON', async () => {
		await expectHttpErrorStatus(
			tagsRoute.DELETE({
				request: new Request('http://localhost/api/tags', {
					method: 'DELETE',
					body: 'not-json'
				})
			} as any),
			400
		);
	});

	it('DELETE throws 400 when cardId or name is missing', async () => {
		await expectHttpErrorStatus(
			tagsRoute.DELETE({
				request: new Request('http://localhost/api/tags', {
					method: 'DELETE',
					body: JSON.stringify({ cardId: 'card-1' })
				})
			} as any),
			400
		);
	});

	it('DELETE removes only matching tag names', async () => {
		state.rdbSmembersValues['card:card-1:tags'] = ['tag-a', 'tag-b', 'tag-c'];
		state.rdbHgetValues['tag:tag-a:name'] = 'urgent';
		state.rdbHgetValues['tag:tag-b:name'] = 'feature';
		state.rdbHgetValues['tag:tag-c:name'] = 'urgent';

		const response = await tagsRoute.DELETE({
			request: new Request('http://localhost/api/tags', {
				method: 'DELETE',
				body: JSON.stringify({ cardId: 'card-1', name: 'urgent' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbSremCalls).toEqual([
			{ key: 'card:card-1:tags', value: 'tag-a' },
			{ key: 'card:card-1:tags', value: 'tag-c' }
		]);
		expect(state.rdbDelCalls).toEqual(['tag:tag-a', 'tag:tag-c']);
	});

	it('DELETE returns ok without deleting when no tag matches', async () => {
		state.rdbSmembersValues['card:card-1:tags'] = ['tag-b'];
		state.rdbHgetValues['tag:tag-b:name'] = 'feature';

		const response = await tagsRoute.DELETE({
			request: new Request('http://localhost/api/tags', {
				method: 'DELETE',
				body: JSON.stringify({ cardId: 'card-1', name: 'urgent' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(state.rdbSremCalls).toHaveLength(0);
		expect(state.rdbDelCalls).toHaveLength(0);
	});

	it('DELETE throws 500 when redis lookup fails', async () => {
		state.rdbSmembersError = new Error('redis unavailable');

		await expectHttpErrorStatus(
			tagsRoute.DELETE({
				request: new Request('http://localhost/api/tags', {
					method: 'DELETE',
					body: JSON.stringify({ cardId: 'card-1', name: 'urgent' })
				})
			} as any),
			500
		);
	});
});

describe('api/board-full +server', () => {
	it('GET throws 400 when boardId is missing', async () => {
		await expectHttpErrorStatus(
			boardFullRoute.GET({
				url: new URL('http://localhost/api/board-full')
			} as any),
			400
		);
		expect(state.getFullBoardCalls).toHaveLength(0);
	});

	it('GET throws 404 when board does not exist', async () => {
		state.getFullBoardValue = null;

		await expectHttpErrorStatus(
			boardFullRoute.GET({
				url: new URL('http://localhost/api/board-full?boardId=board-404')
			} as any),
			404
		);
		expect(state.getFullBoardCalls).toEqual(['board-404']);
	});

	it('GET returns hydrated board response with tag names', async () => {
		state.getFullBoardValue = {
			board: { uuid: 'board-1', name: 'Roadmap' },
			lists: [
				{
					uuid: 'list-1',
					name: 'Todo',
					order: 1,
					cards: [
						{ uuid: 'card-1', name: 'Implement integration tests', order: 2, completed: true }
					]
				},
				{
					uuid: 'list-2',
					name: 'Done',
					order: 2,
					cards: []
				}
			]
		};
		state.rdbSmembersValues['card:card-1:tags'] = ['tag-1', 'tag-2', 'tag-3'];
		state.rdbHgetallValues['tag:tag-1'] = { name: 'backend' };
		state.rdbHgetallValues['tag:tag-2'] = { name: 'urgent' };
		state.rdbHgetallValues['tag:tag-3'] = { color: 'gray' };

		const response = await boardFullRoute.GET({
			url: new URL('http://localhost/api/board-full?boardId=board-1')
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			board: { id: 'board-1', name: 'Roadmap' },
			lists: [
				{
					uuid: 'list-1',
					name: 'Todo',
					order: 1,
					cards: [
						{
							uuid: 'card-1',
							title: 'Implement integration tests',
							order: 2,
							completed: true,
							tags: ['backend', 'urgent']
						}
					]
				},
				{
					uuid: 'list-2',
					name: 'Done',
					order: 2,
					cards: []
				}
			]
		});
		expect(state.getFullBoardCalls).toEqual(['board-1']);
		expect(state.rdbSmembersCalls).toEqual(['card:card-1:tags']);
		expect(state.rdbHgetallCalls).toEqual(['tag:tag-1', 'tag:tag-2', 'tag:tag-3']);
	});
});

describe('api/login +server', () => {
	it('POST returns 400 when email is missing', async () => {
		const response = await loginRoute.POST({
			request: new Request('http://localhost/api/login', {
				method: 'POST',
				body: JSON.stringify({})
			})
		} as any);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Email manquant' });
		expect(state.loginGetByEmailCalls).toHaveLength(0);
		expect(state.loginSaveCalls).toHaveLength(0);
	});

	it('POST returns existing user when email already exists', async () => {
		state.loginUsersByEmail['dev@example.com'] = {
			uuid: 'user-42',
			email: 'dev@example.com',
			username: 'Dev'
		};

		const response = await loginRoute.POST({
			request: new Request('http://localhost/api/login', {
				method: 'POST',
				body: JSON.stringify({ email: '  DEV@example.com  ' })
			})
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			id: 'user-42',
			email: 'dev@example.com',
			name: 'Dev'
		});
		expect(state.loginGetByEmailCalls).toEqual(['dev@example.com']);
		expect(state.loginSaveCalls).toHaveLength(0);
	});

	it('POST creates and saves user with normalized email and derived name', async () => {
		const response = await loginRoute.POST({
			request: new Request('http://localhost/api/login', {
				method: 'POST',
				body: JSON.stringify({ email: '  New.User@Example.com  ' })
			})
		} as any);

		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload.email).toBe('new.user@example.com');
		expect(payload.name).toBe('new.user');
		expect(typeof payload.id).toBe('string');
		expect(payload.id.length).toBeGreaterThan(0);
		expect(state.loginGetByEmailCalls).toEqual(['new.user@example.com']);
		expect(state.loginSaveCalls).toHaveLength(1);
		expect(state.loginSaveCalls[0]).toMatchObject({
			uuid: payload.id,
			email: 'new.user@example.com',
			username: 'new.user',
			admin: 'no',
			password_hash: '',
			profile_picture_url: ''
		});
		expect(state.loginSaveCalls[0].boards).toEqual([]);
	});

	it('POST uses provided name when creating a new user', async () => {
		const response = await loginRoute.POST({
			request: new Request('http://localhost/api/login', {
				method: 'POST',
				body: JSON.stringify({
					email: 'product.owner@example.com',
					name: 'Product Owner'
				})
			})
		} as any);

		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload.name).toBe('Product Owner');
		expect(state.loginSaveCalls).toHaveLength(1);
		expect(state.loginSaveCalls[0].username).toBe('Product Owner');
	});
});
