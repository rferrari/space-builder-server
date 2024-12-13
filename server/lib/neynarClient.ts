import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { NEYNAR_API_KEY } from "../config";

const neynarConfig = {
    baseOptions: {
      headers: {
        "x-neynar-experimental": true,
      },
    },
  };
  
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY, neynarConfig);

export default neynarClient;
