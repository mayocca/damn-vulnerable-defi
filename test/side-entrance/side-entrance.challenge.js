const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Side entrance', function () {

    let deployer, attacker;

    const ETHER_IN_POOL = ethers.utils.parseEther('1000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const SideEntranceLenderPoolFactory = await ethers.getContractFactory('SideEntranceLenderPool', deployer);
        this.pool = await SideEntranceLenderPoolFactory.deploy();
        
        await this.pool.deposit({ value: ETHER_IN_POOL });

        this.attackerInitialEthBalance = await ethers.provider.getBalance(attacker.address);

        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.equal(ETHER_IN_POOL);
    });

    it('Exploit', async function () {
        /*
         * Explanation:
         * 
         * This pool keeps track of the ether deposited by each account via the
         * `deposit` function. Its intended use is to allow each account to
         * withdraw no more than the original amount of ether they deposited.
         * 
         * A malicious actor can borrow all the ether in the pool, and then
         * deposit it back into the same pool, which in turn successfully
         * passes the last check, the one which would revert the transaction if
         * the ether was not returned. Even though the initial balance in the
         * pool is the same, the sum of the balances "deposited" by each
         * account is greater than the actual pool balance, with the attacker
         * being able to withdraw the total amount of ether that was borrowed
         * and deposited again in the pool. 
         * 
         * A contract can be made to exploit this in two transactions. First
         * one to deploy the contract, and the second one to execute the actual
         * exploit. Since the contract functions cannot be called externally
         * until after the initial deployment, a "helper" contract can be made
         * which runs the actual exploit. The initial contract deploys the
         * helper contract, and in the same transaction, executes the flash
         * loan against the helper contract.
         * 
         * This solution employed the second method to deploy and execute the
         * exploit contract(s) in only one transaction.
         * 
         */
        const ExploitFactory = await ethers.getContractFactory('SideEntranceExploit', attacker);
        await ExploitFactory.deploy(this.pool.address);
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.be.equal('0');
        
        // Not checking exactly how much is the final balance of the attacker,
        // because it'll depend on how much gas the attacker spends in the attack
        // If there were no gas costs, it would be balance before attack + ETHER_IN_POOL
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.be.gt(this.attackerInitialEthBalance);
    });
});
