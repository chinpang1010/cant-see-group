document.addEventListener('DOMContentLoaded', () => {

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
    const clothesGrid = document.querySelector('.clothes-grid');
    const canvasArea = document.querySelector('.canvas-area');
    const originalCanvasText = '<p>Click clothes left to add</p>';
    let selectedItemIds = [];

    function createClothCard(item) {
        const card = document.createElement('div');
        card.className = 'cloth-card';
        card.dataset.itemId = item.item_id;
        card.innerHTML = `
            <div class="cloth-card-title">${item.item_name}</div>
            <div class="cloth-card-meta">${item.category || item.tag || ''}</div>
        `;
        card.addEventListener('click', () => {
            const itemId = Number(card.dataset.itemId);
            if (card.parentElement === clothesGrid) {
                const placeholder = canvasArea.querySelector('p');
                if (placeholder) placeholder.remove();
                canvasArea.appendChild(card);
                card.style.width = '100px';
                card.style.height = '120px';
                if (!selectedItemIds.includes(itemId)) {
                    selectedItemIds.push(itemId);
                }
            } else if (card.parentElement === canvasArea) {
                clothesGrid.appendChild(card);
                card.style.width = '';
                card.style.height = '';
                selectedItemIds = selectedItemIds.filter((id) => id !== itemId);
                if (canvasArea.querySelectorAll('.cloth-card').length === 0) {
                    canvasArea.innerHTML = originalCanvasText;
                }
            }
        });
        return card;
    }

    function loadClothItems() {
        if (!clothesGrid) return;
        fetch('/api/items')
            .then((response) => response.json())
            .then((items) => {
                clothesGrid.innerHTML = '';
                if (!items || items.length === 0) {
                    clothesGrid.innerHTML = '<div class="no-items">No items available</div>';
                    return;
                }
                items.forEach((item) => {
                    clothesGrid.appendChild(createClothCard(item));
                });
            })
            .catch(() => {
                clothesGrid.innerHTML = '<div class="no-items">無法讀取衣物，請稍後再試。</div>';
            });
    }

    loadClothItems();

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
    const saveBtn = document.querySelector('.save-btn');
    const recordDate = document.getElementById('recordDate');
    const recordSeason = document.getElementById('recordSeason');
    const recordWeather = document.getElementById('recordWeather');
    const recordOccasion = document.getElementById('recordOccasion');
    const recordNote = document.getElementById('recordNote');

    function getRecordRating() {
        let rating = 0;
        stars.forEach((star, index) => {
            if (star.textContent === '★') {
                rating = index + 1;
            }
        });
        return rating;
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const payload = {
                datetime: recordDate?.value || new Date().toISOString().split('T')[0],
                weather: recordWeather?.value || '',
                mood: '',
                rating: getRecordRating(),
                note: recordNote?.value || '',
                outfit_name: 'Outfit Record',
                season: recordSeason?.value || '',
                occasion: recordOccasion?.value || '',
                item_ids: selectedItemIds,
            };

            fetch('/api/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                    if (!response.ok) throw new Error('保存失敗');
                    return response.json();
                })
                .then(() => {
                    alert('Outfit Record Saved Successfully!');
                    if (recordNote) recordNote.value = '';
                    if (recordDate) recordDate.value = '';
                    selectedItemIds = [];
                    if (canvasArea) canvasArea.innerHTML = originalCanvasText;
                    loadClothItems();
                })
                .catch(() => {
                    alert('保存失敗，請稍後再試。');
                });
        });
    }
});
