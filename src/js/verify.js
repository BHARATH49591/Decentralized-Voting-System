const Web3 = require("web3");
const contract = require("@truffle/contract");
const votingArtifacts = require("../../build/contracts/Voting.json");

const VotingContract = contract(votingArtifacts);

// Toast Notification
const showToast = (title, message, type = 'info') => {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 4000);
};

window.Verify = {
  web3Provider: null,
  instance: null,

  init: async function () {
    try {
      // Connect to local Ganache
      this.web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
      const web3 = new Web3(this.web3Provider);
      VotingContract.setProvider(this.web3Provider);
      
      this.instance = await VotingContract.deployed();
      console.log("Connected to blockchain for verification");

      this.initializeHandlers();
      this.checkUrlParams();
    } catch (err) {
      console.error("Failed to connect to blockchain:", err);
      showToast("Connection Error", "Could not connect to blockchain", "error");
    }
  },

  initializeHandlers: function () {
    // Verify button click
    document.getElementById('verifyBtn').addEventListener('click', () => this.verifyVote());

    // Paste button
    document.getElementById('pasteBtn').addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        document.getElementById('txHashInput').value = text;
        showToast("Pasted", "Transaction hash pasted from clipboard", "success");
      } catch (err) {
        showToast("Error", "Could not access clipboard", "error");
      }
    });

    // Enter key to verify
    document.getElementById('txHashInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.verifyVote();
    });
  },

  checkUrlParams: function () {
    // Check if hash is passed in URL (from QR code)
    const urlParams = new URLSearchParams(window.location.search);
    const txHash = urlParams.get('tx');
    if (txHash) {
      document.getElementById('txHashInput').value = txHash;
      this.verifyVote();
    }
  },

  verifyVote: async function () {
    const txHash = document.getElementById('txHashInput').value.trim();
    
    if (!txHash) {
      showToast("Error", "Please enter a transaction hash", "error");
      return;
    }

    if (!txHash.startsWith('0x') || txHash.length !== 66) {
      showToast("Error", "Invalid transaction hash format", "error");
      return;
    }

    // Show loading
    const btn = document.getElementById('verifyBtn');
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
      const web3 = new Web3(this.web3Provider);
      const tx = await web3.eth.getTransaction(txHash);
      const receipt = await web3.eth.getTransactionReceipt(txHash);

      if (!tx || !receipt) {
        this.showResult(false, "Transaction not found on the blockchain");
        return;
      }

      // Check if it's a vote transaction by looking for VoteCast event
      const voteCastEventSignature = web3.utils.sha3('VoteCast(uint256,address,uint256)');
      const voteLog = receipt.logs.find(log => log.topics[0] === voteCastEventSignature);

      if (!voteLog) {
        this.showResult(false, "This transaction is not a valid vote");
        return;
      }

      // Decode the event data
      const block = await web3.eth.getBlock(receipt.blockNumber);
      const timestamp = new Date(block.timestamp * 1000).toLocaleString();

      this.showResult(true, "Vote verified successfully!", {
        blockNumber: receipt.blockNumber,
        timestamp: timestamp,
        status: receipt.status ? 'Confirmed' : 'Failed',
        gasUsed: receipt.gasUsed
      });

    } catch (err) {
      console.error("Verification error:", err);
      this.showResult(false, "Could not verify transaction. Please check the hash and try again.");
    } finally {
      btn.querySelector('.btn-text').style.display = 'inline';
      btn.querySelector('.btn-loader').style.display = 'none';
      btn.disabled = false;
    }
  },

  showResult: function (success, message, details = null) {
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');

    resultSection.style.display = 'block';
    resultSection.className = `result-section ${success ? 'result-success' : 'result-error'}`;

    let html = `
      <div style="text-align: center;">
        <div class="result-icon">
          <i class="fa-solid ${success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        </div>
        <h3 class="result-title">${success ? 'Vote Verified!' : 'Verification Failed'}</h3>
        <p style="color: var(--text-muted);">${message}</p>
      </div>
    `;

    if (success && details) {
      html += `
        <div class="result-details">
          <div class="result-row">
            <span class="result-label"><i class="fa-solid fa-cube"></i> Block Number</span>
            <span class="result-value">${details.blockNumber}</span>
          </div>
          <div class="result-row">
            <span class="result-label"><i class="fa-solid fa-clock"></i> Timestamp</span>
            <span class="result-value">${details.timestamp}</span>
          </div>
          <div class="result-row">
            <span class="result-label"><i class="fa-solid fa-shield-check"></i> Status</span>
            <span class="result-value" style="color: var(--accent);">${details.status}</span>
          </div>
          <div class="result-row">
            <span class="result-label"><i class="fa-solid fa-gas-pump"></i> Gas Used</span>
            <span class="result-value">${details.gasUsed}</span>
          </div>
        </div>
        <p style="text-align: center; margin-top: 20px; color: var(--text-muted); font-size: 0.9rem;">
          <i class="fa-solid fa-lock"></i> Your vote choice remains private and secure
        </p>
      `;
    }

    resultContent.innerHTML = html;

    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

window.addEventListener("load", () => Verify.init());
