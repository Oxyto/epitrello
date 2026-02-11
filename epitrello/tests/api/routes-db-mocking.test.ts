import { beforeEach, describe, expect, it, mock } from 'bun:test';

type MockUser = { uuid: string } | null;
type MockBoard = { uuid: string; name: string; owner: string } | null;

const state = {
	boardStateGetValue: null as string | null,
	boardStateGetCalls: [] as string[],
	boardStateSetCalls: [] as Array<{ key: string; value: string }>,
	boardsUser: { uuid: 'user-1' } as MockUser,
	boardsBoard: { uuid: 'board-1', name: 'Roadmap', owner: 'user-1' } as MockBoard,
	boardsCreatedBoardId: 'board-1',
	boardsUserGetCalls: [] as string[],
	boardsCreateCalls: [] as Array<{ ownerId: string; name: string }>,
	boardsGetCalls: [] as string[],
	boardsDelCalls: [] as string[],
	boardsHsetCalls: [] as Array<{ key: string; values: unknown }>
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
		state.boardsHsetCalls.push({ key, values });
		return 1;
	}
};

const UserConnector = {
	get: async (ownerId: string) => {
		state.boardsUserGetCalls.push(ownerId);
		return state.boardsUser;
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

mock.module('$lib/server/redisConnector', () => ({
	rdb,
	UserConnector,
	BoardConnector
}));

const boardStateRoute = await import('../../src/routes/api/board-state/+server');
const boardsRoute = await import('../../src/routes/api/boards/+server');

const expectHttpErrorStatus = async (promise: Promise<unknown>, status: number) => {
	try {
		await promise;
		throw new Error('Expected handler to throw an HttpError');
	} catch (error: any) {
		expect(error?.status).toBe(status);
	}
};

describe('api/board-state +server', () => {
	beforeEach(() => {
		state.boardStateGetValue = null;
		state.boardStateGetCalls.length = 0;
		state.boardStateSetCalls.length = 0;
	});

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
	beforeEach(() => {
		state.boardsUser = { uuid: 'user-1' };
		state.boardsBoard = { uuid: 'board-1', name: 'Roadmap', owner: 'user-1' };
		state.boardsCreatedBoardId = 'board-1';
		state.boardsUserGetCalls.length = 0;
		state.boardsCreateCalls.length = 0;
		state.boardsGetCalls.length = 0;
		state.boardsDelCalls.length = 0;
		state.boardsHsetCalls.length = 0;
	});

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
		expect(state.boardsHsetCalls).toEqual([
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
		expect(state.boardsHsetCalls).toHaveLength(0);
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
