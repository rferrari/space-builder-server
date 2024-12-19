export type VerificationProtocol = "ethereum" | "solana";
export type Fid = number;
export type Hex = `0x${string}`;

interface BotChatMessage {
    name: string;
    message: string;
    imageUrl?: string;
}

// export type CastIdJson = {
//     fid: Fid;
//     hash: Hex;
// };

type CastIdJson = {
    fid: number;
    hash: `0x${string}`;
};


export type CastAddBodyJson = {
    text: string;
    textWithMentions?: string;
    embeds?: any[];
    mentions?: number[];
    mentionsPositions?: number[];
    parent?: CastIdJson;
    type: CastType;
};

export type CastRemoveBodyJson = {
    targetHash: string;
};

export type ReactionBodyJson = {
    type: ReactionType;
    target: CastIdJson | string;
};

export type LinkBodyJson = {
    type: string;
    /** original timestamp in Unix ms */
    displayTimestamp?: number;
    targetFid?: number;
    targetFids?: number[];
};

export type VerificationAddEthAddressBodyJson = {
    address: string;
    claimSignature: string;
    blockHash: string;
    protocol: string;
};

export type VerificationRemoveBodyJson = {
    address: string;
};

export type SignerAddBodyJson = {
    signer: string;
    name: string;
};

export type SignerRemoveBodyJson = {
    signer: string;
};

export type UserDataBodyJson = {
    type: UserDataType;
    value: string;
};

export type UsernameProofBodyJson = {
    timestamp: number;
    name: string;
    owner: string;
    signature: string;
    fid: number;
    type: UserNameType;
};

export type MessageBodyJson =
    | CastAddBodyJson
    | CastRemoveBodyJson
    | ReactionBodyJson
    | LinkBodyJson
    | VerificationAddEthAddressBodyJson
    | VerificationRemoveBodyJson
    | SignerAddBodyJson
    | SignerRemoveBodyJson
    | UserDataBodyJson
    | UsernameProofBodyJson;

export type BotCastObj = {
    fid: number;
    fName: string;
    hash: string;
    type: MessageType;
    timestamp: Date;
    body: CastAddBodyJson;
};

export type ClankerBotResponse = {
    historyConversation: Conversation,
    deployerInfo: any
    imageUrls: any,
    nounspacePage: string,
    thread_hash,
}