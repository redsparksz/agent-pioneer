// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/// @title Agent Pioneer — soulbound attendance badge for Binance Agent ID holders
/// @notice Free to mint (gas only) for Agent ID holders. Daily check-in builds a streak.
/// @dev NO owner, NO admin, NO pause, NO upgrade, NO privileged roles of any kind.
///      The contract is immutable after deployment. All permissions: none.
///      Agent ID gate reads the SPACE ID Agent ID registry (ERC-721, non-transferable).
///      Transfers and approvals are fully disabled (soulbound) — there is no way
///      to move a badge or grant anyone control over it.
interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentPioneer {
    // ---- errors ----
    error NotAgentIdHolder();
    error AlreadyMinted();
    error NoBadge();
    error AlreadyCheckedInToday();
    error Soulbound();
    error NonexistentToken();

    // ---- events ----
    event BadgeMinted(address indexed holder, uint256 indexed tokenId);
    event CheckedIn(address indexed holder, uint256 indexed tokenId, uint256 streak, uint256 day);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    // ---- metadata ----
    string public constant name = "Agent Pioneer Badge";
    string public constant symbol = "AGP";

    // ---- immutable config ----
    IAgentIdRegistry public immutable agentIdRegistry;

    // ---- state ----
    uint256 public nextTokenId; // starts at 0, first badge is #1
    uint256 public totalMinted;
    uint256 public totalCheckIns;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) public tokenOf; // wallet -> tokenId (0 = none)
    mapping(address => uint256) public streakOf;
    mapping(address => uint256) public lastCheckInDay;
    mapping(address => uint256) public checkInsOf;

    constructor(address agentIdRegistry_) {
        agentIdRegistry = IAgentIdRegistry(agentIdRegistry_);
    }

    // ---- views ----
    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert NonexistentToken();
        return owner;
    }

    function hasBadge(address user) external view returns (bool) {
        return tokenOf[user] != 0;
    }

    function currentDay() external view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 // ERC165
            || interfaceId == 0x80ac58cd // ERC721
            || interfaceId == 0x5b5e139f; // ERC721Metadata
    }

    // ---- core ----
    /// @notice Mint one free soulbound badge. Caller must hold an Agent ID.
    function mint() external {
        if (agentIdRegistry.balanceOf(msg.sender) == 0) revert NotAgentIdHolder();
        if (tokenOf[msg.sender] != 0) revert AlreadyMinted();
        uint256 tokenId = ++nextTokenId;
        tokenOf[msg.sender] = tokenId;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] = 1;
        totalMinted = tokenId;
        emit Transfer(address(0), msg.sender, tokenId);
        emit BadgeMinted(msg.sender, tokenId);
    }

    /// @notice Check in once per UTC day. Consecutive days grow the streak.
    function checkIn() external {
        uint256 tokenId = tokenOf[msg.sender];
        if (tokenId == 0) revert NoBadge();
        uint256 today = block.timestamp / 1 days;
        uint256 last = lastCheckInDay[msg.sender];
        if (last == today) revert AlreadyCheckedInToday();
        if (last != 0 && last == today - 1) {
            streakOf[msg.sender] += 1;
        } else {
            streakOf[msg.sender] = 1;
        }
        lastCheckInDay[msg.sender] = today;
        checkInsOf[msg.sender] += 1;
        totalCheckIns += 1;
        emit CheckedIn(msg.sender, tokenId, streakOf[msg.sender], today);
    }

    // ---- soulbound: transfers & approvals always revert ----
    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert Soulbound();
    }

    function approve(address, uint256) external pure {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) external pure {
        revert Soulbound();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    // ---- metadata ----
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        address holder = _owners[tokenId];
        if (holder == address(0)) revert NonexistentToken();
        string memory svg = string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>",
                "<rect width='400' height='400' fill='#0b0b12'/>",
                "<rect x='14' y='14' width='372' height='372' fill='none' stroke='#f0b90b' stroke-width='4'/>",
                "<text x='200' y='150' font-family='sans-serif' font-size='28' fill='#f0b90b' text-anchor='middle'>AGENT PIONEER</text>",
                "<text x='200' y='210' font-family='sans-serif' font-size='64' fill='#ffffff' text-anchor='middle'>#",
                _toString(tokenId),
                "</text>",
                "<text x='200' y='270' font-family='sans-serif' font-size='22' fill='#8a8a9a' text-anchor='middle'>STREAK ",
                _toString(streakOf[holder]),
                " DAYS</text>",
                "<text x='200' y='310' font-family='sans-serif' font-size='16' fill='#8a8a9a' text-anchor='middle'>Binance Agent ID</text></svg>"
            )
        );
        string memory json = string(
            abi.encodePacked(
                '{"name":"Agent Pioneer Badge #',
                _toString(tokenId),
                '","description":"Soulbound attendance badge for Binance Agent ID holders. Free to mint; streak grows with daily check-ins.",',
                '"attributes":[{"trait_type":"Streak (days)","value":',
                _toString(streakOf[holder]),
                '},{"trait_type":"Total check-ins","value":',
                _toString(checkInsOf[holder]),
                '}],"image":"data:image/svg+xml;base64,',
                _base64(bytes(svg)),
                '"}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", _base64(bytes(json))));
    }

    // ---- helpers ----
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    string internal constant _TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _base64(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = _TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for {
                let i := 0
            } lt(i, mload(data)) {
                i := add(i, 3)
            } {
                let input := mload(add(add(data, 32), i))
                mstore8(resultPtr, mload(add(tablePtr, and(shr(250, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(244, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(238, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(232, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }
            mstore(result, encodedLen)
        }
        return result;
    }
}
