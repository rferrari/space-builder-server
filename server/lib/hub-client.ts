import {
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
  createDefaultMetadataKeyInterceptor,
  ClientOptions,
} from '@farcaster/hub-nodejs'

import { NEYNAR_API_KEY, HUB_RPC, HUB_SSL } from "../config";

// const HUB_RPC = process.env.HUB_RPC
// const HUB_SSL = process.env.HUB_SSL || 'false'

if (!HUB_RPC) {
  throw new Error('HUB_RPC env variable is not set')
}

var hubClientOptions: Partial<ClientOptions> = {};

if (HUB_RPC == 'hub-grpc-api.neynar.com'){
  hubClientOptions= {
    interceptors: [
      createDefaultMetadataKeyInterceptor('x-api-key', NEYNAR_API_KEY),
    ],
  }
}

export const hubClient =
  HUB_SSL === 'true'
    ? getSSLHubRpcClient(HUB_RPC, hubClientOptions)
    : getInsecureHubRpcClient(HUB_RPC)
