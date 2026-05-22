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
    // 2. 點擊衣服加入 Outfit Canvas (直接搬移版)
    // ==========================================
    const clothesCards = document.querySelectorAll('.cloth-card');
    const canvasArea = document.querySelector('.canvas-area');
    const clothesGrid = document.querySelector('.clothes-grid'); 
    const originalCanvasText = '<p>Click clothes left to add</p>';

    if (canvasArea && clothesGrid && clothesCards.length > 0) {
        
        // 幫每件衣服綁定一次點擊事件
        clothesCards.forEach((card) => {
            card.addEventListener('click', () => {
                
                // 判斷這件衣服現在在哪裡？
                if (card.parentElement === clothesGrid) {
                    // 從中間搬到右邊畫布
                    
                    // 移除「點擊加入」的提示文字
                    const placeholder = canvasArea.querySelector('p');
                    if (placeholder) placeholder.remove();

                    // appendChild，衣服就會從中間消失，跑到右邊去
                    canvasArea.appendChild(card);
                    
                    // 縮小尺寸以適應右邊畫布
                    card.style.width = '100px';
                    card.style.height = '120px';
                    
                } else if (card.parentElement === canvasArea) {
                    //從右邊畫布退回中間衣櫃
                    
                    // 把它搬回中間
                    clothesGrid.appendChild(card);
                    
                    // 清除剛剛加上的尺寸，讓它恢復原本在 CSS 設定的大小
                    card.style.width = '';
                    card.style.height = '';

                    // 檢查畫布是不是沒有衣服 如果是 把提示文字加回來
                    if (canvasArea.querySelectorAll('.cloth-card').length === 0) {
                        canvasArea.innerHTML = originalCanvasText;
                    }
                }
            });
        });
    }
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
                // 檔案選擇後，將原本的圖示替換為打勾 SVG
                uploadIconWrapper.innerHTML = `
                    <svg class="success-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                `;
                // 更改文字並套用新顏色 class
                uploadText.innerText = 'Uploaded!';
                uploadText.classList.add('success-text');
            }
        });
    }

    // ==========================================
    // 4. 儲存按鈕
    // ==========================================
    const saveBtn = document.querySelector('.save-btn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 防止如果按鈕在表單內，預設送出會導致畫面重整
            alert('Outfit Record Saved Successfully!');
        });
    }
});