const Web3 = require("web3");
const contract = require("@truffle/contract");
const votingArtifacts = require("../../build/contracts/Voting.json");

const VotingContract = contract(votingArtifacts);

window.Audit = {
    web3: null,
    instance: null,
    events: [],

    init: async function() {
        this.updateStatus("Connecting to blockchain...", "info");
        
        const providers = [
            "http://127.0.0.1:7545",
            "http://localhost:7545",
            "http://127.0.0.1:8545"
        ];

        let connected = false;
        
        for (const url of providers) {
            try {
                this.web3 = new Web3(new Web3.providers.HttpProvider(url));
                VotingContract.setProvider(this.web3.currentProvider);
                this.instance = await VotingContract.deployed();
                console.log(`Audit Portal: Connected to ${url}`);
                connected = true;
                break;
            } catch (e) {
                console.warn(`Failed to connect to ${url}`);
            }
        }

        if (!connected && window.ethereum) {
            try {
                this.web3 = new Web3(window.ethereum);
                VotingContract.setProvider(window.ethereum);
                this.instance = await VotingContract.deployed();
                console.log("Audit Portal: Connected via window.ethereum");
                connected = true;
            } catch (e) {
                console.warn("MetaMask connection failed");
            }
        }

        if (connected) {
            this.updateStatus("Connected & Synchronized", "success");
            await this.loadInitialData();
            await this.checkResultsPublished();
            this.startListening();
        } else {
            this.updateStatus("Connection failed. Is Ganache running on 7545?", "error");
        }
    },

    updateStatus: function(msg, type) {
        const el = document.getElementById('initialLoading');
        if (!el) return;
        
        if (type === 'error') {
            el.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: #EF4444;"></i> ${msg}`;
            el.style.color = "#EF4444";
        } else if (type === 'success') {
            el.style.display = 'none';
        } else {
            el.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msg}`;
        }
    },

    loadInitialData: async function() {
        const auditLog = document.getElementById('auditLog');
        const totalVotesEl = document.getElementById('totalVotes');
        const totalCandidatesEl = document.getElementById('totalCandidates');
        const lastBlockEl = document.getElementById('lastBlock');

        // 1. Get Candidate Count
        const count = (await this.instance.countCandidates()).toNumber();
        totalCandidatesEl.textContent = count;

        // 2. Fetch all past VoteCast events
        const voteEvents = await this.instance.getPastEvents('VoteCast', {
            fromBlock: 0,
            toBlock: 'latest'
        });
        
        totalVotesEl.textContent = voteEvents.length;
        
        // 3. Update Last Block
        const blockNumber = await this.web3.eth.getBlockNumber();
        lastBlockEl.textContent = blockNumber;

        // 4. Process and display events
        if (voteEvents.length > 0) {
            document.getElementById('initialLoading').style.display = 'none';
            // Sort by block number descending
            voteEvents.reverse().forEach(event => {
                this.addLogEntry(event, 'vote');
            });
        }
        
        candidateEvents.forEach(event => {
            this.addLogEntry(event, 'candidate');
        });

        // 6. Fetch ResultsPublished events
        const resultEvents = await this.instance.getPastEvents('ResultsPublished', {
            fromBlock: 0,
            toBlock: 'latest'
        });
        
        resultEvents.forEach(event => {
            this.addLogEntry(event, 'result');
        });
    },

    checkResultsPublished: async function() {
        try {
            const isPublished = await this.instance.resultsPublished();
            if (isPublished) {
                // If published but no event found in initial load (unlikely but safe)
                // we can still trigger UI changes
                document.body.classList.add('election-concluded');
            }
        } catch (e) {
            console.log("Results status check failed");
        }
    },

    addLogEntry: function(event, type) {
        const auditLog = document.getElementById('auditLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const timestamp = event.returnValues.timestamp 
            ? new Date(event.returnValues.timestamp * 1000).toLocaleString()
            : 'Pending Confirmation';
            
        if (type === 'vote') {
            entry.innerHTML = `
                <div class="log-icon log-vote"><i class="fa-solid fa-check"></i></div>
                <div class="log-details">
                    <div style="font-weight: 600;">Vote Cast for Candidate #${event.returnValues.candidateId}</div>
                    <div class="log-time">${timestamp} | Block: ${event.blockNumber}</div>
                    <div class="log-hash" onclick="navigator.clipboard.writeText('${event.transactionHash}'); alert('Hash copied!')">
                        Tx: ${event.transactionHash.substring(0, 20)}...
                    </div>
                </div>
            `;
        } else if (type === 'result') {
            entry.className = 'log-entry winner-log';
            entry.innerHTML = `
                <div class="log-icon log-winner"><i class="fa-solid fa-trophy"></i></div>
                <div class="log-details">
                    <div style="font-weight: 700; color: #6366F1;">OFFICIAL WINNER ANNOUNCED!</div>
                    <div style="font-size: 1.2rem; font-weight: bold; margin: 5px 0;">${event.returnValues.winnerName}</div>
                    <div class="log-time">Block: ${event.blockNumber}</div>
                    <div class="log-hash" onclick="navigator.clipboard.writeText('${event.transactionHash}'); alert('Hash copied!')">
                        Tx: ${event.transactionHash.substring(0, 20)}...
                    </div>
                </div>
            `;
            // Trigger UI banner
            this.showWinnerBanner(event.returnValues.winnerName);
        } else {
            entry.innerHTML = `
                <div class="log-icon log-candidate"><i class="fa-solid fa-user-plus"></i></div>
                <div class="log-details">
                    <div style="font-weight: 600;">New Candidate Added: ${event.returnValues.name} (${event.returnValues.party})</div>
                    <div class="log-time">Block: ${event.blockNumber}</div>
                    <div class="log-hash" onclick="navigator.clipboard.writeText('${event.transactionHash}'); alert('Hash copied!')">
                        Tx: ${event.transactionHash.substring(0, 20)}...
                    </div>
                </div>
            `;
        }
        
        // Add to top if it's a new real-time event, or just append during initial load (simplification)
        auditLog.prepend(entry);
    },

    startListening: function() {
        // Since we're using HttpProvider, we'll poll for new blocks/events
        setInterval(async () => {
            try {
                const currentBlock = await this.web3.eth.getBlockNumber();
                const lastBlockEl = document.getElementById('lastBlock');
                const lastSeen = parseInt(lastBlockEl.textContent);
                
                if (currentBlock > lastSeen) {
                    lastBlockEl.textContent = currentBlock;
                    // Fetch events from newly mined blocks
                    const newEvents = await this.instance.getPastEvents('VoteCast', {
                        fromBlock: lastSeen + 1,
                        toBlock: 'latest'
                    });
                    
                    newEvents.forEach(e => {
                        this.addLogEntry(e, 'vote');
                        const totalVotesEl = document.getElementById('totalVotes');
                        totalVotesEl.textContent = parseInt(totalVotesEl.textContent) + 1;
                    });

                    // Also poll for ResultsPublished
                    const resultEvents = await this.instance.getPastEvents('ResultsPublished', {
                        fromBlock: lastSeen + 1,
                        toBlock: 'latest'
                    });
                    resultEvents.forEach(e => this.addLogEntry(e, 'result'));
                }
            } catch (e) { console.error("Polling error:", e); }
        }, 5000);
    },

    showWinnerBanner: function(name) {
        if (document.getElementById('auditWinnerBanner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'auditWinnerBanner';
        banner.className = 'audit-winner-banner';
        banner.innerHTML = `
            <i class="fa-solid fa-trophy"></i>
            <span>ELECTION CONCLUDED: <strong>${name}</strong> IS THE OFFICIAL WINNER</span>
        `;
        document.querySelector('.audit-container').prepend(banner);
    }
};

window.addEventListener("load", () => Audit.init());
