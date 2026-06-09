document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 變數初始化
    // ==========================================
    const wardrobeContainer = document.getElementById('wardrobeContainer');
    const addWardrobeBtn = document.getElementById('addWardrobeBtn');
    const wardrobeLayout = document.getElementById('wardrobeLayout');
    const clothesDisplayArea = document.getElementById('clothesDisplayArea');
    const backBtn = document.getElementById('backBtn');
    const wardrobeTitle = document.getElementById('wardrobeTitle');
    const catalogTools = document.getElementById('catalogTools');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const colorFilter = document.getElementById('colorFilter');
    const tagFilter = document.getElementById('tagFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const itemModal = document.getElementById('addItemModal');
    const addItemForm = document.getElementById('addItemForm');
    const itemModalTitle = document.getElementById('itemModalTitle');
    const itemSubmitBtn = document.getElementById('itemSubmitBtn');
    const modalUploadPhoto = document.getElementById('modalPhotoUpload');
    const modalUploadIcon = document.getElementById('modalUploadIcon');
    const modalUploadText = document.getElementById('modalUploadText');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const navRight = document.querySelector('.nav-right');
    const heroRecordBtn = document.getElementById('heroRecordBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    localStorage.removeItem('what2wearUser');
    const storedUser = JSON.parse(sessionStorage.getItem('what2wearUser') || 'null');
    let currentUser = storedUser || {
        u_id: 1,
        username: 'Guest',
        role: 'guest',
    };
    let wardrobeCount = 1;
    const MAX_WARDROBES = 3;
    let wardrobes = [];
    let clothesData = [];
    let currentClosetId = null;
    let searchTimer = null;

    const wardrobeImages = [
        "/static/img/Wardrobe1.png", 
        "/static/img/Wardrobe2.png", 
        "/static/img/Wardrobe3.png"
    ];

    const dummyClothes = [
        { item_name: "White T-Shirt", category: "Top", color: "White", tag: "basic" },
        { item_name: "Blue Jeans", category: "Bottom", color: "Blue", tag: "casual" },
        { item_name: "Black Skirt", category: "Bottom", color: "Black", tag: "work" },
        { item_name: "Denim Jacket", category: "Outerwear", color: "Blue", tag: "casual" }
    ];

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

    function canOpenAdmin(user) {
        return ['admin', 'manager'].includes(user?.role);
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

    function loadWardrobes() {
        fetch(`/api/wardrobes${query({ u_id: currentUser.u_id })}`)
            .then((res) => {
                if (!res.ok) throw new Error('Wardrobes unavailable');
                return res.json();
            })
            .then((data) => {
                wardrobes = data;
                wardrobeCount = Math.min(data.length, MAX_WARDROBES);
                if (!currentClosetId && data.length > 0) currentClosetId = data[0].c_id;
                renderWardrobes();
                if (currentClosetId) selectCloset(currentClosetId);
                loadReports();
            })
            .catch(() => {
                wardrobes = [];
                wardrobeCount = 0;
                currentClosetId = null;
                renderWardrobes();
            });
    }

    function currentFilters() {
        return {
            search: searchInput?.value.trim() || '',
            category: categoryFilter?.value || '',
            color: colorFilter?.value || '',
            tag: tagFilter?.value || '',
        };
    }

    function loadClosetItems(closetId) {
        currentClosetId = closetId;
        fetch(`/api/closet/${closetId}/items${query(currentFilters())}`)
            .then((res) => {
                if (!res.ok) throw new Error('Clothing items unavailable');
                return res.json();
            })
            .then((data) => {
                clothesData = data;
                if (wardrobeLayout.classList.contains('opened')) {
                    renderClothes();
                }
            })
            .catch(() => {
                clothesData = dummyClothes;
                renderClothes();
            });
    }

    function loadOptions() {
        fetch('/api/options')
            .then((res) => res.json())
            .then((options) => {
                fillSelect(categoryFilter, options.categories || [], 'All Categories');
                fillSelect(colorFilter, options.colors || [], 'All Colors');
                fillSelect(tagFilter, options.tags || [], 'All Tags');
            })
            .catch(() => {});
    }

    function fillSelect(select, options, label) {
        if (!select) return;
        const current = select.value;
        select.innerHTML = `<option value="">${label}</option>` + options.map((option) => (
            `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
        )).join('');
        select.value = current;
    }

    function renderWardrobes() {
        if (!wardrobeContainer) return;
        wardrobeContainer.innerHTML = '';
        const items = wardrobes.length > 0 ? wardrobes.slice(0, MAX_WARDROBES) : [
            { c_id: 1, c_name: 'Wardrobe 1' }
        ];
        items.forEach((wardrobe, index) => {
            const newItem = document.createElement('div');
            newItem.className = 'wardrobe-item';
            newItem.dataset.id = wardrobe.c_id;
            newItem.innerHTML = `
                <div class="wardrobe-image-placeholder">
                    <img src="${wardrobeImages[index] || wardrobeImages[0]}" alt="Wardrobe ${index + 1}">
                </div>
                <h3>${escapeHtml(wardrobe.c_name)}</h3>
                <div class="wardrobe-count">Click to open</div>
            `;
            wardrobeContainer.appendChild(newItem);
        });
        if (addWardrobeBtn) addWardrobeBtn.classList.toggle('disabled', items.length >= MAX_WARDROBES);
    }

    function selectCloset(closetId) {
        currentClosetId = closetId;
        loadClosetItems(closetId);
    }

    loadOptions();
    loadWardrobes();
    updateLoginUI();

    // ==========================================
    // 1. 衣櫃展開與返回功能
    // ==========================================
    if (wardrobeContainer && wardrobeLayout) {
        wardrobeContainer.addEventListener('click', (e) => {
            const clickedItem = e.target.closest('.wardrobe-item');
            if (clickedItem && !wardrobeLayout.classList.contains('opened')) {
                const allItems = wardrobeContainer.querySelectorAll('.wardrobe-item');
                allItems.forEach(item => {
                    if (item !== clickedItem) item.classList.add('hidden');
                });
                
                wardrobeLayout.classList.add('opened');
                if (addWardrobeBtn) addWardrobeBtn.style.display = 'none';
                if (backBtn) backBtn.style.display = 'inline-flex';
                if (catalogTools) catalogTools.style.display = 'grid';
                if (wardrobeTitle) wardrobeTitle.innerText = `Inside ${clickedItem.querySelector('h3').innerText}`;
                const openedLabel = clickedItem.querySelector('.wardrobe-count');
                if (openedLabel) openedLabel.style.display = 'none';

                const closetId = Number(clickedItem.dataset.id) || 1;
                selectCloset(closetId);
                if (clothesDisplayArea) clothesDisplayArea.style.display = 'grid';
            }
        });
    }

    if (backBtn && wardrobeLayout) {
        backBtn.addEventListener('click', () => {
            if (wardrobeTitle) wardrobeTitle.innerText = 'My Wardrobes';
            backBtn.style.display = 'none';
            if (addWardrobeBtn && wardrobeCount < MAX_WARDROBES) addWardrobeBtn.style.display = 'block';
            if (catalogTools) catalogTools.style.display = 'none';
            if (clothesDisplayArea) clothesDisplayArea.style.display = 'none';
            
            wardrobeLayout.classList.remove('opened');
            const allItems = wardrobeContainer.querySelectorAll('.wardrobe-item');
            allItems.forEach(item => {
                item.classList.remove('hidden');
                const countLabel = item.querySelector('.wardrobe-count');
                if (countLabel) countLabel.style.display = 'block';
            });
        });
    }

    [searchInput, categoryFilter, colorFilter, tagFilter].forEach((control) => {
        control?.addEventListener(control === searchInput ? 'input' : 'change', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                if (currentClosetId) loadClosetItems(currentClosetId);
            }, 180);
        });
    });

    clearFiltersBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (colorFilter) colorFilter.value = '';
        if (tagFilter) tagFilter.value = '';
        if (currentClosetId) loadClosetItems(currentClosetId);
    });

    // ==========================================
    // 2. 動態渲染衣服清單
    // ==========================================
    function renderClothes() {
        if (!clothesDisplayArea) return;
        clothesDisplayArea.innerHTML = ''; 
        
        const items = clothesData.length > 0 ? clothesData : [];

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-message';
            empty.textContent = 'No matching clothing item. Add one below.';
            clothesDisplayArea.appendChild(empty);
        }

        items.forEach(cloth => {
            const type = firstValue(cloth.category) || firstValue(cloth.tag) || 'Item';
            const imageUrl = firstValue(cloth.image_url);
            const clothEl = document.createElement('div');
            clothEl.className = 'cloth-display-item';
            clothEl.dataset.itemId = cloth.item_id || '';
            clothEl.innerHTML = `
                <div class="cloth-image-placeholder">
                    ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(cloth.item_name)}">` : escapeHtml(type)}
                </div>
                <span>${escapeHtml(cloth.item_name)}</span>
                <div class="cloth-detail">
                    ${escapeHtml(firstValue(cloth.color) || 'No color')} · ${escapeHtml(cloth.size || 'No size')}<br>
                    Last worn: ${escapeHtml(cloth.last_worn || 'Not recorded')}
                </div>
                <div class="cloth-actions">
                    <button type="button" class="edit-item-btn">Edit</button>
                    <button type="button" class="delete-item-btn">Delete</button>
                </div>
            `;
            clothEl.querySelector('.edit-item-btn')?.addEventListener('click', () => openItemModal(cloth));
            clothEl.querySelector('.delete-item-btn')?.addEventListener('click', () => deleteItem(cloth.item_id));
            clothesDisplayArea.appendChild(clothEl);
        });

        const addBtnCard = document.createElement('div');
        addBtnCard.className = 'add-cloth-btn-card';
        addBtnCard.innerHTML = '<span>+</span>';
        addBtnCard.addEventListener('click', () => openItemModal());
        clothesDisplayArea.appendChild(addBtnCard);
    }

    // ==========================================
    // 3. 新增 / 編輯 / 刪除衣服
    // ==========================================
    function openItemModal(item = null) {
        if (!itemModal) return;
        if (addItemForm) addItemForm.reset();
        document.getElementById('itemId').value = item?.item_id || '';
        document.getElementById('itemName').value = item?.item_name || '';
        document.getElementById('itemCategory').value = firstValue(item?.category);
        document.getElementById('itemSize').value = item?.size || '';
        document.getElementById('itemColor').value = firstValue(item?.color);
        document.getElementById('itemTag').value = firstValue(item?.tag);
        document.getElementById('itemLastWorn').value = item?.last_worn || '';
        document.getElementById('itemImageUrl').value = firstValue(item?.image_url);
        if (itemModalTitle) itemModalTitle.innerText = item ? 'Edit Item' : 'Add New Item';
        if (itemSubmitBtn) itemSubmitBtn.innerText = item ? 'Save Changes' : 'Add to Closet';
        resetModalUploadUI();
        itemModal.style.display = 'flex';
    }

    function closeItemModal() { 
        if (itemModal) itemModal.style.display = 'none'; 
        if (addItemForm) addItemForm.reset();
        resetModalUploadUI();
    }

    async function uploadSelectedPhoto() {
        if (!modalUploadPhoto?.files?.[0]) {
            return '';
        }

        const formData = new FormData();
        formData.append('image', modalUploadPhoto.files[0]);

        const response = await fetch('/api/uploads', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Photo upload failed');
        }
        return result.image_url || '';
    }

    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const itemId = document.getElementById('itemId')?.value || '';
            const payload = {
                item_name: document.getElementById('itemName')?.value || 'New Item',
                size: document.getElementById('itemSize')?.value || '',
                color: document.getElementById('itemColor')?.value || '',
                category: document.getElementById('itemCategory')?.value || '',
                tag: document.getElementById('itemTag')?.value || '',
                last_worn: document.getElementById('itemLastWorn')?.value || '',
                image_url: document.getElementById('itemImageUrl')?.value || '',
                c_id: currentClosetId || 1,
            };

            try {
                const uploadedUrl = await uploadSelectedPhoto();
                if (uploadedUrl) {
                    payload.image_url = uploadedUrl;
                    const imageInput = document.getElementById('itemImageUrl');
                    if (imageInput) imageInput.value = uploadedUrl;
                }

                const response = await fetch(itemId ? `/api/items/${itemId}` : '/api/items', {
                    method: itemId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.error || 'Item save failed');

                loadOptions();
                loadClosetItems(currentClosetId || 1);
                loadReports();
                closeItemModal();
            } catch (error) {
                alert(error.message);
            }
            return;

            fetch(itemId ? `/api/items/${itemId}` : '/api/items', {
                method: itemId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                    if (!response.ok) throw new Error('衣物儲存失敗');
                    return response.json();
                })
                .then(() => {
                    loadOptions();
                    loadClosetItems(currentClosetId || 1);
                    loadReports();
                    closeItemModal();
                })
                .catch((error) => {
                    alert(error.message);
                });
        });
    }

    function deleteItem(itemId) {
        if (!itemId || !confirm('Delete this item?')) return;
        fetch(`/api/items/${itemId}`, { method: 'DELETE' })
            .then((response) => {
                if (!response.ok) throw new Error('刪除衣物失敗');
                loadOptions();
                loadClosetItems(currentClosetId || 1);
                loadReports();
            })
            .catch((error) => alert(error.message));
    }

    // 照片上傳 UI 切換
    if (modalUploadPhoto && modalUploadIcon && modalUploadText) {
        modalUploadPhoto.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                modalUploadIcon.innerHTML = `<svg class="success-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                modalUploadText.innerText = 'Uploaded!';
                modalUploadText.classList.add('success-text');
            }
        });
    }

    function resetModalUploadUI() {
        if (modalUploadIcon && modalUploadText && modalUploadPhoto) {
            modalUploadIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`;
            modalUploadText.innerText = 'Upload Photo';
            modalUploadText.classList.remove('success-text');
            modalUploadPhoto.value = '';
        }
    }

    // ==========================================
    // 4. 主頁新增衣櫃按鈕
    // ==========================================
    if (addWardrobeBtn && wardrobeContainer) {
        addWardrobeBtn.addEventListener('click', () => {
            if (wardrobeCount >= MAX_WARDROBES) return;
            const name = prompt('Wardrobe name', `Wardrobe ${wardrobeCount + 1}`);
            if (!name) return;
            api('/api/wardrobes', {
                method: 'POST',
                body: JSON.stringify({ c_name: name.trim(), u_id: currentUser.u_id }),
            })
                .then((result) => {
                    currentClosetId = result.closet.c_id;
                    loadWardrobes();
                })
                .catch((error) => alert(error.message));
        });
    }

    // ==========================================
    // 5. 會員登入 / 註冊系統
    // ==========================================
    document.addEventListener('click', (e) => {
        if (e.target.closest('#logoutBtn')) {
            e.preventDefault();
            api('/api/auth/logout', { method: 'POST' }).then(() => {
                handleLogoutState();
                window.location.reload();
            });
            return;
        }

        if ((e.target.closest('.login') || e.target.closest('#heroRecordBtn')) && loginModal) {
            e.preventDefault();
            loginModal.style.display = 'flex';
        }
        
        if (e.target.closest('.close-modal') || e.target === loginModal || e.target === itemModal) {
            if (loginModal) loginModal.style.display = 'none';
            if (itemModal) closeItemModal();
        }
        if (e.target.closest('.close-signup-modal') || e.target === signupModal) {
            if (signupModal) signupModal.style.display = 'none';
        }

        if (e.target.closest('#toSignupLink')) {
            e.preventDefault();
            if (loginModal) loginModal.style.display = 'none';
            if (signupModal) signupModal.style.display = 'flex';
        }
        if (e.target.closest('#toLoginLink')) {
            e.preventDefault();
            if (signupModal) signupModal.style.display = 'none';
            if (loginModal) loginModal.style.display = 'flex';
        }
    });

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('signupEmail')?.value || document.getElementById('signupName')?.value || '';
            api('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password: document.getElementById('signupPassword')?.value || '',
                    gender: document.getElementById('signupGender')?.value || '',
                    role: 'user',
                }),
            })
                .then((result) => {
                    currentUser = result.user;
                    sessionStorage.setItem('what2wearUser', JSON.stringify(currentUser));
                    handleLoginState(currentUser.username);
                    if (signupModal) signupModal.style.display = 'none';
                    currentClosetId = null;
                    loadWardrobes();
                })
                .catch((error) => alert(error.message));
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: document.getElementById('loginAccount')?.value || '',
                    password: document.getElementById('loginPassword')?.value || '',
                }),
            })
                .then((result) => {
                    currentUser = result.user;
                    sessionStorage.setItem('what2wearUser', JSON.stringify(currentUser));
                    handleLoginState(currentUser.username);
                    if (loginModal) loginModal.style.display = 'none';
                    currentClosetId = null;
                    loadWardrobes();
                    loadReports();
                })
                .catch((error) => alert(error.message));
        });
    }

    function updateLoginUI() {
        if (storedUser?.username && navRight) {
            handleLoginState(storedUser.username);
            const wardrobeSection = document.getElementById('wardrobeSection');
            const reportsSection = document.getElementById('reportsSection');
            if (wardrobeSection) wardrobeSection.style.display = 'block';
            if (reportsSection) reportsSection.style.display = 'block';
            handleLoginState(storedUser.username);
        }
    }

    function handleLoginState(username) {
        if (!navRight) return;
        const adminLink = canOpenAdmin(currentUser) ? '<a href="/admin" class="nav-link">Admin</a>' : '';
        navRight.innerHTML = `
            <a href="/" class="nav-link active" aria-current="page">Home</a>
            <a href="/outfits" class="nav-link">Outfits</a>
            <a href="/record" class="nav-link">Record</a>
            ${adminLink}
            <div class="user-profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>${escapeHtml(username)}</span>
            </div>
            <a href="#" class="logout-btn" id="logoutBtn">Log Out</a>
        `;
        // Show wardrobe and reports sections after login
        const wardrobeSection = document.getElementById('wardrobeSection');
        const reportsSection = document.getElementById('reportsSection');
        if (wardrobeSection) wardrobeSection.style.display = 'block';
        if (reportsSection) reportsSection.style.display = 'block';
        if (heroRecordBtn) heroRecordBtn.style.display = 'none';
    }

    function handleLogoutState() {
        currentUser = { u_id: 1, username: 'Guest', role: 'guest' };
        localStorage.removeItem('what2wearUser');
        sessionStorage.removeItem('what2wearUser');
        if (!navRight) return;
        navRight.innerHTML = `
            <a href="/" class="nav-link active" aria-current="page">Home</a>
            <button type="button" class="login nav-login-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Log In
            </button>
        `;
        // Hide wardrobe and reports sections after logout
        const wardrobeSection = document.getElementById('wardrobeSection');
        const reportsSection = document.getElementById('reportsSection');
        if (wardrobeSection) wardrobeSection.style.display = 'none';
        if (reportsSection) reportsSection.style.display = 'none';
        if (heroRecordBtn) heroRecordBtn.style.display = 'inline-block';
        currentClosetId = null;
        loadWardrobes();
        loadReports();
    }

    // ==========================================
    // 6. 報表資料
    // ==========================================
    function loadReports() {
        fetch(`/api/reports${query({ u_id: currentUser.u_id })}`)
            .then((res) => res.json())
            .then((report) => {
                document.getElementById('statClosets').innerText = report.totals?.closet_count || 0;
                document.getElementById('statItems').innerText = report.totals?.item_count || 0;
                document.getElementById('statOutfits').innerText = report.totals?.outfit_count || 0;
                document.getElementById('statRecords').innerText = report.totals?.record_count || 0;
                renderReportList('categoryReport', report.category_counts || [], 'category', 'item_count', 'items');
                renderReportList('mostWornReport', report.most_worn || [], 'item_name', 'wear_count', 'wears');
                renderReportList('leastWornReport', report.least_worn || [], 'item_name', 'wear_count', 'wears');
            })
            .catch(() => {});
    }

    function renderReportList(id, rows, labelKey, valueKey, suffix) {
        const target = document.getElementById(id);
        if (!target) return;
        if (!rows.length) {
            target.innerHTML = '<div class="report-row"><span>No data</span><span>-</span></div>';
            return;
        }
        target.innerHTML = rows.map((row) => `
            <div class="report-row">
                <strong>${escapeHtml(row[labelKey] || 'Untitled')}</strong>
                <span>${escapeHtml(row[valueKey] ?? 0)} ${suffix}</span>
            </div>
        `).join('');
    }
});
