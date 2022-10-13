const { expect } = require('chai');
const { ethers } = require('hardhat');


describe('RealEstate NFTize', () => {

    let realEstate, escrow
    let deployer, seller, creator, buyer
    let nftID = 1
    let purchasePrice = etherToWei(100)
    let escrowAmout = etherToWei(10);

    before(async () => {

        accounts = await ethers.getSigners()
        deployer = accounts[0]
        seller = accounts[1]
        buyer = accounts[2]
        //creator is the EOA which receives the 30% of sale proceeds
        creator = accounts[3]

        //Load the contracts
        const Escrow = await ethers.getContractFactory('Escrow')
        // NOTE :: below deployment explicitly made as seller so that NFT is minted as seller property
        const RealEstateToken = await ethers.getContractFactory('RealEstateToken', seller)

        //deploy the contracts
        realEstateToken = await RealEstateToken.deploy()
        escrow = await Escrow.deploy(
            realEstateToken.address,
            nftID,
            purchasePrice,
            escrowAmout,
            seller.address,
            creator.address,
        )
    })

    describe('Starting contracts condition, post-deployment', async () => {

        it('RealEstateToken NFT initially Owner by Seller', async () => {
            expect(await realEstateToken.ownerOf(nftID)).to.equal(seller.address)
        })
    })


    describe('NFT Sale', async () => {

        let txn, bal;

        // NOTE :: All preprocessing txns done here
        // 1. Seller puts up contract up for sale by providing approval
        // 2. Buyer for escrow is once the earnest amount is submitted
        before(async () => {
            
            //Corresponding to listing NFT for sale. Seller gives Escropw the authority to transfer NFT
            txn = await realEstateToken.connect(seller).approve(escrow.address, nftID)
            await txn.wait()

            // console.log(escrowAmout);
            txn = await escrow.connect(buyer).depositEarnestAsBuyer({
                value:  escrowAmout
            })
        })

        it('Escrow has approval to transfer NFT', async () => {
            expect(await realEstateToken.getApproved(nftID)).to.equal(escrow.address)
        })

        it('Buyer deposited earnest amount is parked in Escrow', async () => {
            expect(await escrow.getBalance()).to.equal(escrowAmout.toString())
        })

        it("Purchase successful", async () => {
            
            //expects seller to be opwner before the sale 
            expect(await realEstateToken.ownerOf(nftID)).to.equal(seller.address)
            
            //check balance of every user + Contract before
            bal = await escrow.getBalance();
            console.log(`Before - Contract balance : ${ethers.utils.formatEther(bal)}`)
            bal = await ethers.provider.getBalance(creator.address)
            console.log(`Before - Creator balance : ${ethers.utils.formatEther(bal)}`)
            bal = await ethers.provider.getBalance(seller.address)
            console.log(`Before - Seller balance : ${ethers.utils.formatEther(bal)}`)
            bal = await ethers.provider.getBalance(buyer.address)
            console.log(`Before - Buyer balance : ${ethers.utils.formatEther(bal)}`)


            // NOTE :: this is the 1 Transaction which leads to every asset hand change . This transaction would require only signature when done via metamask.
            // NOTE :: earlier depositEarnestAsBuyer done by buyer would also require sigbnature from buyer's wallet but that is just a preprocessong step which we can also omit in case the traditional rules of ESCROW txn does not need to be adhered to.
            txn = await escrow.connect(buyer).submitNFTPurchase({
                value: purchasePrice
            })
            console.log("Buyer submits txn for purchase of NFT ")
            await txn.wait()
            console.log("txn complete...")

            //check balance of every user + Contract before
            bal = await escrow.getBalance();
            console.log(`After - Contract balance : ${ethers.utils.formatEther(bal)}`)
            bal = await ethers.provider.getBalance(creator.address)
            console.log(`After - Creator balance : ${ethers.utils.formatEther(bal)}`)
            bal = await ethers.provider.getBalance(seller.address)
            console.log(`After - Seller balance : ${ethers.utils.formatEther(bal)}`)
            bal = await ethers.provider.getBalance(buyer.address)
            console.log(`After - Buyer balance : ${ethers.utils.formatEther(bal)}`)

            //expect changed ownership of NFT now
            expect(await realEstateToken.ownerOf(nftID)).to.equal(buyer.address)
        })






    })

})

function etherToWei(eth) {
    if (typeof eth === 'string') {
        return ethers.utils.parseEther(eth)
    }
    return ethers.utils.parseEther(eth.toString(10))
}