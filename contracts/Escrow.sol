//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Escrow {
    address public nftAddress;
    uint256 public nftID;
    uint256 public purchasePrice;
    uint256 public escrowAmount;

    address payable public seller;
    address payable public buyer;
    address payable public creator;

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Buyer only allowed to transact");
        _;
    }

    //contructor to initialize
    constructor(
        address _nftAddress,
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address payable _seller,
        address payable _creator
    ) {
        nftAddress = _nftAddress;
        nftID = _nftID;
        purchasePrice = _purchasePrice;
        escrowAmount = _escrowAmount;
        seller = _seller;
        creator = _creator;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    //buyer commits to Txn by releasing earnest amount in favor of Escrow
    function depositEarnestAsBuyer() public payable {
        require(
            msg.value >= escrowAmount,
            "insufficient escrow earnest amount"
        );
        buyer = payable(msg.sender);
    }


    function submitNFTPurchase() public payable onlyBuyer {
        bool success;
        require(address(this).balance >= escrowAmount, "Buyer not yet recognized. Earnest amount not found");
        require(msg.value >= purchasePrice, "Insufficient amount");
        
        //transfer 70% of proceeds to seller
        (success, ) = payable(seller).call{value: (7 * purchasePrice)/10 }("");
        require(success);
        
        //transfer 30% of proceeds to creator
        (success, ) = payable(creator).call{value: (3 * purchasePrice)/10 }("");
        require(success);
        
        //revert Buyer with the earnest amount parked in Escrow
        (success, ) = payable(buyer).call{value: address(this).balance}("");
        require(success);
        
        //Transfer ownership of asset
        IERC721(nftAddress).transferFrom(seller, buyer, nftID);
    }
}
