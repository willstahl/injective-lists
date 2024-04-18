import { Network } from '@injectivelabs/networks'
import {
  TokenType,
  TokenStatic,
  TokenVerification
} from '@injectivelabs/token-metadata'
import splTokens from './data/spl'
import evmTokens from './data/evm'
import {
  mainnetTokens as cw20MainnetTokens,
  devnetTokens as cw20DevnetTokens,
  testnetTokens as cw20TestnetTokens
} from './data/cw20'
import {
  mainnetTokens as erc20MainnetTokens,
  devnetTokens as erc20DevnetTokens,
  testnetTokens as erc20TestnetTokens
} from './data/erc20'
import {
  mainnetTokens as tokenFactoryMainnetTokens,
  devnetTokens as tokenFactoryDevnetTokens,
  testnetTokens as tokenFactoryTestnetTokens
} from './data/tokenFactory'
import {
  mainnetTokens as ibcMainnetTokens,
  testnetTokens as ibcTestnetTokens
} from './data/ibc'
import { symbolMeta } from './data/symbolMeta'
import { untaggedSymbolMeta } from './data/untaggedSymbolMeta'
import { updateJSONFile, getNetworkFileName } from './helper/utils'
import { getCw20TokenMetadata } from './helper/getter'
import {
  IbcTokenSource,
  Cw20TokenSource,
  PeggyTokenSource,
  TokenFactorySource
} from './types'

const INJ_TOKEN = {
  isNative: true,
  ...symbolMeta.INJ,
  denom: 'inj',
  address: 'inj',
  tokenType: TokenType.Native,
  tokenVerification: TokenVerification.Verified
}

const formatIbcTokens = (tokens: IbcTokenSource[]) =>
  tokens.map((token) => ({
    ...token,
    denom: `ibc/${token.hash}`,
    tokenType: TokenType.Ibc
  }))

const formatTokenFactoryTokens = (
  tokens: TokenFactorySource[],
  network: Network
) => {
  return tokens.reduce((list, token) => {
    const denom = `factory/${token.creator}/${token.symbol.toLowerCase()}`

    const existingFactoryToken = getCw20TokenMetadata(denom, network)

    list.push({
      ...token,
      address: existingFactoryToken?.denom || denom,
      denom: existingFactoryToken?.denom || denom,
      tokenType: TokenType.TokenFactory,
      tokenVerification: TokenVerification.Verified
    })

    return list
  }, [] as TokenStatic[])
}

const formatCw20Tokens = (tokens: Cw20TokenSource[], network: Network) => {
  return tokens.reduce((list, token) => {
    list.push({
      ...token,
      address: token.address,
      denom: token.address,
      tokenType: TokenType.Cw20,
      tokenVerification: TokenVerification.Verified
    })

    const existingFactoryToken = getCw20TokenMetadata(
      token.address.toLowerCase(),
      network
    )

    if (existingFactoryToken) {
      list.push({
        ...token,
        denom: existingFactoryToken.denom,
        address: token.address,
        tokenType: TokenType.TokenFactory,
        tokenVerification: TokenVerification.Internal,
        decimals: existingFactoryToken.decimals || token.decimals
      })
    }

    return list
  }, [] as TokenStatic[])
}

const formatSplTokens = (tokens: PeggyTokenSource[]) =>
  tokens.map((token) => ({
    ...token,
    denom: token.address,
    tokenType: TokenType.Spl
  }))

const formatEvmTokens = (tokens: PeggyTokenSource[]) =>
  tokens.map((token) => ({
    ...token,
    denom: token.address,
    tokenType: TokenType.Evm
  }))

const formatErc20Tokens = (tokens: PeggyTokenSource[]) =>
  tokens.map((token) => ({
    ...token,
    denom: `peggy${token.address}`,
    tokenType: TokenType.Erc20
  }))

// perp market base tokens
const untaggedSymbolBaseTokens = () =>
  Object.values(untaggedSymbolMeta).map((meta) => {
    return {
      ...meta,
      tokenType: TokenType.Symbol,
      denom: meta.symbol.toLowerCase(),
      address: meta.symbol.toLowerCase()
    }
  })

const getDevnetStaticTokenList = () => {
  return [
    ...formatEvmTokens(evmTokens),
    ...formatSplTokens(splTokens),
    ...formatIbcTokens([...ibcTestnetTokens, ...ibcMainnetTokens]),
    ...formatCw20Tokens(
      [...cw20DevnetTokens, ...cw20TestnetTokens, ...cw20MainnetTokens],
      Network.Devnet
    ),
    ...formatErc20Tokens([
      ...erc20DevnetTokens,
      ...erc20TestnetTokens,
      ...erc20MainnetTokens
    ]),
    ...formatTokenFactoryTokens(
      [
        ...tokenFactoryDevnetTokens,
        ...tokenFactoryTestnetTokens,
        ...tokenFactoryMainnetTokens
      ],
      Network.Devnet
    )
  ]
}

const getTestnetStaticTokenList = () => {
  return [
    ...formatEvmTokens(evmTokens),
    ...formatSplTokens(splTokens),
    ...formatIbcTokens([...ibcTestnetTokens, ...ibcMainnetTokens]),
    ...formatCw20Tokens(
      [...cw20TestnetTokens, ...cw20DevnetTokens, ...cw20MainnetTokens],
      Network.Testnet
    ),
    ...formatErc20Tokens([
      ...erc20TestnetTokens,
      ...erc20DevnetTokens,
      ...erc20MainnetTokens
    ]),
    ...formatTokenFactoryTokens(
      [
        ...tokenFactoryTestnetTokens,
        ...tokenFactoryDevnetTokens,
        ...tokenFactoryMainnetTokens
      ],
      Network.TestnetSentry
    )
  ]
}

const getMainnetStaticTokenList = () => {
  return [
    ...formatEvmTokens(evmTokens),
    ...formatSplTokens(splTokens),
    ...formatIbcTokens(ibcMainnetTokens),
    ...formatCw20Tokens(
      [...cw20MainnetTokens, ...cw20TestnetTokens],
      Network.MainnetSentry
    ),
    ...formatErc20Tokens(erc20MainnetTokens),
    ...formatTokenFactoryTokens(
      tokenFactoryMainnetTokens,
      Network.MainnetSentry
    )
  ]
}

const generateStaticTokens = async (network: Network) => {
  let list = getDevnetStaticTokenList()

  if (network === Network.Testnet) {
    list = getTestnetStaticTokenList()
  }

  if (network === Network.Mainnet) {
    list = getMainnetStaticTokenList()
  }

  await updateJSONFile(
    `tokens/staticTokens/${getNetworkFileName(network)}.json`,
    [INJ_TOKEN, ...list, ...untaggedSymbolBaseTokens()]
      .map((token) => ({
        address: token.denom,
        isNative: false,
        ...token,
        tokenVerification: TokenVerification.Verified
      }))
      .sort((a, b) => a.denom.localeCompare(b.denom))
  )

  console.log(`✅✅✅ GenerateStaticTokens ${network}`)
}

generateStaticTokens(Network.Devnet)
generateStaticTokens(Network.Testnet)
generateStaticTokens(Network.Mainnet)
