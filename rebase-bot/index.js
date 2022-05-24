const { ethers } = require("ethers");
const getContracts = require("./getContracts.js");
const getPrice = require("./getPrice.js");
const rebaseAndSync = require('./rebaseAndSync.js');
const settings = require('./settings.json');

function exponentialInterpolation(x, x0, x1, y0, y1) {
  let fixedX = Math.min(Math.max(x, x0), x1);
  let normalizedX = (fixedX - x0) / (x1 - x0);
  let y = Math.exp(Math.log(y0) + normalizedX * Math.log(y1 / y0));
  return y;
}

module.exports.handler = async function(event, context, callback) {
  const { token, pair } = await getContracts();

  const toBN = ethers.BigNumber.from;
  const MAX_PRECISION = Math.pow(10, 9);

  const currentPrice = await getPrice(token, pair);
  const multipleOfStart = parseInt(currentPrice.mul(toBN(MAX_PRECISION)).div(toBN(settings.startPrice)).toString()) / MAX_PRECISION;
  const endMultipleOfStart = parseInt(toBN(settings.endPrice).mul(toBN(MAX_PRECISION)).div(toBN(settings.startPrice)).toString()) / MAX_PRECISION;
  const desiredMultipleOfStart = exponentialInterpolation((new Date()).getTime() / 1000, settings.startTimestamp, settings.endTimestamp, 1, endMultipleOfStart);

  const desiredPercentChange = (desiredMultipleOfStart - multipleOfStart) / multipleOfStart;
  const supplyDeltaPercent = 1 / (1 + desiredPercentChange) - 1;
  const currentSupply = toBN(await token.totalSupply());
  const supplyDelta = toBN(Math.floor(supplyDeltaPercent * MAX_PRECISION)).mul(currentSupply).div(toBN(MAX_PRECISION));
  console.log(`Changing supply by ${(supplyDeltaPercent * 100).toFixed(2)}% (price by ${(desiredPercentChange * 100).toFixed(2)}%)`);

  await rebaseAndSync(token, supplyDelta, pair.address);

  callback();
};
