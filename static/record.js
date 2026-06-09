document.addEventListener('DOMContentLoaded', () => {
    const recordForm = document.getElementById('recordForm');
    const existingOutfitSelect = document.getElementById('existingOutfitSelect');
    const selectedOutfitSummary = document.getElementById('selectedOutfitSummary');
    const newOutfitFields = document.getElementById('newOutfitFields');
    const wardrobeSelect = document.getElementById('wardrobeSelect');
    const outfitName = document.getElementById('outfitName');
    const outfitDescription = document.getElementById('outfitDescription');
    const recordDate = document.getElementById('recordDate');
    const recordSeason = document.getElementById('recordSeason');
    const recordWeather = document.getElementById('recordWeather');
    const recordOccasion = document.getElementById('recordOccasion');
    const recordMood = document.getElementById('recordMood');
    const recordNote = document.getElementById('recordNote');
    const searchInput = document.getElementById('recordSearchInput');
    const categoryFilter = document.getElementById('recordCategoryFilter');
    const clothesGrid = document.querySelector('.clothes-grid');
    const canvasArea = document.querySelector('.canvas-area');
    const closetPanelTitle = document.getElementById('closetPanelTitle');
    const photoUpload = document.getElementById('photoUpload');
    const uploadText = document.getElementById('uploadText');
    const uploadSection = document.getElementById('recordUploadSection');
    const saveRecordBtn = document.getElementById('saveRecordBtn');
    const cancelEditBtn = document.getElementById('cancelRecordEditBtn');
    const stars = [...document.querySelectorAll('.stars button')];

    let outfits = [];
    let wardrobes = [];
    let allItems = [];
    let selectedItemIds = [];
    let selectedOutfit = null;
    let rating = 0;
    let editingRecordId = null;
    let editingRecordDatetime = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function firstValue(value) {
        return String(value || '').split(',').map((part) => part.trim()).filter(Boolean)[0] || '';
    }

    async function api(path, options = {}) {
        const response = await fetch(path, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    }

    function setRating(value) {
        rating = Number(value) || 0;
        stars.forEach((star, index) => {
            star.textContent = index < rating ? '\u2605' : '\u2606';
            star.classList.toggle('active', index < rating);
        });
    }

    function selectedItems() {
        return allItems.filter((item) => selectedItemIds.includes(Number(item.item_id)));
    }

    function filteredItems() {
        const closetId = Number(wardrobeSelect.value || 0);
        const query = searchInput.value.trim().toLowerCase();
        const category = categoryFilter.value;
        return allItems.filter((item) => {
            const matchesCloset = !closetId || Number(item.c_id) === closetId;
            const matchesCategory = !category || firstValue(item.category) === category;
            const haystack = [
                item.item_name,
                item.category,
                item.color,
                item.tag,
            ].join(' ').toLowerCase();
            return matchesCloset && matchesCategory && (!query || haystack.includes(query));
        });
    }

    function itemCard(item, canvas = false) {
        const isSelected = selectedItemIds.includes(Number(item.item_id));
        const locked = Boolean(selectedOutfit);
        const image = firstValue(item.image_url);
        return `
            <button
                type="button"
                class="cloth-card${isSelected ? ' selected' : ''}${locked ? ' locked' : ''}"
                data-item-id="${item.item_id}"
                ${locked || canvas ? 'disabled' : ''}
            >
                ${image ? `<div class="cloth-card-image"><img src="${escapeHtml(image)}" alt=""></div>` : ''}
                <span class="cloth-card-title">${escapeHtml(item.item_name)}</span>
                <span class="cloth-card-meta">${escapeHtml(firstValue(item.category) || firstValue(item.tag) || '')}</span>
                <span class="cloth-card-sub">${escapeHtml(firstValue(item.color) || '')}</span>
            </button>
        `;
    }

    function renderItems() {
        const rows = filteredItems();
        if (!rows.length) {
            clothesGrid.innerHTML = '<div class="no-items">No clothing items found.</div>';
            return;
        }
        clothesGrid.innerHTML = rows.map((item) => itemCard(item)).join('');
        if (!selectedOutfit) {
            clothesGrid.querySelectorAll('.cloth-card').forEach((card) => {
                card.addEventListener('click', () => {
                    const itemId = Number(card.dataset.itemId);
                    selectedItemIds = selectedItemIds.includes(itemId)
                        ? selectedItemIds.filter((id) => id !== itemId)
                        : [...selectedItemIds, itemId];
                    renderItems();
                    renderCanvas();
                });
            });
        }
    }

    function renderCanvas() {
        const rows = selectedItems();
        if (!rows.length) {
            canvasArea.innerHTML = '<p>Click clothes to add them</p>';
            return;
        }
        canvasArea.innerHTML = rows.map((item) => itemCard(item, true)).join('');
    }

    function renderOutfitSummary() {
        if (!selectedOutfit) {
            selectedOutfitSummary.hidden = true;
            selectedOutfitSummary.innerHTML = '';
            return;
        }
        selectedOutfitSummary.hidden = false;
        selectedOutfitSummary.innerHTML = `
            <strong>${escapeHtml(selectedOutfit.outfit_name)}</strong>
            <span>${selectedOutfit.item_count || selectedItemIds.length} items</span>
            <span>${escapeHtml(firstValue(selectedOutfit.season) || 'Any season')}</span>
            <span>${escapeHtml(firstValue(selectedOutfit.occasion) || 'Any occasion')}</span>
        `;
    }

    function setExistingMode(enabled) {
        newOutfitFields.hidden = enabled;
        uploadSection.hidden = enabled;
        wardrobeSelect.disabled = enabled;
        searchInput.disabled = enabled;
        categoryFilter.disabled = enabled;
        closetPanelTitle.textContent = enabled ? 'Saved Outfit Items' : 'Choose Clothing';
        renderOutfitSummary();
        renderItems();
        renderCanvas();
    }

    async function chooseOutfit(outfitId) {
        if (!outfitId) {
            selectedOutfit = null;
            selectedItemIds = [];
            setExistingMode(false);
            return;
        }
        selectedOutfit = await api(`/api/outfits/${outfitId}`);
        selectedItemIds = (selectedOutfit.item_ids || []).map(Number);
        setExistingMode(true);
    }

    async function uploadPhoto() {
        const file = photoUpload.files?.[0];
        if (!file) return '';
        const body = new FormData();
        body.append('image', file);
        const response = await fetch('/api/uploads', { method: 'POST', body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Photo upload failed');
        return data.image_url || '';
    }

    async function loadReferenceData() {
        [outfits, wardrobes, allItems] = await Promise.all([
            api('/api/outfits'),
            api('/api/wardrobes'),
            api('/api/items'),
        ]);

        existingOutfitSelect.innerHTML = '<option value="">Create a new outfit</option>' + outfits.map((outfit) => (
            `<option value="${outfit.outfit_id}">${escapeHtml(outfit.outfit_name)}</option>`
        )).join('');
        wardrobeSelect.innerHTML = '<option value="">All Wardrobes</option>' + wardrobes.map((wardrobe) => (
            `<option value="${wardrobe.c_id}">${escapeHtml(wardrobe.c_name)}</option>`
        )).join('');

        const categories = [...new Set(allItems.map((item) => firstValue(item.category)).filter(Boolean))].sort();
        categoryFilter.innerHTML = '<option value="">All Categories</option>' + categories.map((category) => (
            `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
        )).join('');

        renderItems();
        renderCanvas();

        const requestedOutfitId = new URLSearchParams(window.location.search).get('outfit_id');
        if (requestedOutfitId && outfits.some((outfit) => String(outfit.outfit_id) === requestedOutfitId)) {
            existingOutfitSelect.value = requestedOutfitId;
            await chooseOutfit(requestedOutfitId);
        }
    }

    function resetRecordForm() {
        recordForm.reset();
        existingOutfitSelect.value = '';
        selectedOutfit = null;
        selectedItemIds = [];
        editingRecordId = null;
        editingRecordDatetime = null;
        recordDate.value = new Date().toISOString().split('T')[0];
        recordDate.disabled = false;
        existingOutfitSelect.disabled = false;
        saveRecordBtn.textContent = 'Save Wear Record';
        cancelEditBtn.hidden = true;
        uploadText.textContent = 'Upload New Outfit Photo';
        setRating(0);
        setExistingMode(false);
    }

    async function loadHistory() {
        try {
            const records = await api('/api/records');
            const history = document.getElementById('recordHistory');
            const rows = records.slice(0, 5);
            if (!rows.length) {
                history.innerHTML = '<div class="history-row"><span>No records yet.</span></div>';
                return;
            }
            history.innerHTML = rows.map((row) => `
                <div class="history-row">
                    <div class="history-content">
                        <strong>${escapeHtml(row.outfit_name)}</strong>
                        <span>${escapeHtml(row.datetime)} | ${escapeHtml(row.weather || 'N/A')} | ${escapeHtml(row.rating || '-')} stars</span>
                    </div>
                    <div class="history-actions">
                        <button class="edit-record-btn" data-id="${row.outfit_id}" data-datetime="${escapeHtml(row.datetime)}">Edit</button>
                        <button class="delete-record-btn" data-id="${row.outfit_id}" data-datetime="${escapeHtml(row.datetime)}">Delete</button>
                    </div>
                </div>
            `).join('');

            history.querySelectorAll('.edit-record-btn').forEach((button) => {
                button.addEventListener('click', () => editRecord(
                    Number(button.dataset.id),
                    button.dataset.datetime,
                    records,
                ));
            });
            history.querySelectorAll('.delete-record-btn').forEach((button) => {
                button.addEventListener('click', () => deleteRecord(
                    Number(button.dataset.id),
                    button.dataset.datetime,
                ));
            });
        } catch (error) {
            document.getElementById('recordHistory').innerHTML = '<div class="history-row"><span>Unable to load records.</span></div>';
        }
    }

    async function editRecord(outfitId, datetime, records) {
        const record = records.find((row) => (
            Number(row.outfit_id) === outfitId && row.datetime === datetime
        ));
        if (!record) return;

        editingRecordId = outfitId;
        editingRecordDatetime = datetime;
        existingOutfitSelect.value = String(outfitId);
        existingOutfitSelect.disabled = true;
        await chooseOutfit(outfitId);
        recordDate.value = datetime.slice(0, 10);
        recordDate.disabled = true;
        recordWeather.value = record.weather || 'Sunny';
        recordMood.value = record.mood || '';
        recordNote.value = record.note || '';
        setRating(record.rating || 0);
        saveRecordBtn.textContent = 'Update Wear Record';
        cancelEditBtn.hidden = false;
        recordForm.scrollIntoView({ behavior: 'smooth' });
    }

    async function deleteRecord(outfitId, datetime) {
        if (!confirm('Delete this wear record? The saved outfit will remain available.')) return;
        try {
            await api(`/api/records/${outfitId}`, {
                method: 'DELETE',
                body: JSON.stringify({ datetime }),
            });
            await loadHistory();
        } catch (error) {
            alert(error.message);
        }
    }

    stars.forEach((star) => {
        star.addEventListener('click', () => setRating(star.dataset.rating));
    });
    existingOutfitSelect.addEventListener('change', async () => {
        try {
            await chooseOutfit(existingOutfitSelect.value);
        } catch (error) {
            alert(error.message);
        }
    });
    [wardrobeSelect, categoryFilter].forEach((control) => control.addEventListener('change', renderItems));
    searchInput.addEventListener('input', renderItems);
    photoUpload.addEventListener('change', () => {
        uploadText.textContent = photoUpload.files?.[0]?.name || 'Upload New Outfit Photo';
    });
    cancelEditBtn.addEventListener('click', resetRecordForm);

    recordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const isEditing = editingRecordId !== null;
        const usingExistingOutfit = Boolean(selectedOutfit);

        if (!isEditing && !usingExistingOutfit) {
            if (!outfitName.value.trim()) {
                alert('Enter an outfit name.');
                return;
            }
            if (!selectedItemIds.length) {
                alert('Select at least one clothing item.');
                return;
            }
        }

        const payload = {
            datetime: isEditing ? editingRecordDatetime : recordDate.value,
            weather: recordWeather.value,
            mood: recordMood.value.trim(),
            rating,
            note: recordNote.value.trim(),
        };

        if (!isEditing && usingExistingOutfit) {
            payload.outfit_id = selectedOutfit.outfit_id;
        } else if (!isEditing) {
            payload.outfit_name = outfitName.value.trim();
            payload.outfit_note = outfitDescription.value.trim();
            payload.season = recordSeason.value;
            payload.occasion = recordOccasion.value;
            payload.item_ids = selectedItemIds;
        }

        saveRecordBtn.disabled = true;
        try {
            if (!isEditing && !usingExistingOutfit) {
                payload.image_url = await uploadPhoto();
            }
            await api(isEditing ? `/api/records/${editingRecordId}` : '/api/records', {
                method: isEditing ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            resetRecordForm();
            await Promise.all([loadHistory(), loadReferenceData()]);
        } catch (error) {
            alert(error.message);
        } finally {
            saveRecordBtn.disabled = false;
        }
    });

    recordDate.value = new Date().toISOString().split('T')[0];
    setRating(0);
    Promise.all([loadReferenceData(), loadHistory()]).catch((error) => {
        clothesGrid.innerHTML = `<div class="no-items">${escapeHtml(error.message)}</div>`;
    });
});
