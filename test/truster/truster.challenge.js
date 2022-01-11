const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, attacker;

    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableToken = await ethers.getContractFactory('DamnValuableToken', deployer);
        const TrusterLenderPool = await ethers.getContractFactory('TrusterLenderPool', deployer);

        this.token = await DamnValuableToken.deploy();
        this.pool = await TrusterLenderPool.deploy(this.token.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal('0');
    });

    it('Exploit', async function () {
        /*
         * Explanation:
         * 
         * The pool allows the user to borrow an arbitrary ammount of tokens
         * and then make a function call to a target contract. After the
         * function call, the contract expects the balance to be greater or
         * equal to the initial balance, otherwise, the transaction is
         * reverted.
         * 
         * As specified in the ERC-20 standard, allowance can be
         * given to spend an amount of tokens in behalf of the owner. This can
         * be used by the attacker to use the arbitrary call to allow the
         * attacker to transfer the tokens, and after the loan has been paid
         * back (so the contract does not revert the transaction), the attacker
         * can transfer the tokens from the contract to themselves.
         * 
         */

        const ExploitFactory = await ethers.getContractFactory('TrusterExploit', attacker);
        await ExploitFactory.deploy(this.pool.address);
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal('0');
    });
});

