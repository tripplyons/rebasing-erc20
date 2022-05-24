# Rebasing ERC20

An ERC20 token with an elastic supply, includes a rebase bot

## Note
If you are looking for an easy way to create a basic non-rebasing ERC20 token, check out [EasyERC20](https://easyerc20.com).

If you are looking for someone who can help create a more complex token, you can send me a message on Discord at Skewbed#1836.

## Development Stack

- [Solidity 0.8.10](https://docs.soliditylang.org/en/v0.8.10/)
- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.io/v5/)
- [Waffle](https://getwaffle.io/)
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)

## Details

### Contracts

- CustomUFragments ([contracts/CustomUFragments.sol](contracts/CustomUFragments.sol)) - A rebasing ERC20 token
  - Based on [UFragments](https://github.com/ampleforth/ampleforth-contracts/blob/master/contracts/UFragments.sol)
  - Ported to Solidity 0.8.x

### Tests

- Run `npx hardhat test` to test the contracts

### Rebase Bot

- Written in Node.js
- Uses ethers.js
- Stores settings in [`rebase-bot/settings.json`](rebase-bot/settings.json)
  - Check [`rebase-bot/settings.json.example`](rebase-bot/settings.json.example) for an example
- Code in [`rebase-bot/`](rebase-bot/)
- Set up to run on AWS Lambda
- Can be run locally with `node runLocally.js`

### Features/Roadmap

- [x] CustomUFragments
  - [x] Port UFragments to Solidity 0.8.x
    - [x] ERC20 functions
    - [x] Rebasing functions
  - [x] Write tests
    - [x] Token functionality
    - [x] Rebasing functionality
- [x] Rebase Bot
  - [x] Exponential interpolation
