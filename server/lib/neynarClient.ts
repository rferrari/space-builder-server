import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { NEYNAR_API_KEY } from "../config";

const neynarConfig: Configuration = {
  apiKey: NEYNAR_API_KEY,
  baseOptions: {
    headers: {
      "x-neynar-experimental": true,
    },
  },
};

const neynarClient = new NeynarAPIClient(neynarConfig);

export default neynarClient;
