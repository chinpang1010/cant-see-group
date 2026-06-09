document.addEventListener('DOMContentLoaded', () => {
    const outfitGrid = document.getElementById('outfitGrid');
    const modal = document.getElementById('outfitModal');
    const form = document.getElementById('outfitForm');
    const itemGrid = document.getElementById('outfitItemGrid');
    const searchInput = document.getElementById('outfitSearch');
    const seasonFilter = document.getElementById('seasonFilter');
    const occasionFilter = document.getElementById('occasionFilter');
    const itemClosetFilter = document.getElementById('itemClosetFilter');
    const itemSearch = document.getElementById('itemSearch');
    const photoUpload = document.getElementById('outfitPhotoUpload');
    const uploadText = document.getElementById('outfitUploadText');
    const logoutBtn = document.getElementById('logoutBtn');
    const canonicalSeasons = [...seasonFilter.options]
        .map((option) => option.value)
        .filter(Boolean);

    let outfits = [];
    let wardrobes = [];
    let items = [];
    let selectedItemIds = [];
    let compositionLocked = false;

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

    function values(value) {
        return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
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

    logoutBtn?.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            await api('/api/auth/logout', { method: 'POST' });
            localStorage.removeItem('what2wearUser');
            sessionStorage.removeItem('what2wearUser');
            window.location.href = '/';
        } catch (error) {
            alert(error.message);
        }
    });

    async function uploadPhoto() {
        const file = photoUpload?.files?.[0];
        if (!file) return '';

        const body = new FormData();
        body.append('image', file);
        const response = await fetch('/api/uploads', { method: 'POST', body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Photo upload failed');
        return data.image_url || '';
    }

    function fillFilter(select, rows, label) {
        const current = select.value;
        select.innerHTML = `<option value="">${label}</option>` + rows.map((row) => (
            `<option value="${escapeHtml(row)}">${escapeHtml(row)}</option>`
        )).join('');
        select.value = current;
    }

    function refreshOutfitFilters() {
        const storedSeasons = outfits.flatMap((outfit) => values(outfit.season));
        const extraSeasons = [...new Set(
            storedSeasons.filter((season) => !canonicalSeasons.includes(season))
        )].sort();
        const seasons = [...canonicalSeasons, ...extraSeasons];
        const occasions = [...new Set(outfits.flatMap((outfit) => values(outfit.occasion)))].sort();
        fillFilter(seasonFilter, seasons, 'All Seasons');
        fillFilter(occasionFilter, occasions, 'All Occasions');
    }

    function filteredOutfits() {
        const query = searchInput.value.trim().toLowerCase();
        return outfits.filter((outfit) => {
            const haystack = [
                outfit.outfit_name,
                outfit.note,
                outfit.item_names,
            ].join(' ').toLowerCase();
            const seasonMatches = !seasonFilter.value || values(outfit.season).includes(seasonFilter.value);
            const occasionMatches = !occasionFilter.value || values(outfit.occasion).includes(occasionFilter.value);
            return (!query || haystack.includes(query)) && seasonMatches && occasionMatches;
        });
    }

    function renderOutfits() {
        const rows = filteredOutfits();
        if (!rows.length) {
            outfitGrid.innerHTML = '<div class="empty-state">No outfits match these filters.</div>';
            return;
        }

        outfitGrid.innerHTML = rows.map((outfit) => {
            const seasonTags = values(outfit.season);
            const occasionTags = values(outfit.occasion);
            const itemNames = values(outfit.item_names).slice(0, 4);
            const image = firstValue(outfit.preview_image) || firstValue(outfit.image_url);
            return `
                <article class="outfit-card">
                    <div class="outfit-image">
                        ${image
                            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(outfit.outfit_name)}">`
                            : '<span>No outfit photo</span>'}
                    </div>
                    <div class="outfit-card-body">
                        <h2>${escapeHtml(outfit.outfit_name)}</h2>
                        <div class="tag-row">
                            ${seasonTags.length
                                ? seasonTags.map((season) => (
                                    `<span class="tag season-tag season-${escapeHtml(season.toLowerCase())}">${escapeHtml(season)}</span>`
                                )).join('')
                                : '<span class="tag season-tag">Any season</span>'}
                            ${occasionTags.map((occasion) => (
                                `<span class="tag">${escapeHtml(occasion)}</span>`
                            )).join('')}
                        </div>
                        <p class="outfit-note">${escapeHtml(outfit.note || 'No description yet.')}</p>
                        <div class="item-name-list">
                            ${itemNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('<span>+</span>')}
                        </div>
                        <div class="outfit-stats">
                            <div><span>Items</span><strong>${outfit.item_count || 0}</strong></div>
                            <div><span>Times worn</span><strong>${outfit.worn_count || 0}</strong></div>
                            <div><span>Created</span><strong>${escapeHtml(outfit.created_date || '-')}</strong></div>
                            <div><span>Last worn</span><strong>${escapeHtml(outfit.last_worn || 'Never')}</strong></div>
                        </div>
                        <div class="outfit-actions">
                            <a href="/record?outfit_id=${outfit.outfit_id}">Record Wear</a>
                            <button type="button" class="edit-outfit-btn" data-id="${outfit.outfit_id}">Edit</button>
                            <button type="button" class="delete-outfit-btn" data-id="${outfit.outfit_id}" data-worn="${outfit.worn_count || 0}">Delete</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        outfitGrid.querySelectorAll('.edit-outfit-btn').forEach((button) => {
            button.addEventListener('click', () => openEditModal(Number(button.dataset.id)));
        });
        outfitGrid.querySelectorAll('.delete-outfit-btn').forEach((button) => {
            button.addEventListener('click', () => deleteOutfit(
                Number(button.dataset.id),
                Number(button.dataset.worn),
            ));
        });
    }

    function renderItemPicker() {
        const query = itemSearch.value.trim().toLowerCase();
        const closetId = Number(itemClosetFilter.value || 0);
        const filtered = items.filter((item) => {
            const matchesCloset = !closetId || Number(item.c_id) === closetId;
            const haystack = [
                item.item_name,
                item.category,
                item.color,
                item.tag,
            ].join(' ').toLowerCase();
            return matchesCloset && (!query || haystack.includes(query));
        });

        document.getElementById('selectedItemCount').textContent = compositionLocked
            ? `${selectedItemIds.length} selected. Items are locked because this outfit has wear records.`
            : `${selectedItemIds.length} selected`;
        if (!filtered.length) {
            itemGrid.innerHTML = '<div class="empty-state">No clothing items found.</div>';
            return;
        }

        itemGrid.innerHTML = filtered.map((item) => {
            const selected = selectedItemIds.includes(Number(item.item_id));
            const image = firstValue(item.image_url);
            return `
                <button
                    type="button"
                    class="item-option${selected ? ' selected' : ''}${compositionLocked ? ' locked' : ''}"
                    data-id="${item.item_id}"
                    ${compositionLocked ? 'disabled' : ''}
                >
                    <div class="item-option-image">
                        ${image ? `<img src="${escapeHtml(image)}" alt="">` : ''}
                    </div>
                    <strong>${escapeHtml(item.item_name)}</strong>
                    <span>${escapeHtml(firstValue(item.category) || 'Uncategorized')}</span>
                </button>
            `;
        }).join('');

        itemGrid.querySelectorAll('.item-option').forEach((button) => {
            button.addEventListener('click', () => {
                const itemId = Number(button.dataset.id);
                selectedItemIds = selectedItemIds.includes(itemId)
                    ? selectedItemIds.filter((id) => id !== itemId)
                    : [...selectedItemIds, itemId];
                renderItemPicker();
            });
        });
    }

    function resetForm() {
        form.reset();
        document.getElementById('outfitId').value = '';
        document.getElementById('outfitModalTitle').textContent = 'Create Outfit';
        document.getElementById('saveOutfitBtn').textContent = 'Save Outfit';
        selectedItemIds = [];
        compositionLocked = false;
        uploadText.textContent = 'Upload Outfit Photo';
        renderItemPicker();
    }

    function openModal() {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    async function openEditModal(outfitId) {
        try {
            const outfit = await api(`/api/outfits/${outfitId}`);
            resetForm();
            document.getElementById('outfitId').value = outfit.outfit_id;
            document.getElementById('outfitName').value = outfit.outfit_name || '';
            document.getElementById('outfitSeason').value = firstValue(outfit.season);
            document.getElementById('outfitOccasion').value = firstValue(outfit.occasion);
            document.getElementById('outfitNote').value = outfit.note || '';
            document.getElementById('outfitImageUrl').value = firstValue(outfit.image_url);
            document.getElementById('outfitModalTitle').textContent = 'Edit Outfit';
            document.getElementById('saveOutfitBtn').textContent = 'Save Changes';
            selectedItemIds = (outfit.item_ids || []).map(Number);
            compositionLocked = Number(outfit.worn_count || 0) > 0;
            renderItemPicker();
            openModal();
        } catch (error) {
            alert(error.message);
        }
    }

    async function deleteOutfit(outfitId, wornCount) {
        const recordMessage = wornCount
            ? ` This will also delete ${wornCount} linked wear record(s).`
            : '';
        if (!confirm(`Delete this outfit?${recordMessage}`)) return;

        try {
            await api(`/api/outfits/${outfitId}`, { method: 'DELETE' });
            await loadOutfits();
        } catch (error) {
            alert(error.message);
        }
    }

    async function loadOutfits() {
        outfits = await api('/api/outfits');
        refreshOutfitFilters();
        renderOutfits();
    }

    async function loadReferences() {
        [wardrobes, items] = await Promise.all([
            api('/api/wardrobes'),
            api('/api/items'),
        ]);
        itemClosetFilter.innerHTML = '<option value="">All Wardrobes</option>' + wardrobes.map((wardrobe) => (
            `<option value="${wardrobe.c_id}">${escapeHtml(wardrobe.c_name)}</option>`
        )).join('');
        renderItemPicker();
    }

    document.getElementById('createOutfitBtn').addEventListener('click', () => {
        resetForm();
        openModal();
    });
    document.getElementById('closeOutfitModal').addEventListener('click', closeModal);
    document.getElementById('cancelOutfitBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    [searchInput, seasonFilter, occasionFilter].forEach((control) => {
        control.addEventListener(control === searchInput ? 'input' : 'change', renderOutfits);
    });
    document.getElementById('clearOutfitFilters').addEventListener('click', () => {
        searchInput.value = '';
        seasonFilter.value = '';
        occasionFilter.value = '';
        renderOutfits();
    });
    itemClosetFilter.addEventListener('change', renderItemPicker);
    itemSearch.addEventListener('input', renderItemPicker);
    photoUpload.addEventListener('change', () => {
        uploadText.textContent = photoUpload.files?.[0]?.name || 'Upload Outfit Photo';
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!selectedItemIds.length) {
            alert('Select at least one clothing item.');
            return;
        }

        const outfitId = document.getElementById('outfitId').value;
        const payload = {
            outfit_name: document.getElementById('outfitName').value.trim(),
            season: document.getElementById('outfitSeason').value,
            occasion: document.getElementById('outfitOccasion').value,
            note: document.getElementById('outfitNote').value.trim(),
            image_url: document.getElementById('outfitImageUrl').value.trim(),
            item_ids: selectedItemIds,
        };

        const saveButton = document.getElementById('saveOutfitBtn');
        saveButton.disabled = true;
        try {
            const uploadedUrl = await uploadPhoto();
            if (uploadedUrl) payload.image_url = uploadedUrl;
            await api(outfitId ? `/api/outfits/${outfitId}` : '/api/outfits', {
                method: outfitId ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            closeModal();
            await loadOutfits();
        } catch (error) {
            alert(error.message);
        } finally {
            saveButton.disabled = false;
        }
    });

    Promise.all([loadReferences(), loadOutfits()]).catch((error) => {
        outfitGrid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    });
});
