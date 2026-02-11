<script lang="ts">
	import UserSearchBar from '../../user_search_bar.svelte';
	import Card from './card.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type UiCard = {
		id: number;
		uuid?: string;
		title: string;
		tags: string[];
	};

	type UiList = {
		uuid?: string;
		name: string;
		cards: UiCard[];
		newCardTitle: string;
	};
	type BoardFullResponse = {
	board: { id: string; name: string };
	lists: Array<{
		uuid: string;
		name: string;
		order: number;
		cards: Array<{
			uuid: string;
			title: string;
			order: number;
			tags: string[];
		}>;
	}>;
};
	const { data } = $props<{
		data: {
			board: { id: string; name: string } | undefined;
		};
	}>();

	const boardId: string | undefined = data.board?.id;

	let ready = $state(false);
	let board_name = $state(data.board?.name ?? 'Board');

	let lists = $state<UiList[]>([]);
	let newListName = $state('');
	let nextLocalCardId = 1;
		let selectedCardRef = $state<{ listIndex: number; cardIndex: number } | null>(null);

	const selectedList = $derived<UiList | null>(
		selectedCardRef && lists[selectedCardRef.listIndex]
			? lists[selectedCardRef.listIndex]
			: null
	);

	const selectedCard = $derived<UiCard | null>(
		selectedCardRef &&
		selectedList &&
		selectedList.cards[selectedCardRef.cardIndex]
			? selectedList.cards[selectedCardRef.cardIndex]
			: null
	);

	function applyLoadedState(payload: BoardFullResponse) {
	if (!payload || !payload.board) return;

	board_name = payload.board.name ?? board_name;

	const mapped: UiList[] = payload.lists.map((list) => ({
		uuid: list.uuid,
		name: list.name,
		newCardTitle: '',
		cards: list.cards.map((card, idx) => ({
			id: idx + 1,
			uuid: card.uuid,
			title: card.title,
			tags: card.tags ?? []
		}))
	}));

	lists = mapped;
}

async function loadBoardFull() {
	if (!browser || !boardId) return;

	try {
		const res = await fetch(`/api/board-full?boardId=${boardId}`);
		if (!res.ok) {
			console.warn('Erreur /api/board-full', await res.text());
			return;
		}
		const payload = (await res.json()) as BoardFullResponse;
		console.log('board-full payload', payload);
		applyLoadedState(payload);
	} catch (err) {
		console.error('Erreur réseau /api/board-full', err);
	}
}

	async function loadBoardFromRedis() {
		if (!browser || !boardId) return;

		try {
			const res = await fetch(`/api/board-full?boardId=${boardId}`);
			if (!res.ok) {
				console.warn('board-full error', await res.text());
				return;
			}

			const payload = await res.json() as {
				board: { uuid: string; name: string };
				lists: Array<{
					uuid: string;
					name: string;
					cards: Array<{ uuid: string; title: string; tags: string[] }>;
				}>;
			};

			board_name = payload.board.name;

			let localId = 1;
			lists = payload.lists.map((l) => ({
				uuid: l.uuid,
				name: l.name,
				newCardTitle: '',
				cards: (l.cards ?? []).map((c) => ({
					id: localId++,
					uuid: c.uuid,
					title: c.title,
					tags: c.tags ?? []
				}))
			}));
		} catch (err) {
			console.error('Erreur loadBoardFromRedis', err);
		}
	}

	onMount(async () => {
		if (!browser) {
			ready = true;
			return;
		}

		await loadBoardFull();
		ready = true;
	});

	async function addList() {
		const name = newListName.trim();
		if (!name || !boardId) return;

		try {
			const res = await fetch('/api/lists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ boardId, name })
			});

			if (!res.ok) {
				console.error('Erreur création liste', await res.text());
				return;
			}

			const payload = await res.json() as { id: string; name: string };

			lists = [
				...lists,
				{
					uuid: payload.id,
					name: payload.name,
					cards: [],
					newCardTitle: ''
				}
			];

			newListName = '';
		} catch (err) {
			console.error('Erreur réseau /api/lists', err);
		}
	}

	async function deleteList(index: number) {
		const list = lists[index];
		if (!list) return;
		lists = lists.filter((_, i) => i !== index);
		if (list.uuid) {
			try {
				const res = await fetch(`/api/lists?id=${encodeURIComponent(list.uuid)}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					console.error('Erreur API delete list', await res.text());
				}
			} catch (err) {
				console.error('Erreur réseau delete list', err);
			}
		}
	}

async function updateListName(index: number, event: Event) {
	const target = event.currentTarget as HTMLInputElement;
	if (!lists[index]) return;

	const newName = target.value;
	lists[index].name = newName;

	const listUuid = lists[index].uuid;
	if (!browser || !listUuid) return;

	try {
		await fetch('/api/lists', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ listId: listUuid, name: newName.trim() })
		});
	} catch (err) {
		console.error('Erreur rename list', err);
	}
}


function updateListNewCardTitle(index: number, event: Event) {
	const target = event.currentTarget as HTMLInputElement;
	if (!lists[index]) return;
	lists[index].newCardTitle = target.value;
}
async function persistBoardName() {
	if (!browser || !boardId) return;

	const name = board_name.trim();
	if (!name) return;

	try {
		await fetch('/api/boards', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ boardId, name })
		});
	} catch (err) {
		console.error('Erreur rename board', err);
	}
}

	async function addCard(listIndex: number) {
		const list = lists[listIndex];
		if (!list || !list.uuid) return;

		const title = (list.newCardTitle ?? '').trim();
		if (!title) return;
		const localId = nextLocalCardId++;
		const newCard: UiCard = {
			id: localId,
			title,
			tags: [],
			uuid: undefined
		};
		list.cards.push(newCard);
		list.newCardTitle = '';
		try {
			const res = await fetch('/api/cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ listId: list.uuid, title })
			});

			if (!res.ok) {
				console.error('Erreur création carte', await res.text());
				return;
			}

			const payload = await res.json() as { id: string; title: string };
			const card = list.cards.find((c) => c.id === localId);
			if (card) {
				card.uuid = payload.id;
			}
		} catch (err) {
			console.error('Erreur réseau /api/cards', err);
		}
	}

async function handleDeleteCard(
  event: CustomEvent<{ listIndex: number; cardIndex: number }>
) {
  const { listIndex, cardIndex } = event.detail;

  if (!Array.isArray(lists) || !lists[listIndex]) {
    console.warn('handleDeleteCard: listIndex invalide', listIndex, lists);
    return;
  }

  const list = lists[listIndex];
  if (!Array.isArray(list.cards) || !list.cards[cardIndex]) {
    console.warn('handleDeleteCard: cardIndex invalide', cardIndex, list.cards);
    return;
  }

  const card = list.cards[cardIndex];
  const cardUuid = card.uuid;

  const newLists = lists.map((l, li) => {
    if (li !== listIndex) return l;

    return {
      ...l,
      cards: l.cards.filter((_, ci) => ci !== cardIndex)
    };
  });

  lists = newLists;
  if (cardUuid) {
    try {
      const res = await fetch(`/api/cards?id=${cardUuid}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        console.error('Erreur API delete card', await res.text());
      }
    } catch (err) {
      console.error('Erreur réseau API delete card', err);
    }
  } else {
    console.warn('handleDeleteCard: pas de uuid sur la carte, API non appelée');
  }
}
	function handleOpenDetails(
		event: CustomEvent<{ listIndex: number; cardIndex: number }>
	) {
		const { listIndex, cardIndex } = event.detail;
		selectedCardRef = { listIndex, cardIndex };
	}

	function closeDetails() {
		selectedCardRef = null;
	}

	async function handleUpdateTitle(
	event: CustomEvent<{ listIndex: number; cardIndex: number; title: string }>
) {
	const { listIndex, cardIndex, title } = event.detail;

	const list = lists[listIndex];
	if (!list || !list.cards[cardIndex]) return;

	const card = list.cards[cardIndex];
	card.title = title;

	const cardUuid = card.uuid;
	if (!browser || !cardUuid) return;

	try {
		await fetch('/api/cards', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cardId: cardUuid, name: title.trim() })
		});
	} catch (err) {
		console.error('Erreur rename card', err);
	}
}

	async function handleMoveCard(
	event: CustomEvent<{ listIndex: number; cardIndex: number; direction: number }>
) {
	const { listIndex, cardIndex, direction } = event.detail;

	const fromList = lists[listIndex];
	if (!fromList || !fromList.cards[cardIndex]) {
		console.warn('handleMoveCard: index invalide', event.detail, lists);
		return;
	}

	const newListIndex = listIndex + direction;
	const toList = lists[newListIndex];
	if (!toList) {
		console.warn('handleMoveCard: nouvelle liste inexistante', newListIndex, lists);
		return;
	}

	const [card] = fromList.cards.splice(cardIndex, 1);
	toList.cards.push(card);

	const cardUuid = card.uuid;
	const fromUuid = fromList.uuid;
	const toUuid = toList.uuid;

	if (browser && cardUuid && fromUuid && toUuid && fromUuid !== toUuid) {
		try {
			await fetch('/api/cards', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardId: cardUuid,
					fromListId: fromUuid,
					toListId: toUuid
				})
			});
		} catch (err) {
			console.error('Erreur move card', err);
		}
	}
}

	async function handleAddTag(
		event: CustomEvent<{ listIndex: number; cardIndex: number; tag: string }>
	) {
		const { listIndex, cardIndex, tag } = event.detail;

		const list = lists[listIndex];
		if (!list || !list.cards[cardIndex]) return;

		const card = list.cards[cardIndex];
		if (card.tags.includes(tag)) return;

		card.tags.push(tag);
		if (!card.uuid) return;
		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cardId: card.uuid, name: tag })
			});
			if (!res.ok) {
				console.error('Erreur API add tag', await res.text());
			}
		} catch (err) {
			console.error('Erreur réseau add tag', err);
		}
	}

async function handleRemoveTag(e: CustomEvent<{ cardId: number; tag: string }>) {
  const { cardId, tag } = e.detail;

  let cardUuid: string | undefined;
  const updatedLists = lists.map((list) => {
    const cards = list.cards.map((card) => {
      if (card.id === cardId) {
        cardUuid = card.uuid;
        return {
          ...card,
          tags: (card.tags ?? []).filter((t) => t !== tag)
        };
      }
      return card;
    });

    return { ...list, cards };
  });

  lists = updatedLists;
  if (cardUuid) {
    try {
      const res = await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: cardUuid, name: tag })
      });

      if (!res.ok) {
        console.error('Erreur API delete tag', await res.text());
      }
    } catch (err) {
      console.error('Erreur réseau API delete tag', err);
    }
  } else {
    console.warn('handleRemoveTag: pas de uuid sur la carte, API non appelée');
  }
}
</script>

{#if ready}
	<UserSearchBar />
	<div class="min-h-[calc(100vh-4rem)] w-screen bg-gray-600 p-4">
		<div class="mb-4 flex items-center gap-4 rounded bg-gray-100 p-4 shadow-md">
			<input
				class="text-gray-800 rounded-md border-0 bg-transparent text-3xl font-bold hover:bg-gray-200 focus:outline-0 transition-colors"
				title="Board Name"
				type="text"
				bind:value={board_name}
				placeholder="Board name..."
				on:blur={persistBoardName}
			/>
		</div>

		<div class="flex gap-4 overflow-x-auto p-4">
			{#each lists as list, i}
				<div class="min-w-[250px] rounded-md bg-gray-100 p-4 text-gray-800 shadow-md">
					<div class="flex flex-row items-center justify-center gap-2 min-w-full">
						<input
							class="w-full rounded-md border-0 bg-gray-100 hover:bg-gray-200 font-mono text-xl font-bold transition-all"
							value={list.name}
							on:input={(e) => updateListName(i, e)}
						/>
						<button
							type="button"
							class="w-20 pb-1 hover:text-red-500 hover:cursor-pointer transition-all text-2xl font-bold font-mono"
							on:click={() => deleteList(i)}
						>
							[X]
						</button>
					</div>

					<ol class="mt-4 flex flex-col gap-2 bg-gray-100">
						{#each list.cards as card, j}
							<Card
								{card}
								listIndex={i}
								cardIndex={j}
								on:addTag={handleAddTag}
								on:removeTag={handleRemoveTag}
								on:updateTitle={handleUpdateTitle}
								on:moveCard={handleMoveCard}
								on:deleteCard={handleDeleteCard}
								on:openDetails={handleOpenDetails} 
							/>
						{/each}
					</ol>

					<form
						class="mt-3 flex gap-2"
						on:submit|preventDefault={() => addCard(i)}
					>
						<input
							type="text"
							class="w-full rounded-md border-0 bg-sky-700 p-2 font-mono shadow-md shadow-gray-300 placeholder:text-gray-300 text-gray-100"
							placeholder="New card title..."
							value={list.newCardTitle}
							on:input={(e) => updateListNewCardTitle(i, e)}
						/>
						<button
							type="submit"
							class="w-24 rounded-md bg-sky-500 px-3 text-white shadow-md shadow-gray-300 hover:bg-sky-400 hover:cursor-pointer transition-all"
						>
							+ Add
						</button>
					</form>
				</div>
			{/each}

			<div class="min-w-[250px] rounded-md bg-gray-100 p-4 text-white shadow-md">
				<form on:submit|preventDefault={addList} class="flex flex-col gap-2">
					<input
						type="text"
						class="w-full rounded-md border-0 bg-sky-700 p-2 font-mono shadow shadow-gray-300 placeholder:text-gray-300"
						placeholder="New list name..."
						bind:value={newListName}
					/>
					<button
						type="submit"
						class="w-full rounded-md bg-sky-500 px-4 py-2 shadow shadow-gray-300 hover:bg-sky-400 hover:cursor-pointer transition-all"
					>
						+ Add List
					</button>
				</form>
			</div>
		</div>
	</div>
		{#if selectedCard && selectedList}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="relative w-full max-w-3xl rounded-lg bg-gray-900 text-gray-100 p-6 shadow-xl">
				<button
					type="button"
					class="absolute right-4 top-4 text-gray-400 hover:text-white"
					on:click={closeDetails}
				>
					✕
				</button>

				<!-- Header -->
				<h2 class="mb-1 text-xl font-bold">{selectedCard.title}</h2>
				<p class="mb-4 text-sm text-gray-400">
					in list <span class="font-semibold text-gray-200">{selectedList.name}</span>
				</p>

				<!-- Description (placeholder pour l’instant) -->
				<section class="mb-4">
					<h3 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
						Description
					</h3>
					<p class="rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-300">
						(Description à venir)
					</p>
				</section>

				<!-- Tags en lecture seule pour l’instant -->
				{#if selectedCard.tags?.length}
					<section>
						<h3 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
							Tags
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each selectedCard.tags as tag}
								<span class="rounded bg-sky-600 px-2 py-0.5 text-xs">
									{tag}
								</span>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		</div>
	{/if}
{:else}
	<div class="flex min-h-[calc(100vh-4rem)] w-screen items-center justify-center bg-gray-600">
		<p class="rounded bg-gray-800 px-4 py-2 text-sm text-gray-200">
			Chargement du board...
		</p>
	</div>
{/if}
