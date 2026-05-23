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

    let wardrobeCount = 1;
    const MAX_WARDROBES = 3;

    const wardrobeImages = [
        "/static/img/Wardrobe1.png", 
        "/static/img/Wardrobe2.png", 
        "/static/img/Wardrobe3.png"
    ];

    const dummyClothes = [
        { name: "White T-Shirt", type: "Top" },
        { name: "Blue Jeans", type: "Pants" },
        { name: "Black Skirt", type: "Skirt" },
        { name: "Denim Jacket", type: "Outerwear" }
    ];

    // ==========================================
    // 1. 衣櫃展開與返回功能
    // ==========================================
    if (wardrobeContainer && wardrobeLayout) {
        wardrobeContainer.addEventListener('click', (e) => {
            const clickedItem = e.target.closest('.wardrobe-item');
            if (clickedItem && !wardrobeLayout.classList.contains('opened')) {
                // 隱藏其他衣櫃
                const allItems = wardrobeContainer.querySelectorAll('.wardrobe-item');
                allItems.forEach(item => {
                    if (item !== clickedItem) item.classList.add('hidden');
                });
                
                // 切換佈局與按鈕
                wardrobeLayout.classList.add('opened');
                if (addWardrobeBtn) addWardrobeBtn.style.display = 'none';
                if (backBtn) backBtn.style.display = 'inline-flex';
                if (wardrobeTitle) wardrobeTitle.innerText = `Inside ${clickedItem.querySelector('h3').innerText}`;

                renderClothes();
                if (clothesDisplayArea) clothesDisplayArea.style.display = 'grid';
            }
        });
    }

    if (backBtn && wardrobeLayout) {
        backBtn.addEventListener('click', () => {
            if (wardrobeTitle) wardrobeTitle.innerText = 'My Wardrobes';
            backBtn.style.display = 'none';
            if (addWardrobeBtn && wardrobeCount < MAX_WARDROBES) addWardrobeBtn.style.display = 'block';
            if (clothesDisplayArea) clothesDisplayArea.style.display = 'none';
            
            // 恢復所有衣櫃顯示
            wardrobeLayout.classList.remove('opened');
            const allItems = wardrobeContainer.querySelectorAll('.wardrobe-item');
            allItems.forEach(item => item.classList.remove('hidden'));
        });
    }

    // ==========================================
    // 2. 動態渲染衣服清單
    // ==========================================
    function renderClothes() {
        if (!clothesDisplayArea) return;
        clothesDisplayArea.innerHTML = ''; 
        
        // 渲染衣服卡片
        dummyClothes.forEach(cloth => {
            const clothEl = document.createElement('div');
            clothEl.className = 'cloth-display-item';
            clothEl.innerHTML = `
                <div class="cloth-image-placeholder">${cloth.type}</div>
                <span>${cloth.name}</span>
            `;
            clothesDisplayArea.appendChild(clothEl);
        });

        // 渲染「+」新增按鈕
        const addBtnCard = document.createElement('div');
        addBtnCard.className = 'add-cloth-btn-card';
        addBtnCard.innerHTML = '<span>+</span>';
        addBtnCard.addEventListener('click', openItemModal);
        clothesDisplayArea.appendChild(addBtnCard);
    }

    // ==========================================
    // 3. 新增衣服 (Modal 與表單邏輯)
    // ==========================================
    const itemModal = document.getElementById('addItemModal');
    const addItemForm = document.getElementById('addItemForm');

    function openItemModal() { if (itemModal) itemModal.style.display = 'flex'; }
    function closeItemModal() { 
        if (itemModal) itemModal.style.display = 'none'; 
        if (addItemForm) addItemForm.reset();
        resetModalUploadUI();
    }

    if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = document.getElementById('itemName')?.value || 'New Item';
            const itemCategory = document.getElementById('itemCategory')?.value || 'Misc';
            dummyClothes.push({ name: itemName, type: itemCategory });
            renderClothes();
            closeItemModal();
        });
    }

    // 照片上傳 UI 切換
    const modalUploadPhoto = document.getElementById('modalPhotoUpload');
    const modalUploadIcon = document.getElementById('modalUploadIcon');
    const modalUploadText = document.getElementById('modalUploadText');

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
            if (wardrobeCount < MAX_WARDROBES) {
                wardrobeCount++;
                const newItem = document.createElement('div');
                newItem.className = 'wardrobe-item'; 
                newItem.innerHTML = `
                    <div class="wardrobe-image-placeholder">
                        <img src="${wardrobeImages[wardrobeCount - 1]}" alt="Wardrobe ${wardrobeCount}">
                    </div>
                    <h3>Wardrobe ${wardrobeCount}</h3>
                `;
                wardrobeContainer.appendChild(newItem);
                if (wardrobeCount === MAX_WARDROBES) addWardrobeBtn.classList.add('disabled');
            }
        });
    }

    // ==========================================
    // 5. 會員登入 / 註冊系統
    // ==========================================
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const navRight = document.querySelector('.nav-right');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // 統一處理所有的點擊事件 (打開視窗、關閉視窗、切換視窗)
    document.addEventListener('click', (e) => {
        // 打開登入
        if (e.target.closest('.login') && loginModal) loginModal.style.display = 'flex';
        
        // 關閉 Modal (點擊 X 或視窗外)
        if (e.target.closest('.close-modal') || e.target === loginModal || e.target === itemModal) {
            if (loginModal) loginModal.style.display = 'none';
            if (itemModal) closeItemModal(); // 共用剛寫好的關閉函數
        }
        if (e.target.closest('.close-signup-modal') || e.target === signupModal) {
            if (signupModal) signupModal.style.display = 'none';
        }

        // 登入/註冊互相切換
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

    // 註冊表單送出
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const signupName = document.getElementById('signupName')?.value || '';
            alert('Account created successfully! Please log in.');
            signupModal.style.display = 'none';
            loginModal.style.display = 'flex';
            const loginAccInput = document.getElementById('loginAccount');
            if (loginAccInput) loginAccInput.value = signupName; 
        });
    }

    // 登入表單送出
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const accountValue = document.getElementById('loginAccount')?.value || 'User';
            handleLoginState(accountValue);
            loginModal.style.display = 'none';
            loginForm.reset();
        });
    }

    // 登入狀態切換
    function handleLoginState(username) {
        if (!navRight) return;
        navRight.innerHTML = `
            <div class="user-profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>${username}</span>
            </div>
            <a href="#" class="logout-btn" id="logoutBtn">Log Out</a>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogoutState();
        });
    }

    // 登出狀態切換
    function handleLogoutState() {
        if (!navRight) return;
        navRight.innerHTML = `
            <span class="login">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Log In
            </span>
        `;
        alert('Logged out successfully.');
    }
});