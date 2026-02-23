export type SessionUser = {
	id: string;
};

export type BoardSearchItem = {
	uuid: string;
	name: string;
	owner: string;
	ownerName: string;
	role: 'owner' | 'editor' | 'viewer';
};

export type BoardSearchResponse = {
	ownedBoards: BoardSearchItem[];
	sharedBoards: BoardSearchItem[];
};

export type SuggestionEntry = {
	board: BoardSearchItem;
	group: 'owned' | 'shared';
	index: number;
};

export type NotificationItem = {
	id: string;
	type: 'board.added' | 'card.due_date';
	title: string;
	message: string;
	boardId: string | null;
	boardName: string | null;
	cardId: string | null;
	cardTitle: string | null;
	dueDate: string | null;
	createdAt: string;
	readAt: string | null;
};

export type NotificationsResponse = {
	notifications: NotificationItem[];
};

export type BoardTemplateId = 'product_roadmap' | 'sprint_planning' | 'personal_project';
