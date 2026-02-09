// Toast Notification System
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' :
            'fa-info-circle';

    toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Logout Functionality
document.getElementById('navLogout').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('jwtTokenAdmin');
        localStorage.removeItem('jwtTokenVoter');
        window.location.replace('login.html');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if admin is logged in
    const token = localStorage.getItem('jwtTokenAdmin');
    if (!token) {
        window.location.href = 'login.html';
    }
});

// Admin Candidate Search filtering
window.filterAdminCandidates = function () {
    const query = document.getElementById('adminCandidateSearch').value.toLowerCase();
    const items = document.querySelectorAll('.candidate-item');

    items.forEach(item => {
        const name = item.querySelector('.candidate-name').textContent.toLowerCase();
        const party = item.querySelector('.candidate-party').textContent.toLowerCase();

        if (name.includes(query) || party.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Helper for button loading states
window.setButtonLoading = function(id, loading, text) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
        if (text) btn.querySelector('.btn-text').textContent = text;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
};

// Notification System Handler
const notifyBtn = document.getElementById('notifyVoters');
if (notifyBtn) {
    notifyBtn.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to send notifications to voters?")) {
            return;
        }

        setButtonLoading('notifyVoters', true, 'Processing...');

        try {
            const response = await fetch(`${App.pythonApiUrl}/admin/notify-voters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('jwtTokenAdmin')
                }
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Success!', data.message || 'Emails sent successfully', 'success');
            } else {
                throw new Error(data.detail || data.message || 'Failed to trigger notifications');
            }

        } catch (error) {
            console.error("Notification Error:", error);
            showToast('Error', error.message || 'Failed to connect to notification server', 'error');
        } finally {
            setButtonLoading('notifyVoters', false);
        }
    });
}
