const hre = require("hardhat");

async function main() {
  const CustomUFragments = await hre.ethers.getContractFactory("CustomUFragments");
  const token = await CustomUFragments.deploy(process.env.TOKEN_NAME, process.env.TOKEN_SYMBOL);

  await token.deployed();

  console.log("CustomUFragments deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
