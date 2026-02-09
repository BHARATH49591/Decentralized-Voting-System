// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        string party;
        string partyImage;
        string partyDescription;
        uint voteCount;
        bool isActive;
    }

    mapping(uint => Candidate) public candidates;
    mapping(address => bool) public voters;

    uint public countCandidates;
    uint256 public votingStart;
    uint256 public votingEnd;
    string public tickerMessage;
    bool public resultsPublished;

    event VoteCast(
        uint indexed candidateId,
        address indexed voter,
        uint256 timestamp
    );
    event CandidateAdded(uint indexed id, string name, string party);
    event DatesSet(uint256 start, uint256 end);
    event ResultsPublished(uint winningCandidateId, string winnerName);

    modifier onlyAdmin() {
        // Simple admin check: In a production app, use Ownable or AccessControl
        // For this demo, we assume the deployer is the admin
        _;
    }

    function addCandidate(
        string memory _name,
        string memory _party,
        string memory _img,
        string memory _desc
    ) public {
        countCandidates++;
        candidates[countCandidates] = Candidate(
            countCandidates,
            _name,
            _party,
            _img,
            _desc,
            0,
            true
        );
        emit CandidateAdded(countCandidates, _name, _party);
    }

    function deleteCandidate(uint _id) public {
        require(_id > 0 && _id <= countCandidates, "Invalid candidate ID");
        candidates[_id].isActive = false;
    }

    function setDates(uint256 _start, uint256 _end) public {
        require(_end > _start, "End must be after start");
        votingStart = _start;
        votingEnd = _end;
        emit DatesSet(_start, _end);
    }

    function getDates() public view returns (uint256, uint256) {
        return (votingStart, votingEnd);
    }

    function setTickerMessage(string memory _message) public {
        tickerMessage = _message;
    }

    function getTickerMessage() public view returns (string memory) {
        return tickerMessage;
    }

    function vote(uint _candidateId) public {
        require(
            !resultsPublished,
            "Voting has ended and results are published"
        );
        require(!voters[msg.sender], "Already voted");
        require(
            _candidateId > 0 && _candidateId <= countCandidates,
            "Invalid candidate ID"
        );
        require(candidates[_candidateId].isActive, "Candidate is not active");

        uint256 nowTime = block.timestamp;
        if (votingStart > 0 && votingEnd > 0) {
            require(
                nowTime >= votingStart && nowTime <= votingEnd,
                "Voting not active"
            );
        }

        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit VoteCast(_candidateId, msg.sender, nowTime);
    }

    function checkVote() public view returns (bool) {
        return voters[msg.sender];
    }

    function getCandidate(
        uint _id
    )
        public
        view
        returns (
            uint,
            string memory,
            string memory,
            string memory,
            string memory,
            uint,
            bool
        )
    {
        require(_id > 0 && _id <= countCandidates, "Invalid ID");
        Candidate memory c = candidates[_id];
        return (
            c.id,
            c.name,
            c.party,
            c.partyImage,
            c.partyDescription,
            c.voteCount,
            c.isActive
        );
    }

    function publishResults() public {
        // Simple winner calculation for this demo
        uint winnerId = 1;
        uint maxVotes = 0;
        for (uint i = 1; i <= countCandidates; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }

        resultsPublished = true;
        votingEnd = block.timestamp;

        emit ResultsPublished(winnerId, candidates[winnerId].name);
    }
}
