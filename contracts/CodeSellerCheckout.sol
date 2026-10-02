// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Non-custodial checkout. Every successful payment atomically sends
/// 90% to the seller and 10% to the immutable platform recipient.
/// The off-chain store authorizes downloads only for its exact invoice tuple.
contract CodeSellerCheckout {
    address public immutable platform;
    mapping(address => bool) public allowed;
    mapping(bytes32 => bool) public paid;
    bool private entered;
    event Purchase(bytes32 indexed orderId, address indexed buyer, address indexed seller,
        address token, uint256 amount, uint256 sellerAmount, uint256 feeAmount, uint256 deadline);
    constructor(address platform_, address[] memory tokens) {
        require(platform_ != address(0), "zero platform");
        platform = platform_;
        allowed[address(0)] = true;
        for (uint256 i; i < tokens.length; i++) {
            require(tokens[i].code.length > 0, "token has no code");
            allowed[tokens[i]] = true;
        }
    }
    modifier nonReentrant() { require(!entered, "reentrant"); entered = true; _; entered = false; }
    function pay(bytes32 orderId, address seller, address token, uint256 amount, uint256 deadline)
        external payable nonReentrant {
        require(orderId != bytes32(0) && seller != address(0) && seller != address(this), "bad invoice");
        require(block.timestamp <= deadline && amount >= 10, "expired or too small");
        require(allowed[token], "unsupported token");
        bytes32 paymentId = keccak256(abi.encode(msg.sender, orderId));
        require(!paid[paymentId], "already paid");
        paid[paymentId] = true;
        uint256 fee = amount / 10;
        uint256 proceeds = amount - fee;
        if (token == address(0)) {
            require(msg.value == amount, "wrong native amount");
            (bool sellerOk,) = payable(seller).call{value: proceeds}("");
            require(sellerOk, "seller rejected funds");
            (bool feeOk,) = payable(platform).call{value: fee}("");
            require(feeOk, "platform rejected funds");
        } else {
            require(msg.value == 0, "unexpected native payment");
            uint256 beforeBalance = IERC20(token).balanceOf(address(this));
            safeCall(token, abi.encodeWithSignature("transferFrom(address,address,uint256)",msg.sender,address(this),amount));
            require(IERC20(token).balanceOf(address(this)) == beforeBalance + amount, "fee-on-transfer unsupported");
            uint256 sellerBefore = IERC20(token).balanceOf(seller);
            safeCall(token, abi.encodeWithSignature("transfer(address,uint256)",seller,proceeds));
            require(IERC20(token).balanceOf(seller) == sellerBefore + proceeds, "seller underpaid");
            uint256 platformBefore = IERC20(token).balanceOf(platform);
            safeCall(token, abi.encodeWithSignature("transfer(address,uint256)",platform,fee));
            require(IERC20(token).balanceOf(platform) == platformBefore + fee, "platform underpaid");
            require(IERC20(token).balanceOf(address(this)) == beforeBalance, "unexpected residual");
        }
        emit Purchase(orderId,msg.sender,seller,token,amount,proceeds,fee,deadline);
    }
    function safeCall(address token, bytes memory data) private {
        (bool ok, bytes memory result) = token.call(data);
        require(ok && (result.length == 0 || (result.length == 32 && abi.decode(result,(bool)))),"token transfer failed");
    }
    receive() external payable { revert("use pay"); }
}
