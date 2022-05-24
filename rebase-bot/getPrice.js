const { ethers } = require("ethers");
const settings = require('./settings.json');

// returns floor(the price of the token * 10^18)
async function getPrice(token, pair) {
  const reserves = await pair.getReserves();

  let isToken0 = (await pair.token0()).toLowerCase() == settings.tokenAddress.toLowerCase();

  let baselineSupply = isToken0 ? reserves[1] : reserves[0];
  let coinSupply = await token.balanceOf(settings.pairAddress);

  // There are 9 less decimals in coinSupply than in baselineSupply
  return ethers.BigNumber.from(10).pow(18 - 9).mul(baselineSupply).div(coinSupply);
}

module.exports = getPrice;
