import type { BoardFullResponse, BoardMember, UiList } from './board.types';

export type BoardUiState = {
	boardName: string;
	boardRole: 'owner' | 'editor' | 'viewer';
	canEdit: boolean;
	canManage: boolean;
	boardMembers: BoardMember[];
	lists: UiList[];
};

export function mapBoardPayloadToUiState(
	payload: BoardFullResponse,
	fallbackBoardName: string
): BoardUiState | null {
	if (!payload || !payload.board) {
		return null;
	}

	let localId = 1;
	return {
		boardName: payload.board.name ?? fallbackBoardName,
		boardRole: payload.board.role,
		canEdit: payload.board.canEdit,
		canManage: payload.board.canManage,
		boardMembers: payload.board.members ?? [],
		lists: payload.lists.map((list) => ({
			uuid: list.uuid,
			name: list.name,
			newCardTitle: '',
			cards: list.cards.map((card) => ({
				id: localId++,
				uuid: card.uuid,
				title: card.title,
				description: card.description ?? '',
				dueDate: card.dueDate ?? '',
				assignees: card.assignees ?? [],
				completed: card.completed ?? false,
				tags: card.tags ?? []
			}))
		}))
	};
}
