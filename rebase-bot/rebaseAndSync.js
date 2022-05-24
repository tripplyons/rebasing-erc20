async function rebaseAndSync(token, supplyDelta, pair) {
  let lastEpoch = await token.lastEpoch();

  let tx = await token.rebaseAndSync(lastEpoch.add(1), supplyDelta, pair);
  await tx.wait();
}

module.exports = rebaseAndSync;
