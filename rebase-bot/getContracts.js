const { ethers } = require("ethers");
const settings = require('./settings.json');
const tokenABI = require('./contract-artifacts/CustomUFragments.json').abi;
const pairABI = require('./contract-artifacts/IUniswapV2Pair.json').abi;

async function getContracts() {
  const provider = new ethers.providers.JsonRpcProvider(settings.rpc);
  const signer = new ethers.Wallet(settings.privateKey, provider);
  const token = new ethers.Contract(settings.tokenAddress, tokenABI, signer);
  const pair = new ethers.Contract(settings.pairAddress, pairABI, signer);

  return {token, pair};
}

module.exports = getContracts;
