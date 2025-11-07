<div id="card-editor" class="absolute left-0 top-16 h-[calc(100vh-4rem)] w-screen bg-black/50">
    <div class="absolute left-1/2 top-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded bg-white p-8 shadow-lg">
        <button class="absolute right-4 top-4 text-gray-600 hover:text-gray-800" onclick={() => window.location.hash = ''}>×</button>
        <h2 class="mb-4 text-2xl font-semibold">Edit Card</h2>
        <form id="edit-card-form" class="flex flex-col gap-4">
            <div class="flex flex-col">
                <label for="card-title" class="mb-2 font-medium">Title:</label>
                <input type="text" id="card-title" name="card-title" class="rounded border border-gray-300 p-2" required />
            </div>
            <div class="flex flex-col">
                <label for="card-description" class="mb-2 font-medium">Description:</label>
                <textarea id="card-description" name="card-description" class="rounded border border-gray-300 p-2" rows="4"></textarea>
            </div>
            <button type="submit" class="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Save Changes</button>
        </form>
    </div>
</div>
