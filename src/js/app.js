const Web3 = require("web3");
const contract = require("@truffle/contract");
const votingArtifacts = require("../../build/contracts/Voting.json");

const VotingContract = contract(votingArtifacts);

// Global Toast System (fallback if not in voter.js/admin.js)
window.showToast = window.showToast || function (title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    alert(`${title}: ${message}`);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><div class="toast-content"><div class="toast-title">${title}</div>${message ? `<div class="toast-message">${message}</div>` : ''}</div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 4000);
};

window.App = {
  account: null,
  instance: null,
  selectedCandidateId: null,
  pythonApiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                 ? 'http://127.0.0.1:8000' 
                 : 'https://voter-backend-render-url.onrender.com', // TODO: User must update this after Render deployment
  resultsChart: null,

  eventStart: async function () {
    try {
      if (!window.ethereum) {
        showToast("Error", "MetaMask not detected", "error");
        return;
      }

      window.web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      App.account = accounts[0];

      // Update UI with account
      const accountEl = document.getElementById("accountAddress");
      if (accountEl) accountEl.innerHTML = `<i class="fa-solid fa-wallet"></i> ${App.account.substring(0, 6)}...${App.account.substring(38)}`;

      const navUserEl = document.getElementById("navUserId");
      if (navUserEl) navUserEl.textContent = App.account.substring(0, 8);

      VotingContract.setProvider(window.ethereum);
      VotingContract.defaults({ from: App.account, gas: 6700000 });

      const networkId = await web3.eth.net.getId();
      const deployedNetwork = votingArtifacts.networks[networkId];

      if (!deployedNetwork) {
        showToast("Error", "Contract not deployed on this network", "error");
        return;
      }

      App.instance = await VotingContract.deployed();
      
      await App.initializeHandlers(); // Keep initializeHandlers as it contains other handlers
      await App.loadData();

      window.ethereum.on("accountsChanged", () => location.reload());
    } catch (err) {
      console.error(err);
      showToast("Error", "System initialization failed", "error");
    }
  },

  initializeHandlers: async function () {
    // Admin: Create Election Handler (REMOVED)

    // Admin: Election Switcher (REMOVED)

    // Admin: Party Image Preview Logic
    const partyImageInput = document.getElementById('partyImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeImageBtn = document.getElementById('removeImage');
    const fileNameSpan = document.getElementById('fileName');

    if (partyImageInput) {
      partyImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            showToast('Error', 'Image size should be less than 5MB', 'error');
            return;
          }
          const reader = new FileReader();
          reader.onload = async (event) => {
            const rawImg = event.target.result;
            showToast('Processing', 'Optimizing image for blockchain...', 'info');

            try {
              window.selectedImage = await App.compressImage(rawImg, 200, 200);
              if (previewImg) previewImg.src = window.selectedImage;
              if (imagePreview) imagePreview.style.display = 'block';
              if (fileNameSpan) fileNameSpan.textContent = file.name + ' (Optimized)';
              showToast('Ready', 'Image optimized successfully', 'success');
            } catch (err) {
              console.error(err);
              window.selectedImage = rawImg;
              if (previewImg) previewImg.src = rawImg;
              showToast('Warning', 'Could not optimize image, gas costs may be high', 'info');
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => {
        window.selectedImage = null;
        if (partyImageInput) partyImageInput.value = '';
        if (imagePreview) imagePreview.style.display = 'none';
        if (fileNameSpan) fileNameSpan.textContent = 'Choose party logo image';
      });
    }

    // Admin: Add Candidate
    const addCandidateBtn = document.getElementById("addCandidate");
    if (addCandidateBtn) {
      addCandidateBtn.onclick = async () => {
        const name = document.getElementById("name").value.trim();
        const party = document.getElementById("party").value.trim();
        const desc = document.getElementById("partyDescription")?.value.trim() || "";
        const img = window.selectedImage || ""; 

        if (!name || !party) {
          showToast("Validation Error", "Name and Party are required", "error");
          return;
        }

        App.setBtnLoading("addCandidate", true, "Adding...");
        try {
          await App.instance.addCandidate(name, party, img, desc, { from: App.account });
          showToast("Success", "Candidate added to blockchain", "success");
          location.reload();
        } catch (err) {
          showToast("Blockchain Error", "Failed to add candidate", "error");
        } finally {
          App.setBtnLoading("addCandidate", false);
        }
      };
    }

    // Admin: Set Dates
    const setDateBtn = document.getElementById("addDate");
    if (setDateBtn) {
      setDateBtn.onclick = async () => {
        const start = Date.parse(document.getElementById("startDate").value) / 1000;
        const end = Date.parse(document.getElementById("endDate").value) / 1000;

        if (isNaN(start) || isNaN(end)) {
          showToast("Validation Error", "Select valid dates", "error");
          return;
        }

        App.setBtnLoading("addDate", true, "Setting...");
        try {
          await App.instance.setDates(start, end, { from: App.account });
          showToast("Sent", "Notifying voters via email...", "info");
          
          // Trigger backend notification
          try {
            const response = await fetch(`${App.pythonApiUrl}/admin/notify-voters`, { method: 'POST' });
          } catch (e) {
            console.error("Notification API failed:", e);
          }

          showToast("Success", "Voting period set and voters notified", "success");
          setTimeout(() => location.reload(), 2000);
        } catch (err) {
          showToast("Blockchain Error", "Failed to set dates", "error");
        } finally {
          App.setBtnLoading("addDate", false);
        }
      };
    }

    // Nav Logout
    const logoutBtn = document.getElementById("navLogout");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (confirm("Are you sure you want to logout?")) {
          localStorage.removeItem('jwtTokenVoter');
          localStorage.removeItem('jwtTokenAdmin');
          window.location.replace("login.html");
        }
      };
    }

    // Modal close for details
    const detailsModal = document.getElementById("detailsModal");
    const detailsClose = document.getElementById("detailsClose");
    if (detailsClose && detailsModal) {
      detailsClose.onclick = () => detailsModal.style.display = "none";
    }

    // Admin: Ticker Message Posting
    const tickerInput = document.getElementById("tickerMessage");
    const charCount = document.getElementById("charCount");
    const postTickerBtn = document.getElementById("postTicker");

    if (tickerInput && charCount) {
      tickerInput.addEventListener("input", () => {
        charCount.textContent = tickerInput.value.length;
      });
    }

    if (postTickerBtn) {
      postTickerBtn.onclick = async () => {
        const message = tickerInput.value.trim();
        if (!message) {
          showToast("Error", "Please enter a message", "error");
          return;
        }

        App.setBtnLoading("postTicker", true, "Posting...");
        try {
          await App.instance.setTickerMessage(message, { from: App.account });
          showToast("Success", "Ticker message posted to blockchain!", "success");
          
          // Update preview
          const preview = document.getElementById("currentTickerPreview");
          const previewText = document.getElementById("currentTickerText");
          if (preview && previewText) {
            previewText.textContent = message;
            preview.style.display = "block";
          }
          tickerInput.value = "";
          charCount.textContent = "0";
        } catch (err) {
          console.error(err);
          showToast("Error", "Failed to post message", "error");
        } finally {
          App.setBtnLoading("postTicker", false);
        }
      };

      // Load current ticker message on admin page
      App.loadCurrentTickerMessage();
    }

  },

  loadCurrentTickerMessage: async function () {
    try {
      const message = await App.instance.getTickerMessage();
      if (message && message.trim()) {
        const preview = document.getElementById("currentTickerPreview");
        const previewText = document.getElementById("currentTickerText");
        if (preview && previewText) {
          previewText.textContent = message;
          preview.style.display = "block";
        }
      }
    } catch (e) {
      console.log("No current ticker message");
    }
  },

  loadData: async function () {
    await App.loadCandidates();
    await App.loadDates();
    await App.updateStats();
    await App.checkVoteStatus();
    await App.loadTicker();
    
    // Admin features
    if (document.getElementById("pendingVotersList")) {
      await App.loadPendingVoters();
    }

    // Handle Published Results
    try {
        const isPublished = await App.instance.resultsPublished();
        if (isPublished) {
            App.showPublishedResultsUI();
        }
    } catch (e) {
        console.log("Results not yet published or state not supported");
    }
  },

  showPublishedResultsUI: async function() {
    // 1. Disable voting
    const voteBtn = document.getElementById("voteButton");
    if (voteBtn) {
        voteBtn.disabled = true;
        voteBtn.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Election Concluded';
        voteBtn.style.background = "linear-gradient(135deg, #64748B, #475569)";
    }

    // 2. Disable Publish Button in Admin
    const publishBtn = document.getElementById("publishResultsBtn");
    if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Results Published';
        publishBtn.style.opacity = "0.5";
    }

    // 3. Show Winner Alert
    if (window.leadingWinner && window.leadingWinner !== "-") {
        const head = document.getElementById("head");
        if (head && !document.getElementById("winnerBanner")) {
            const banner = document.createElement("div");
            banner.id = "winnerBanner";
            banner.className = "winner-banner pulse";
            banner.innerHTML = `
                <div class="winner-content">
                    <i class="fa-solid fa-trophy winner-icon"></i>
                    <div class="winner-text">
                        <h3>OFFICIAL RESULTS ANNOUNCED</h3>
                        <p>The winner is <strong>${window.leadingWinner}</strong></p>
                    </div>
                </div>
            `;
            head.appendChild(banner);
        }
    }

    // 4. Highlight Results Section
    const resultsSec = document.getElementById("resultsSection");
    if (resultsSec) {
        resultsSec.classList.add("results-published");
        const title = resultsSec.querySelector("h3");
        if (title) title.innerHTML = '<i class="fa-solid fa-square-poll-vertical"></i> FINAL ELECTION RESULTS';
    }
  },

  // loadElections (REMOVED)

  // ========== Election Ticker Functions ==========
  loadTicker: async function () {
    const tickerContent = document.getElementById('tickerContent');
    if (!tickerContent) return;

    try {
      const messages = [];

      // 1. Get admin-posted message from blockchain
      try {
        const adminMessage = await App.instance.getTickerMessage();
        if (adminMessage && adminMessage.trim()) {
          messages.push(`📢 ${adminMessage}`);
        }
      } catch (e) {
        console.log('No ticker message set');
      }

      // 2. Get voting dates for countdown
      const dates = await App.instance.getDates(App.selectedElectionId);
      const start = dates[0].toNumber();
      const end = dates[1].toNumber();
      const now = Math.floor(Date.now() / 1000);

      if (start > 0 && end > 0) {
        if (now < start) {
          const hoursUntil = Math.ceil((start - now) / 3600);
          messages.push(`⏳ Voting opens in ${hoursUntil} hours!`);
        } else if (now >= start && now <= end) {
          const hoursLeft = Math.ceil((end - now) / 3600);
          if (hoursLeft <= 24) {
            messages.push(`⏰ HURRY! Only ${hoursLeft} hours left to vote!`);
          } else {
            const daysLeft = Math.ceil(hoursLeft / 24);
            messages.push(`📅 ${daysLeft} days left in the election`);
          }
        } else {
          messages.push(`🏁 Voting has ended. Results are final.`);
        }
      }

      // 3. Calculate turnout percentage (if we have voter data)
      const totalVotes = window.totalVotesCount || 0;
      if (totalVotes > 0) {
        messages.push(`🗳️ ${totalVotes} votes cast so far!`);
        
        if (totalVotes >= 100) {
          messages.push(`🎉 Voter turnout milestone: ${totalVotes}+ votes!`);
        }
      }

      // 4. Leading candidate info
      if (window.leadingWinner && window.leadingWinner !== '-') {
        messages.push(`🏆 Current leader: ${window.leadingWinner}`);
      }

      // Default message if none exist
      if (messages.length === 0) {
        messages.push('🗳️ Welcome to the Decentralized Voting System | Secure • Transparent • Immutable');
      }

      // Build ticker HTML with multiple messages
      tickerContent.innerHTML = messages.map(m => `<span class="ticker-text">${m}</span>`).join('');

      // Refresh ticker every 30 seconds
      setTimeout(() => App.loadTicker(), 30000);

    } catch (err) {
      console.error('Failed to load ticker:', err);
      tickerContent.innerHTML = '<span class="ticker-text">🗳️ Welcome to the Decentralized Voting System</span>';
    }
  },

  loadCandidates: async function () {
    const count = (await App.instance.countCandidates()).toNumber();
    const grid = document.getElementById("candidatesGrid");
    const adminList = document.getElementById("candidatesList");
    const skeleton = document.getElementById("loadingSkeleton");

    if (skeleton) skeleton.style.display = "none";
    if (grid) grid.innerHTML = "";
    if (adminList) adminList.innerHTML = "";

    // First pass: Collect all active candidates and total votes
    let activeCandidates = [];
    let totalVotes = 0;
    
    for (let i = 1; i <= count; i++) {
        const c = await App.instance.getCandidate(i);
        if (c[6]) { // isActive
            activeCandidates.push({
                id: c[0].toNumber(),
                name: c[1],
                party: c[2],
                img: c[3] || "../assets/default-party.png",
                desc: c[4],
                votes: c[5].toNumber()
            });
            totalVotes += c[5].toNumber();
        }
    }

    // Initialize global tracking arrays for Chart.js
    window.candidateNames = [];
    window.candidateVotes = [];
    let leadingVotes = -1;
    let winner = "";

    // Second pass: Render candidates
    activeCandidates.forEach(c => {
        window.candidateNames.push(c.name);
        window.candidateVotes.push(c.votes);
        if (c.votes > leadingVotes) {
            leadingVotes = c.votes;
            winner = c.name;
        }

        // Voter Grid
        if (grid) {
            const card = document.createElement("div");
            card.className = "candidate-card";
            const progress = totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0;
            card.innerHTML = `
                <div class="candidate-header">
                  <img src="${c.img}" class="candidate-logo" onerror="this.src='../assets/default-party.png'">
                  <div class="candidate-info">
                    <h4>${c.name}</h4>
                    <p>${c.party}</p>
                    <button class="btn-learn-more" onclick="event.stopPropagation(); App.showDetails('${c.name}', '${c.party}', '${c.img}', \`${c.desc}\`)">
                       <i class="fa-solid fa-circle-info"></i> Learn More
                    </button>
                  </div>
                </div>
                <div class="candidate-votes">
                  <div class="vote-count">
                    <span>Voter Support</span>
                    <strong>${c.votes}</strong>
                  </div>
                  <div class="vote-progress">
                    <div class="vote-progress-bar" style="width: ${progress}%"></div>
                  </div>
                </div>
              `;
            card.onclick = () => App.selectCandidate(c.id, c.name, c.party, c.img, card);
            grid.appendChild(card);
        }

        // Admin List
        if (adminList) {
            const item = document.createElement("div");
            item.className = "candidate-item";
            item.innerHTML = `
                <img src="${c.img}" class="candidate-image" onerror="this.src='../assets/default-party.png'">
                <div class="candidate-info">
                  <p class="candidate-name">${c.name}</p>
                  <p class="candidate-party">${c.party}</p>
                </div>
                <div class="candidate-votes">${c.votes} Votes</div>
                <button class="btn-delete" onclick="App.deleteCandidate(${c.id}, '${c.name}')">
                  <i class="fa-solid fa-trash-can"></i> Delete
                </button>
              `;
            adminList.appendChild(item);
        }
    });

    // Handle empty state
    if (activeCandidates.length === 0) {
        if (document.getElementById("emptyState")) document.getElementById("emptyState").style.display = "block";
    } else {
        if (document.getElementById("emptyState")) document.getElementById("emptyState").style.display = "none";
    }

    // Global stats update
    window.totalVotesCount = totalVotes;
    window.totalCandidatesCount = activeCandidates.length;
    window.leadingWinner = winner;

    // Force UI Refresh
    App.updateStats();
  },

  loadDates: async function () {
    try {
      const dates = await App.instance.getDates();
      const start = dates[0].toNumber();
      const end = dates[1].toNumber();

      const datesText = document.getElementById("dates");
      if (datesText) {
        if (start === 0 && end === 0) {
          datesText.textContent = "Election not scheduled";
        } else {
          datesText.textContent = `${new Date(start * 1000).toLocaleDateString()} - ${new Date(end * 1000).toLocaleDateString()}`;
        }
      }

      const statusEl = document.getElementById("votingStatus");
      const statusText = document.getElementById("votingStatusText") || document.getElementById("votingStatus");
      if (statusText) {
        const now = Math.floor(Date.now() / 1000);
        if (start === 0) statusText.textContent = "Unscheduled";
        else if (now < start) statusText.textContent = "Upcoming";
        else if (now > end) statusText.textContent = "Ended";
        else statusText.textContent = "Active";
      }
    } catch (e) { }
  },

  updateStats: function () {
    const ids = ["totalCandidates", "totalVotes", "voterTotalCandidates"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id.includes("Candidates")) el.textContent = window.totalCandidatesCount || 0;
        else el.textContent = window.totalVotesCount || 0;
      }
    });

    const leadEl = document.getElementById("leadingCandidate");
    if (leadEl) leadEl.textContent = window.leadingWinner || "-";

    // Charts update
    App.renderResultsChart();
    App.renderDistributionChart();
  },

  renderDistributionChart: async function () {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;

    try {
        const events = await App.instance.getPastEvents('VoteCast', { 
            fromBlock: 0, 
            toBlock: 'latest' 
        });
        
        // Group by hour
        const hourlyData = {};
        events.forEach(event => {
            const time = new Date(event.returnValues.timestamp * 1000);
            const label = time.getHours() + ":00";
            hourlyData[label] = (hourlyData[label] || 0) + 1;
        });

        const labels = Object.keys(hourlyData);
        const data = Object.values(hourlyData);

        if (App.distChart) {
            App.distChart.data.labels = labels;
            App.distChart.data.datasets[0].data = data;
            App.distChart.update();
        } else {
            App.distChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Votes Cast',
                        data: data,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#FFF' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        x: { ticks: { color: '#FFF' }, grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    } catch (e) {
        console.error("Error loading distribution chart:", e);
    }
  },


  exportToCSV: function () {
    let csv = "Candidate,Party,Votes\n";
    const adminList = document.getElementById("candidatesList");
    if (!adminList) return;
    
    const items = adminList.querySelectorAll(".candidate-item");
    items.forEach(item => {
        const name = item.querySelector(".candidate-name").textContent;
        const party = item.querySelector(".candidate-party").textContent;
        const votes = item.querySelector(".candidate-votes").textContent.split(" ")[0];
        csv += `"${name}","${party}",${votes}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "election_results.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  exportToPDF: function () {
    window.print(); // Simple PDF via browser print or could use jsPDF
  },

  renderResultsChart: function () {
    const ctx = document.getElementById('resultsChart');
    if (!ctx) return;

    const labels = window.candidateNames || [];
    const data = window.candidateVotes || [];
    const colors = ['#8B5CF6', '#EC4899', '#10B981', '#06B6D4', '#3B82F6', '#F59E0B'];

    if (App.resultsChart) {
      App.resultsChart.data.labels = labels;
      App.resultsChart.data.datasets[0].data = data;
      App.resultsChart.update();
    } else {
      App.resultsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Votes',
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderRadius: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#FFFFFF' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            x: {
              ticks: { color: '#FFFFFF' },
              grid: { display: false }
            }
          }
        }
      });
    }
  },


  checkVoteStatus: async function () {
    try {
      const voted = await App.instance.checkVote();
      const statusEl = document.getElementById("voteStatus");
      if (statusEl) statusEl.textContent = voted ? "Voted" : "Not Voted";

      if (voted) {
        const btn = document.getElementById("voteButton");
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Vote Submitted';
        }
      } else {
        const now = Math.floor(Date.now() / 1000);
        const dates = await App.instance.getDates();
        const start = dates[0].toNumber();
        const end = dates[1].toNumber();

        if (now >= start && now <= end) {
          // Keep button enabled if selected
        } else {
          const btn = document.getElementById("voteButton");
          if (btn) btn.disabled = true;
        }
      }
    } catch (e) { }
  },

  selectCandidate: function (id, name, party, img, el) {
    App.selectedCandidateId = id;
    App.selectedCandidateInfo = { name, party, img };

    // Clear other selections
    const cards = document.querySelectorAll(".candidate-card");
    cards.forEach(c => c.classList.remove("selected"));
    el.classList.add("selected");

    const btn = document.getElementById("voteButton");
    if (btn) {
      btn.disabled = false;
      btn.classList.add("pulse");
    }
  },

  vote: async function () {
    if (!App.selectedCandidateId) {
      showToast("Warning", "Please select a candidate first", "error");
      return;
    }

    // Show Confirmation Modal (if exists)
    const modal = document.getElementById("voteModal");
    if (modal) {
      document.getElementById("modalCandidateName").textContent = App.selectedCandidateInfo.name;
      document.getElementById("modalCandidateParty").textContent = App.selectedCandidateInfo.party;
      document.getElementById("modalCandidateImage").src = App.selectedCandidateInfo.img;
      modal.style.display = "flex";

      document.getElementById("modalConfirm").onclick = async () => {
        modal.style.display = "none";
        await App.submitVote();
      };
      document.getElementById("modalCancel").onclick = () => modal.style.display = "none";
    } else {
      if (confirm(`Vote for ${App.selectedCandidateInfo.name}?`)) {
        await App.submitVote();
      }
    }
  },

  submitVote: async function () {
    App.setBtnLoading("voteButton", true, "Submitting...");
    try {
      const result = await App.instance.vote(App.selectedCandidateId, { from: App.account });
      const txHash = result.tx;
      const timestamp = new Date().toLocaleString();

      // Show success modal with receipt
      await App.showVoteSuccessModal(txHash, timestamp);
      await App.loadData(); // Reload data after successful vote

    } catch (err) {
      console.error(err);
      showToast("Error", "Transaction failed or already voted", "error");
    } finally {
      App.setBtnLoading("voteButton", false);
    }
  },

  // ========== Vote Receipt Functions ==========
  showVoteSuccessModal: async function (txHash, timestamp) {
    const modal = document.getElementById('voteSuccessModal');
    if (!modal) {
      showToast("Success", "Your vote has been recorded!", "success");
      setTimeout(() => location.reload(), 2000);
      return;
    }

    // Store transaction data for PDF generation
    App.lastVoteTx = { txHash, timestamp };

    // Display transaction hash
    const txDisplay = document.getElementById('txHashDisplay');
    if (txDisplay) txDisplay.textContent = txHash;

    // Show modal FIRST to ensure canvas is visible
    modal.style.display = 'flex';

    // Generate QR code
    const verifyUrl = `${window.location.origin}/src/html/verify.html?tx=${txHash}`;
    const qrContainer = document.getElementById('receiptQRCode');
    
    if (qrContainer) {
      if (window.QRCode) {
        console.log("Generating QR Code with qrcodejs...");
        try {
          // Clear previous QR code
          qrContainer.innerHTML = '';
          
          // Generate new QR code
          new QRCode(qrContainer, {
            text: verifyUrl,
            width: 150,
            height: 150,
            colorDark: "#1e1b4b",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
          
          console.log('QR Code generated successfully');
        } catch (err) {
          console.error('QR generation exception:', err);
          showToast('Warning', 'QR Code generation failed', 'error');
        }
      } else {
        console.error('QRCode library not loaded');
        showToast('Error', 'QR Library missing', 'error');
      }
    }

    // Setup button handlers
    document.getElementById('copyTxHash').onclick = () => {
      navigator.clipboard.writeText(txHash);
      showToast('Copied', 'Transaction hash copied to clipboard', 'success');
    };

    document.getElementById('downloadReceipt').onclick = () => App.generateReceiptPDF();

    document.getElementById('closeSuccessModal').onclick = () => {
      modal.style.display = 'none';
      location.reload();
    };
  },

  generateReceiptPDF: async function () {
    if (!window.jspdf || !App.lastVoteTx) {
      showToast('Error', 'PDF generation not available', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { txHash, timestamp } = App.lastVoteTx;

    // Header with gradient simulation
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setFillColor(236, 72, 153);
    doc.rect(0, 35, 210, 10, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VOTING RECEIPT', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Election Commission of India', 105, 30, { align: 'center' });

    // Body content
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(14);
    doc.text('Your vote has been securely recorded on the blockchain.', 105, 60, { align: 'center' });

    // Transaction details box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 75, 170, 50, 3, 3, 'F');
    doc.setDrawColor(139, 92, 246);
    doc.roundedRect(20, 75, 170, 50, 3, 3, 'S');

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('TRANSACTION HASH', 30, 88);
    doc.setFontSize(9);
    doc.setTextColor(6, 182, 212);
    doc.setFont('courier', 'normal');
    doc.text(txHash, 30, 98);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('TIMESTAMP', 30, 115);
    doc.setTextColor(30, 27, 75);
    doc.text(timestamp, 80, 115);

    // QR Code
    const qrContainer = document.getElementById('receiptQRCode');
    if (qrContainer) {
      const qrImg = qrContainer.getElementsByTagName('img')[0];
      if (qrImg && qrImg.src) {
        doc.addImage(qrImg.src, 'PNG', 70, 135, 70, 70);
      }
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Scan to verify your vote', 105, 215, { align: 'center' });

    // Footer
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 260, 210, 37, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text('This receipt confirms your participation. Your vote choice remains private.', 105, 275, { align: 'center' });
    doc.text(`Verify at: ${window.location.origin}/src/html/verify.html`, 105, 285, { align: 'center' });

    // Save
    doc.save(`voting-receipt-${txHash.substring(0, 10)}.pdf`);
    showToast('Downloaded', 'Receipt PDF saved successfully', 'success');
  },

  setBtnLoading: function (id, loading, text) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (loading) {
      btn.classList.add("loading");
      btn.disabled = true;
      if (btn.querySelector(".btn-loader")) btn.querySelector(".btn-loader").style.display = "inline-block";
      if (btn.querySelector(".btn-text")) btn.querySelector(".btn-text").style.display = "none";
    } else {
      btn.classList.remove("loading");
      btn.disabled = false;
      if (btn.querySelector(".btn-loader")) btn.querySelector(".btn-loader").style.display = "none";
      if (btn.querySelector(".btn-text")) btn.querySelector(".btn-text").style.display = "inline-block";
    }
  },

  compressImage: function (base64Str, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // High compression
      };
      img.onerror = (err) => reject(err);
    });
  },

  filterCandidates: function () {
    const query = document.getElementById('candidateSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.candidate-card');

    cards.forEach(card => {
      const name = card.querySelector('h4').textContent.toLowerCase();
      const party = card.querySelector('p').textContent.toLowerCase();

      if (name.includes(query) || party.includes(query)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });

    // Handle empty state if all are filtered
    const visibleCards = document.querySelectorAll('.candidate-card[style="display: block;"]');
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      if (visibleCards.length === 0 && cards.length > 0) {
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = 'No Matches Found';
        emptyState.querySelector('p').textContent = 'Try adjusting your search query.';
      } else if (cards.length > 0) {
        emptyState.style.display = 'none';
      }
    }
  },

  showDetails: function (name, party, img, desc) {
    const modal = document.getElementById("detailsModal");
    if (!modal) return;

    document.getElementById("detailsCandidateName").textContent = name;
    document.getElementById("detailsCandidateParty").textContent = party;
    document.getElementById("detailsCandidateImage").src = img;
    document.getElementById("detailsCandidateDescription").textContent = desc || "No description available for this candidate.";

    modal.style.display = "flex";
  },

  deleteCandidate: async function (id, name) {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    
    try {
      showToast("Pending", "Deleting candidate from blockchain...", "info");
      await App.instance.deleteCandidate(id, { from: App.account });
      showToast("Success", "Candidate deactivated successfully", "success");
      location.reload();
    } catch (err) {
      console.error(err);
      showToast("Error", "Failed to delete candidate", "error");
    }
  },

  loadPendingVoters: async function () {
    const list = document.getElementById("pendingVotersList");
    if (!list) return;

    try {
      const response = await fetch(`${App.pythonApiUrl}/admin/voters/pending`);
      const voters = await response.json();

      if (voters.length === 0) {
        list.innerHTML = '<p class="empty-state"><i class="fa-solid fa-thumbs-up"></i> No pending registrations</p>';
        return;
      }

      list.innerHTML = "";
      voters.forEach(v => {
        const item = document.createElement("div");
        item.className = "approval-item";
        item.innerHTML = `
          <div class="approval-user-info">
            <span class="approval-id">${v.voter_id}</span>
            <span class="approval-email">${v.email}</span>
          </div>
          <div class="approval-actions">
            <button class="btn-approve" onclick="App.approveVoter('${v.voter_id}', true)">
              <i class="fa-solid fa-check"></i> Approve
            </button>
            <button class="btn-reject" onclick="App.approveVoter('${v.voter_id}', false)">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          </div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  },

  approveVoter: async function (voterId, approved) {
    const action = approved ? 'approve' : 'reject';
    try {
      const response = await fetch(`${App.pythonApiUrl}/admin/voters/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId, action: action })
      });

      if (response.ok) {
        showToast("Success", `Voter ${voterId} ${action}d`, "success");
        await App.loadPendingVoters();
      } else {
        showToast("Error", "Failed to process request", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error", "Connection failed", "error");
    }
  },

  publishResults: async function () {
    if (!confirm("Are you sure you want to officially publish results? This will END the election and notify all voters.")) {
      return;
    }

    App.setBtnLoading("publishResultsBtn", true, "Publishing...");
    try {
      // 1. Transaction on Blockchain
      const result = await App.instance.publishResults({ from: App.account });
      
      // Look for ResultsPublished event in logs
      const event = result.logs.find(l => l.event === "ResultsPublished");
      const winnerName = event ? event.args.winnerName : "Winner Announced";
      const winnerId = event ? event.args.winningCandidateId.toNumber() : 0;

      showToast("Success", "Results recorded on blockchain", "success");

      // 2. Notify Backend to send emails
      showToast("Notifying", "Sending official results to voters...", "info");
      try {
        const response = await fetch(`${App.pythonApiUrl}/admin/publish-results`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('jwtTokenAdmin')
          },
          body: JSON.stringify({ 
            winner_name: winnerName, 
            winner_id: winnerId 
          })
        });
        
        if (response.ok) {
            showToast("Success", "Voters notified via email", "success");
        } else {
            console.error("Backend notification failed with status:", response.status);
        }
      } catch (e) {
        console.error("Backend notification failed:", e);
        showToast("Warning", "Blockchain updated, but email notification failed", "info");
      }

      setTimeout(() => location.reload(), 2000);
    } catch (err) {
      console.error(err);
      showToast("Error", "Failed to publish results: " + (err.message || "Unknown error"), "error");
    } finally {
      App.setBtnLoading("publishResultsBtn", false);
    }
  }
};

window.addEventListener("load", () => App.eventStart());
