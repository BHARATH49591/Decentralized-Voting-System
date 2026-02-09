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

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Logout Functionality
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('jwtTokenVoter');
        window.location.href = 'login.html';
    }
}

const navLogoutBtn = document.getElementById('navLogout');
if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', handleLogout);
}

// Update Statistics
function updateVoterStatistics() {
    // These will be populated from blockchain
    document.getElementById('voterTotalCandidates').textContent = '0';
    document.getElementById('voteStatus').textContent = 'Not Voted';
    document.getElementById('leadingCandidate').textContent = '-';
}

// Load Candidates as Cards
function loadCandidatesGrid() {
    const grid = document.getElementById('candidatesGrid');
    // This will be populated from blockchain
    // For now, showing empty state
    grid.innerHTML = '<p class="empty-state"><i class="fa-solid fa-inbox"></i> Loading candidates...</p>';
}

// Vote Confirmation Modal
let selectedCandidateId = null;

function showVoteModal(candidateId, candidateName, candidateParty, candidateImage) {
    selectedCandidateId = candidateId;

    const modal = document.getElementById('voteModal');
    document.getElementById('modalCandidateName').textContent = candidateName;
    document.getElementById('modalCandidateParty').textContent = candidateParty;
    document.getElementById('modalCandidateImage').src = candidateImage || '/assets/default-candidate.png';

    modal.style.display = 'flex';
}

function hideVoteModal() {
    document.getElementById('voteModal').style.display = 'none';
    selectedCandidateId = null;
}

// Modal event listeners
document.getElementById('modalCancel').addEventListener('click', hideVoteModal);

document.getElementById('modalConfirm').addEventListener('click', async () => {
    if (!selectedCandidateId) return;

    hideVoteModal();

    // Here you would call the blockchain vote function
    // For now, showing success message
    showToast('Success!', 'Your vote has been cast successfully', 'success');

    // Update UI
    updateVoterStatistics();
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateVoterStatistics();
    loadCandidatesGrid();

    // Check if voter is logged in
    const token = localStorage.getItem('jwtTokenVoter');
    if (!token) {
        window.location.href = 'login.html';
    }

    // Set user ID in navbar
    const userId = localStorage.getItem('voterId') || 'Voter';
    const navUserId = document.getElementById('navUserId');
    if (navUserId) {
        navUserId.textContent = userId;
    }
});
