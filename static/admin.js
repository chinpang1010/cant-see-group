document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', async (event) => {
        event.preventDefault();
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            sessionStorage.removeItem('what2wearUser');
            window.location.href = '/';
        }
    });
});
