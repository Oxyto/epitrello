export type PromptOperation =
	| { type: 'create_list'; listName: string; sourceLine?: number }
	| { type: 'create_card'; listName: string; cardTitle: string; sourceLine?: number }
	| { type: 'add_tag'; cardTitle: string; tagName: string; sourceLine?: number };

function splitValues(raw: string) {
	return raw
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

function pushListOperations(operations: PromptOperation[], payload: string, sourceLine: number) {
	for (const listName of splitValues(payload)) {
		operations.push({ type: 'create_list', listName, sourceLine });
	}
}

function pushCardOperations(
	operations: PromptOperation[],
	listName: string,
	payload: string,
	sourceLine: number
) {
	for (const cardTitle of splitValues(payload)) {
		operations.push({ type: 'create_card', listName: listName.trim(), cardTitle, sourceLine });
	}
}

export function parsePromptOperations(prompt: string): PromptOperation[] {
	const operations: PromptOperation[] = [];
	const lines = prompt.split('\n');

	for (const [index, rawLine] of lines.entries()) {
		const sourceLine = index + 1;
		const chunks = rawLine
			.split(';')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		for (const line of chunks) {
			const lower = line.toLowerCase();

			if (lower.startsWith('list:') || lower.startsWith('liste:')) {
				pushListOperations(operations, line.slice(line.indexOf(':') + 1).trim(), sourceLine);
				continue;
			}

			if (
				lower.startsWith('create lists:') ||
				lower.startsWith('create list:') ||
				lower.startsWith('crée listes:') ||
				lower.startsWith('crée liste:') ||
				lower.startsWith('creer listes:') ||
				lower.startsWith('creer liste:')
			) {
				pushListOperations(operations, line.slice(line.indexOf(':') + 1).trim(), sourceLine);
				continue;
			}

			if (lower.startsWith('card:') || lower.startsWith('carte:')) {
				const [listNameRaw, cardTitleRaw] = line.slice(line.indexOf(':') + 1).trim().split('|');
				const listName = (listNameRaw ?? '').trim();
				const cardTitle = (cardTitleRaw ?? '').trim();
				if (listName && cardTitle) {
					operations.push({ type: 'create_card', listName, cardTitle, sourceLine });
				}
				continue;
			}

			if (lower.startsWith('tag:') || lower.startsWith('étiquette:') || lower.startsWith('etiquette:')) {
				const [cardTitleRaw, tagNameRaw] = line.slice(line.indexOf(':') + 1).trim().split('|');
				const cardTitle = (cardTitleRaw ?? '').trim();
				const tagName = (tagNameRaw ?? '').trim();
				if (cardTitle && tagName) {
					operations.push({ type: 'add_tag', cardTitle, tagName, sourceLine });
				}
				continue;
			}

			const createListMatch = line.match(/cr[eé]e(?:r)?\s+(?:les?\s+)?listes?\s*:?\s*(.+)$/i);
			if (createListMatch) {
				pushListOperations(operations, createListMatch[1], sourceLine);
				continue;
			}

			const createCardsInListMatch = line.match(
				/(?:ajoute|cr[eé]e(?:r)?)\s+(?:des\s+)?cartes?\s+(?:dans|sur)\s+([^:]+)\s*:?\s*(.+)$/i
			);
			if (createCardsInListMatch) {
				pushCardOperations(operations, createCardsInListMatch[1], createCardsInListMatch[2], sourceLine);
				continue;
			}

			const createSingleCardMatch = line.match(
				/cr[eé]e(?:r)?\s+(?:une?\s+)?carte\s+(.+)\s+(?:dans|sur)\s+(.+)$/i
			);
			if (createSingleCardMatch) {
				const cardTitle = createSingleCardMatch[1].trim();
				const listName = createSingleCardMatch[2].trim();
				if (listName && cardTitle) {
					operations.push({ type: 'create_card', listName, cardTitle, sourceLine });
				}
				continue;
			}

			const addTagMatch = line.match(/(?:ajoute|mets?)\s+(?:le\s+)?tag\s+(.+?)\s+(?:sur|pour|à)\s+(.+)$/i);
			if (addTagMatch) {
				const tagName = addTagMatch[1].trim();
				const cardTitle = addTagMatch[2].trim();
				if (cardTitle && tagName) {
					operations.push({ type: 'add_tag', cardTitle, tagName, sourceLine });
				}
			}
		}
	}

	return operations;
}

export function collectPromptOperationErrors(
	operations: PromptOperation[],
	context: { listNames: string[]; cardTitles: string[] }
) {
	const knownLists = new Set(context.listNames.map((value) => value.trim().toLowerCase()));
	const knownCards = new Set(context.cardTitles.map((value) => value.trim().toLowerCase()));
	const errors: string[] = [];

	for (const [index, operation] of operations.entries()) {
		const step = index + 1;
		const sourceLabel = Number.isFinite(operation.sourceLine)
			? `[line ${operation.sourceLine}, step ${step}]`
			: `[step ${step}]`;

		if (operation.type === 'create_list') {
			const normalizedList = operation.listName.trim().toLowerCase();
			if (!normalizedList) {
				errors.push(`${sourceLabel} List name is empty.`);
			}
			knownLists.add(normalizedList);
			continue;
		}

		if (operation.type === 'create_card') {
			const normalizedList = operation.listName.trim().toLowerCase();
			const normalizedCard = operation.cardTitle.trim().toLowerCase();
			if (!knownLists.has(normalizedList)) {
				errors.push(
					`${sourceLabel} Unknown list "${operation.listName}" for card "${operation.cardTitle}".`
				);
			}
			if (!normalizedCard) {
				errors.push(`${sourceLabel} Card title is empty.`);
			} else {
				knownCards.add(normalizedCard);
			}
			continue;
		}

		if (operation.type === 'add_tag') {
			const normalizedCard = operation.cardTitle.trim().toLowerCase();
			if (!knownCards.has(normalizedCard)) {
				errors.push(
					`${sourceLabel} Unknown card "${operation.cardTitle}" for tag "${operation.tagName}".`
				);
			}
			if (!operation.tagName.trim()) {
				errors.push(`${sourceLabel} Tag name is empty.`);
			}
		}
	}

	return errors;
}
