const { expect } = require("chai");
const { ethers } = require("hardhat");

const toBN = ethers.BigNumber.from;

describe("CustomUFragments", function () {
  const name = "Test Token";
  const symbol = "TEST";

  let CustomUFragmentsFactory;
  let token;

  let userBalance = toBN(10).pow(toBN(9));

  // addresses for testing
  let owner;
  let user;
  let maliciousActor;
  // other unused addresses
  let addrs;

  beforeEach(async function () {
    [owner, user, maliciousActor, ...addrs] = await ethers.getSigners();

    CustomUFragmentsFactory = await ethers.getContractFactory("CustomUFragments", owner);
    
    token = await CustomUFragmentsFactory.deploy(name, symbol);
    await token.deployed();

    await token.connect(owner).transfer(user.address, userBalance);
  });

  it("Should block bad approvals in `transferFrom`", async function () {
    let tx = token.connect(maliciousActor).transferFrom(
      user.address,
      maliciousActor.address,
      
    );
    await expect(tx).to.be.reverted;
  });

  it("Sould allow good approvals in `transferFrom`", async function () {
    let approvalTx = token.connect(owner).approve(
      user.address,
      userBalance
    );
    await approvalTx;

    let transferTx = token.connect(user).transferFrom(
      owner.address,
      user.address,
      userBalance
    );
    await transferTx;

    let newUserBalance = await token.balanceOf(user.address);
    expect(newUserBalance).to.equal(userBalance.mul(toBN(2)));
  });

  it("Should block bad approvals in `transferAllFrom`", async function () {
    let tx = token.connect(maliciousActor).transferAllFrom(
      user.address,
      maliciousActor.address
    );
    await expect(tx).to.be.reverted;
  });

  it("Should block partial approvals in `transferAllFrom`", async function () {
    let approvalTx = token.connect(owner).approve(
      user.address,
      userBalance
    );
    await approvalTx;

    let transferTx = token.connect(user).transferAllFrom(
      owner.address,
      user.address
    );
    await expect(transferTx).to.be.reverted;
  });

  it("Should allow good approvals in `transferAllFrom`", async function () {
    let approvalTx = token.connect(owner).approve(
      user.address,
      await token.balanceOf(owner.address)
    );
    await approvalTx;

    let transferTx = token.connect(user).transferAllFrom(
      owner.address,
      user.address
    );
    await transferTx;

    let newUserBalance = await token.balanceOf(user.address);
    expect(newUserBalance).to.equal(await token.totalSupply());
  });

  it("Should block bad addresses in `setMonetaryPolicy`", async function () {
    let tx = token.connect(maliciousActor).setMonetaryPolicy(maliciousActor.address);
    await expect(tx).to.be.reverted;
  });

  it("Should allow the owner in `setMonetaryPolicy`", async function () {
    let tx = token.connect(owner).setMonetaryPolicy(user.address);
    await tx;
  });

  it("Should scale `totalSupply` after rebasing", async function () {
    let originalSupply = await token.totalSupply();

    // double supply
    let tx = token.connect(owner).rebase(1, originalSupply);
    await tx;

    let newSupply = await token.totalSupply();
    expect(newSupply).to.equal(originalSupply.mul(toBN(2)));
  })

  it("Should scale balances after rebasing", async function () {
    let originalSupply = await token.totalSupply();
    let originalBalance = await token.balanceOf(user.address);

    // double supply
    let tx = token.connect(owner).rebase(1, originalSupply);
    await tx;

    let newBalance = await token.balanceOf(user.address);
    expect(newBalance).to.equal(originalBalance.mul(toBN(2)));
  })

  it("Should not scale approvals after rebasing", async function () {
    let originalSupply = await token.totalSupply();
    let approvalSize = userBalance;

    let approvalTx = token.connect(owner).approve(user.address, approvalSize);
    await approvalTx;

    // double supply
    let rebaseTx = token.connect(owner).rebase(1, originalSupply);
    await rebaseTx;

    let newApprovalSize = await token.allowance(owner.address, user.address);

    expect(newApprovalSize).to.equal(approvalSize);
  });

  it("Should not scale `transferFrom` after rebasing", async function () {
    let originalSupply = await token.totalSupply();
    let approvalSize = userBalance;

    let approvalTx = token.connect(owner).approve(user.address, approvalSize);
    await approvalTx;

    // double supply
    let rebaseTx = token.connect(owner).rebase(1, originalSupply);
    await rebaseTx;

    let newApprovalSize = await token.allowance(owner.address, user.address);

    let transferTx = token.connect(user).transferFrom(owner.address, user.address, newApprovalSize);
    await transferTx;

    let newUserBalance = await token.balanceOf(user.address);

    expect(newUserBalance).to.equal(userBalance.mul(2).add(approvalSize));
  });

  it("Should not scale `transferAllFrom` after rebasing", async function () {
    let originalSupply = await token.totalSupply();
    let approvalSize = await token.balanceOf(owner.address);

    let approvalTx = token.connect(owner).approve(user.address, approvalSize);
    await approvalTx;

    // double supply
    let rebaseTx = token.connect(owner).rebase(1, originalSupply);
    await rebaseTx;

    // should fail because the allowance half of the `owner`'s new balance
    let transferTx = token.connect(user).transferAllFrom(owner.address, user.address);
    await expect(transferTx).to.be.reverted;
  });

  it("Should not scale `increaseAllowance` after rebasing", async function () {
    let originalSupply = await token.totalSupply();
    let approvalSize = userBalance;

    let increaseTx = token.connect(owner).increaseAllowance(user.address, approvalSize);
    await increaseTx;

    // double supply
    let rebaseTx = token.connect(owner).rebase(1, originalSupply);
    await rebaseTx;

    let newApprovalSize = await token.allowance(owner.address, user.address);

    expect(newApprovalSize).to.equal(approvalSize);
  });

  it("Should not scale `decreaseAllowance` after rebasing", async function () {
    let originalSupply = await token.totalSupply();
    let approvalSize = userBalance;
    
    let increaseTx = token.connect(owner).increaseAllowance(user.address, approvalSize);
    await increaseTx;

    // double supply
    let rebaseTx = token.connect(owner).rebase(1, originalSupply);
    await rebaseTx;

    let decreaseTx = token.connect(owner).decreaseAllowance(user.address, approvalSize);
    await decreaseTx;

    let newApprovalSize = await token.allowance(owner.address, user.address);

    // should be equal to `approvalSize` because we double `approvalSize` then decrease by the original
    expect(newApprovalSize).to.equal(toBN(0));
  });
});
