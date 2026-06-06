document.addEventListener('DOMContentLoaded', () => {

    localStorage.removeItem('what2wearUser');
    const currentUser = JSON.parse(sessionStorage.getItem('what2wearUser') || 'null') || {
        u_id: 1,
        username: 'Guest',
        role: 'guest',
    };
    const recordUserLabel = document.getElementById('recordUserLabel');
    if (recordUserLabel) {
        recordUserLabel.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            ${currentUser.username}
        `;
    }

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

    function query(params) {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) search.set(key, value);
        });
        const text = search.toString();
        return text ? `?${text}` : '';
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

    // ==========================================
    // 1. 滿意度 Rating 
    // ==========================================
    const stars = document.querySelectorAll('.stars span');

    if (stars.length > 0) {
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                stars.forEach((s, i) => {
                    s.textContent = i <= index ? '★' : '☆';
                });
            });
        });
    }

    // ==========================================
    // 2. 衣服卡片動態載入與選擇
    // ==========================================
    const wardrobeSelect = document.getElementById('wardrobeSelect');
    const clothesGrid = document.querySelector('.clothes-grid');
    const canvasArea = document.querySelector('.canvas-area');
    const searchInput = document.getElementById('recordSearchInput');
    const categoryFilter = document.getElementById('recordCategoryFilter');
    const originalCanvasText = '<p>Click clothes left to add</p>';
    let selectedItemIds = [];
    let currentItems = [];
    let searchTimer = null;

    function createClothCard(item, selected = false) {
        const card = document.createElement('div');
        card.className = `cloth-card${selected ? ' selected' : ''}`;
        card.dataset.itemId = item.item_id;
        const imageUrl = firstValue(item.image_url);
        let cardHtml = '';

        if (imageUrl) {
            cardHtml += `
                <div style="width: 100%; height: 120px; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.item_name)}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            `;
        }

        cardHtml += `
            <div class="cloth-card-title">${escapeHtml(item.item_name)}</div>
            <div class="cloth-card-meta">${escapeHtml(firstValue(item.category) || firstValue(item.tag) || '')}</div>
            <div class="cloth-card-sub">${escapeHtml(firstValue(item.color) || '')}${item.size ? ` · ${escapeHtml(item.size)}` : ''}</div>
        `;

        card.innerHTML = cardHtml;

        card.addEventListener('click', () => {
            const itemId = Number(card.dataset.itemId);
            if (selectedItemIds.includes(itemId)) {
                selectedItemIds = selectedItemIds.filter((id) => id !== itemId);
            } else {
                selectedItemIds.push(itemId);
            }
            renderClothItems(currentItems);
            renderCanvas();
        });
        
        return card;
    }

    function renderClothItems(items) {
        if (!clothesGrid) return;
        clothesGrid.innerHTML = '';
        if (!items || items.length === 0) {
            clothesGrid.innerHTML = '<div class="no-items">No items available</div>';
            return;
        }
        items.forEach((item) => {
            clothesGrid.appendChild(createClothCard(item, selectedItemIds.includes(Number(item.item_id))));
        });
    }

    function renderCanvas() {
        if (!canvasArea) return;
        const selected = currentItems.filter((item) => selectedItemIds.includes(Number(item.item_id)));
        if (selected.length === 0) {
            canvasArea.innerHTML = originalCanvasText;
            return;
        }
        canvasArea.innerHTML = '';
        selected.forEach((item) => {
            const card = createClothCard(item, true);
            canvasArea.appendChild(card);
        });
    }

    function loadWardrobes() {
        fetch(`/api/wardrobes${query({ u_id: currentUser.u_id })}`)
            .then((response) => response.json())
            .then((wardrobes) => {
                if (!wardrobeSelect) return;
                wardrobeSelect.innerHTML = '<option value="">Select Wardrobe...</option>' + wardrobes.map((wardrobe) => (
                    `<option value="${wardrobe.c_id}">${escapeHtml(wardrobe.c_name)}</option>`
                )).join('');
                if (wardrobes.length > 0) {
                    wardrobeSelect.value = wardrobes[0].c_id;
                    loadClothItems();
                }
            })
            .catch(() => {
                if (wardrobeSelect) wardrobeSelect.innerHTML = '<option value="">Wardrobe unavailable</option>';
            });
    }

    function loadOptions() {
        fetch('/api/options')
            .then((response) => response.json())
            .then((options) => {
                if (!categoryFilter) return;
                const current = categoryFilter.value;
                categoryFilter.innerHTML = '<option value="">All</option>' + (options.categories || []).map((category) => (
                    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
                )).join('');
                categoryFilter.value = current;
            })
            .catch(() => {});
    }

    function loadClothItems() {
        if (!clothesGrid) return;
        const closetId = wardrobeSelect?.value || '';
        if (!closetId) {
            clothesGrid.innerHTML = '<div class="no-items">Please select a wardrobe.</div>';
            return;
        }
        fetch(`/api/closet/${closetId}/items${query({
            search: searchInput?.value.trim() || '',
            category: categoryFilter?.value || '',
        })}`)
            .then((response) => response.json())
            .then((items) => {
                currentItems = items || [];
                selectedItemIds = selectedItemIds.filter((id) => currentItems.some((item) => Number(item.item_id) === id));
                renderClothItems(currentItems);
                renderCanvas();
            })
            .catch(() => {
                clothesGrid.innerHTML = '<div class="no-items">無法讀取衣物，請稍後再試。</div>';
            });
    }

    loadWardrobes();
    loadOptions();
    loadHistory();

    wardrobeSelect?.addEventListener('change', () => {
        selectedItemIds = [];
        loadClothItems();
    });

    [searchInput, categoryFilter].forEach((control) => {
        control?.addEventListener(control === searchInput ? 'input' : 'change', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(loadClothItems, 180);
        });
    });

    // ==========================================
    // 3. 上傳圖片打勾的動畫
    // ==========================================
    const photoUpload = document.getElementById('photoUpload');
    const uploadIconWrapper = document.getElementById('uploadIconWrapper');
    const uploadText = document.getElementById('uploadText');

    if (photoUpload && uploadIconWrapper && uploadText) {
        photoUpload.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                uploadIconWrapper.innerHTML = `
                    <svg class="success-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                `;
                uploadText.innerText = 'Uploaded!';
                uploadText.classList.add('success-text');
            }
        });
    }

    // ==========================================
    // 4. 儲存按鈕
    // ==========================================
    const recordForm = document.getElementById('recordForm');
    const recordDate = document.getElementById('recordDate');
    const outfitName = document.getElementById('outfitName');
    const recordSeason = document.getElementById('recordSeason');
    const recordWeather = document.getElementById('recordWeather');
    const recordOccasion = document.getElementById('recordOccasion');
    const recordMood = document.getElementById('recordMood');
    const recordNote = document.getElementById('recordNote');

    if (recordDate) recordDate.value = new Date().toISOString().split('T')[0];

    function getRecordRating() {
        let rating = 0;
        stars.forEach((star, index) => {
            if (star.textContent === '★') {
                rating = index + 1;
            }
        });
        return rating;
    }

    if (recordForm) {
        recordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (selectedItemIds.length === 0) {
                alert('Please select at least one clothing item.');
                return;
            }

            const payload = {
                u_id: currentUser.u_id,
                datetime: recordDate?.value || new Date().toISOString().split('T')[0],
                weather: recordWeather?.value || '',
                mood: recordMood?.value || '',
                rating: getRecordRating(),
                note: recordNote?.value || '',
                outfit_name: outfitName?.value || 'Outfit Record',
                season: recordSeason?.value || '',
                occasion: recordOccasion?.value || '',
                item_ids: selectedItemIds,
            };

            api('/api/records', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
                .then(() => {
                    alert('Outfit Record Saved Successfully!');
                    if (recordNote) recordNote.value = '';
                    if (outfitName) outfitName.value = '';
                    if (recordMood) recordMood.value = '';
                    if (recordDate) recordDate.value = new Date().toISOString().split('T')[0];
                    stars.forEach((star) => { star.textContent = '☆'; });
                    selectedItemIds = [];
                    if (canvasArea) canvasArea.innerHTML = originalCanvasText;
                    loadClothItems();
                    loadHistory();
                })
                .catch(() => {
                    alert('保存失敗，請稍後再試。');
                });
        });
    }

    function loadHistory() {
        fetch(`/api/reports${query({ u_id: currentUser.u_id })}`)
            .then((response) => response.json())
            .then((report) => {
                const history = document.getElementById('recordHistory');
                if (!history) return;
                const rows = report.recent_records || [];
                if (rows.length === 0) {
                    history.innerHTML = '<div class="history-row"><span>No records yet.</span></div>';
                    return;
                }
                history.innerHTML = rows.map((row) => `
                    <div class="history-row">
                        <strong>${escapeHtml(row.outfit_name)}</strong>
                        <span>${escapeHtml(row.datetime)} · ${escapeHtml(row.weather || 'N/A')} · ${escapeHtml(row.rating || '-')} stars</span>
                    </div>
                `).join('');
            })
            .catch(() => {});
    }
});
