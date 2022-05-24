//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Pair {
  // the only function we need to call
  // called during rebase to prevent skimming
  function sync() external;
}

// based on https://github.com/ampleforth/ampleforth-contracts/blob/master/contracts/UFragments.sol
contract CustomUFragments is ERC20, Ownable {
  // called whenever the token rebases
  event LogRebase(uint256 indexed epoch, uint256 totalSupply);
  // called whenever the address of the rebaser changes
  event LogMonetaryPolicyUpdated(address monetaryPolicy);

  // the address of the rebaser
  address public monetaryPolicy;

  // used to identify each rebase event
  uint256 public lastEpoch = 0;

  // rebasing permissions
  modifier onlyMonetaryPolicy() {
    require(msg.sender == monetaryPolicy);
    _;
  }

  // safety checks
  modifier validRecipient(address to) {
    require(to != address(0x0));
    require(to != address(this));
    _;
  }

  // constants
  uint256 private constant DECIMALS = 9;
  uint256 private constant MAX_UINT256 = type(uint256).max;
  uint256 private constant INITIAL_FRAGMENTS_SUPPLY = 50 * 10**6 * 10**DECIMALS;
  uint256 private constant TOTAL_GONS = MAX_UINT256 - (MAX_UINT256 % INITIAL_FRAGMENTS_SUPPLY);
  uint256 private constant MAX_SUPPLY = type(uint128).max;

  // internal state and balances
  uint256 private _totalSupply;
  uint256 private _gonsPerFragment;
  mapping(address => uint256) private _gonBalances;

  // approvals do not scale with rebase events
  mapping(address => mapping(address => uint256)) private _allowedFragments;

  // gives initial supply to sender
  // gives the sender rebase permissions
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
    _totalSupply = INITIAL_FRAGMENTS_SUPPLY;
    _gonBalances[_msgSender()] = TOTAL_GONS;
    _gonsPerFragment = TOTAL_GONS / _totalSupply;

    monetaryPolicy = _msgSender();

    emit Transfer(address(0x0), _msgSender(), _totalSupply);
  }

  // update the rebaser
  function setMonetaryPolicy(address monetaryPolicy_) external onlyOwner {
    monetaryPolicy = monetaryPolicy_;
    emit LogMonetaryPolicyUpdated(monetaryPolicy_);
  }

  // trigger a rebase
  function rebase(uint256 epoch, int256 supplyDelta) public onlyMonetaryPolicy returns (uint256) {
    lastEpoch = epoch;

    if (supplyDelta == 0) {
      emit LogRebase(epoch, _totalSupply);
      return _totalSupply;
    }

    if (supplyDelta < 0) {
      _totalSupply -= uint256(-supplyDelta);
    } else {
      _totalSupply += uint256(supplyDelta);
    }

    if (_totalSupply > MAX_SUPPLY) {
      _totalSupply = MAX_SUPPLY;
    }

    _gonsPerFragment = TOTAL_GONS / _totalSupply;

    emit LogRebase(epoch, _totalSupply);
    return _totalSupply;
  }

  // trigger a rebase and sync the pair in the same transaction to prevent skimming
  function rebaseAndSync(uint256 epoch, int256 supplyDelta, address pair) external onlyMonetaryPolicy {
    rebase(epoch, supplyDelta);
    IUniswapV2Pair(pair).sync();
  }

  // get scaled supply
  function totalSupply() public view override returns (uint256) {
    return _totalSupply;
  }

  // get scaled balance
  function balanceOf(address who) public view override returns (uint256) {
    return _gonBalances[who] / _gonsPerFragment;
  }

  // get unscaled supply
  function scaledTotalSupply() external pure returns (uint256) {
    return TOTAL_GONS;
  }
  
  // get unscaled balance
  function scaledBalanceOf(address who) external view returns (uint256) {
    return _gonBalances[who];
  }

  // uses scaled amount
  function transfer(address to, uint256 value) public override validRecipient(to) returns (bool) {
    uint256 gonValue = value * _gonsPerFragment;

    _gonBalances[msg.sender] -= gonValue;
    _gonBalances[to] += gonValue;

    emit Transfer(msg.sender, to, value);
    return true;
  }

  // transfers all balance, including amounts less than 1 after scaling
  function transferAll(address to) external validRecipient(to) returns (bool) {
    uint256 gonValue = _gonBalances[msg.sender];
    uint256 value = gonValue / _gonsPerFragment;

    delete _gonBalances[msg.sender];
    _gonBalances[to] += gonValue;

    emit Transfer(msg.sender, to, value);
    return true;
  }

  // does not scale with rebase events
  function allowance(address owner_, address spender) public view override returns (uint256) {
    return _allowedFragments[owner_][spender];
  }

  // does not scale with rebase events
  function transferFrom(address from, address to, uint256 value) public override validRecipient(to) returns (bool) {
    _allowedFragments[from][msg.sender] -= value;

    uint256 gonValue = value * _gonsPerFragment;
    _gonBalances[from] -= gonValue;
    _gonBalances[to] += gonValue;

    emit Transfer(from, to, value);
    return true;
  }

  // similar to transferAll, but for allowances
  function transferAllFrom(address from, address to) external validRecipient(to) returns (bool) {
    uint256 gonValue = _gonBalances[from];
    uint256 value = gonValue / _gonsPerFragment;

    _allowedFragments[from][msg.sender] -= value;

    delete _gonBalances[from];
    _gonBalances[to] += gonValue;

    emit Transfer(from, to, value);
    return true;
  }

  // does not scale with rebase events
  function approve(address spender, uint256 value) public override returns (bool) {
    _allowedFragments[msg.sender][spender] = value;

    emit Approval(msg.sender, spender, value);
    return true;
  }

  // useful to prevent frontrunning of approvals
  function increaseAllowance(address spender, uint256 addedValue) public override returns (bool) {
    _allowedFragments[msg.sender][spender] += addedValue;

    emit Approval(msg.sender, spender, _allowedFragments[msg.sender][spender]);
    return true;
  }

  // useful to prevent frontrunning of approvals
  function decreaseAllowance(address spender, uint256 subtractedValue) public override returns (bool) {
    uint256 oldValue = _allowedFragments[msg.sender][spender];
    _allowedFragments[msg.sender][spender] = (subtractedValue >= oldValue)
        ? 0
        : oldValue - subtractedValue;

    emit Approval(msg.sender, spender, _allowedFragments[msg.sender][spender]);
    return true;
  }

  // get decimals to display
  function decimals() public pure override returns (uint8) {
    return uint8(DECIMALS);
  }
}
