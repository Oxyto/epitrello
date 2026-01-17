<div id="card-editor" class="absolute left-0 top-16 h-[calc(100vh-4rem)] w-screen bg-black/50">
    <div class="absolute left-1/2 top-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-8 shadow-lg">
        <button class="absolute right-4 top-4 text-gray-600 hover:text-red-500" onclick={() => window.location.hash = ''}>X</button>
        <h2 class="mb-4 text-2xl font-mono">Edit Card</h2>
        <form id="edit-card-form" class="flex flex-col gap-4">
            <div class="flex flex-col">
                <label for="card-title" class="mb-2 font-mono">Title:</label>
                <input type="text" id="card-title" name="card-title" class="rounded-md border border-gray-300 p-2 shadow" required />
            </div>
            <div class="flex flex-col">
                <label for="card-description" class="mb-2 font-mono">Description:</label>
                <textarea id="card-description" name="card-description" class="rounded-md border border-gray-300 p-2 shadow" rows="4"></textarea>
            </div>
            <button type="submit" class="mt-4 rounded-md bg-sky-500 px-4 py-2 text-white hover:bg-sky-400 shadow">Save Changes</button>
        </form>
    </div>
</div>
