// import { Cast } from '@neynar/nodejs-sdk/build/neynar-api/v2';
import neynar from "./neynarClient";
import * as botConfig from "../config";
import { BotCastObj, ClankerBotResponse } from '../bot.types';
import { Conversation } from "@neynar/nodejs-sdk/build/api";

export class ClankerBot {
    constructor() {

    }

    isDeployEvent(cast: BotCastObj): boolean {
        return (
            cast.fName === "clanker" && cast.body.text.includes("clanker.world")
        );
    }

    extractContractAddress(castText: string): string | null {
        const contractAddressMatch = castText.match(/0x[a-fA-F0-9]{40}/);
        return contractAddressMatch ? contractAddressMatch[0] : null;
    }

    async fetchDeployerInfo(fid: number) {
        const userResponse = await neynar.fetchBulkUsers({ fids: [fid] });
        return userResponse.users.length ? userResponse.users[0] : null;
    }

    async fetchRelevancyData(deployerFid: number) {
        return await neynar.fetchRelevantFollowers({
            targetFid: deployerFid,
            viewerFid: botConfig.BotFID,
        });
    }

    async getUserRelevancyScore(fid: number) {
        const deployerRelevancyData = await this.fetchRelevancyData(fid);
        return deployerRelevancyData.top_relevant_followers_hydrated.reduce(
            (sum, follower) => sum + (follower.user?.follower_count || 0),
            0
        );
    }

    async getUserLastClankerMentions(fid: number) {
        const { casts } = await neynar.fetchCastsForUser({
            fid,
            viewerFid: botConfig.BotFID,
            limit: 150
        });
        if (!casts.length) {
            return [];
        }

        return casts
            .map((cast) => {
                if (
                    cast.mentioned_profiles.some(
                        (profile) => profile.username === "clanker"
                    )
                ) {
                    return {
                        likes: cast.reactions.likes_count,
                        recasts: cast.reactions.recasts_count,
                        replies: cast.replies.count,
                    };
                }
            })
            .filter((item) => item !== undefined);
    }

    public async processCast(cast: BotCastObj): Promise<ClankerBotResponse> {
        if (!this.isDeployEvent(cast)) {
            throw new Error("ClankerBot: Not a deploy event");
        }

        const contractAddress = this.extractContractAddress(cast.body.text);
        if (!contractAddress) {
            throw new Error("ClankerBot: No contract address found");
        }

        const deployerInfo = await this.fetchDeployerInfo(cast.body.parent.fid);
        if (!deployerInfo) {
            throw new Error("ClankerBot: Deployer not found");
        }

        // Filter 
        // const deployerNeynarScore = deployerInfo.experimental?.neynar_user_score || 0;
        // const deployerFollowers = deployerInfo.follower_count;
        // if (deployerNeynarScore < 0.7 || deployerFollowers < 100) {
        //     throw new Error("ClankerBot: Deployer does not meet requirements");
        // }

        // const prompt = `Generate a fun, creative, and context-aware message that acknowledges the token name and/or symbol, and makes playful use of the user's bio, username, or tone of voice.`;

        const CastConversation = await neynar
            // .lookupCastConversationSummary({
            //     identifier: cast.hash,
            //     limit: botConfig.LAST_CONVERSATION_LIMIT+6,
            //     // prompt,
            // })
            .lookupCastConversation(
                {
                    identifier: cast.hash, 
                    // identifier: '0x2ec1922259ef1a82c0150c605ef5f11fc4dfa1df', //test cast
                    type: 'hash',
                    replyDepth: 2,
                    includeChronologicalParentCasts: true,
                    viewerFid: botConfig.BotFID,
                    limit: botConfig.LAST_CONVERSATION_LIMIT
                    //                 limit: 10,
                    // cursor: "nextPageCursor" // Omit this parameter for the initial request
                }
            )

        // createTokenCast.conversation.cast
        // createTokenCast.conversation.chronological_parent_casts.map({
        //filter only messages from first root username
        // })
        // const historyConversation = this.extractConversationDetails(CastConversation);
        const { historyConversation, imageUrls } = this.extractConversationDetails(CastConversation);
        // console.log(creationTokenCast);

        const result: ClankerBotResponse = {
            historyConversation,
            deployerInfo,
            imageUrls,
            nounspacePage: `https://nounspace.com/t/base/${contractAddress}`,
            thread_hash: CastConversation.conversation.cast.thread_hash,
        }

        return result;

        // console.log(finalMessage);
        // console.log("");

        // const lastMentions = await this.getUserLastClankerMentions(deployerInfo.fid);
        // const clankerInteractionsRelevancy = lastMentions.reduce((sum, mention) => {
        //     if (mention) {
        //         return sum + mention.likes + mention.recasts + mention.replies;
        //     }
        //     return sum;
        // }, 0);

        // const totalRelevancyScore = await this.getUserRelevancyScore(deployerInfo.fid);

        // console.log(lastMentions);

        // const discordMessage = [
        //     "~~                        ~~",
        //     `### ${new Date(cast.timestamp).toLocaleString()}`,
        //     `- [${deployerInfo.username}](<https://warpcast.com/${deployerInfo.username}>)`,
        //     // `- followers: ${deployerFollowers}`,
        //     // `- relevancy: ${totalRelevancyScore}`,
        //     // `- neynar score: ${deployerNeynarScore}`,
        //     `**clanker interactions**`,
        //     // `- relevancy: ${clankerInteractionsRelevancy}`,
        //     // `- quantity: ${lastMentions.length}`,
        //     `[clankerworld](<https://clanker.world/clanker/${contractAddress}>) - [warpcast](<https://warpcast.com/${cast.fName}/${cast.hash}>)`,
        //     `\`\`\`${cast.body.text.split("\n")[0]}\`\`\``,
        // ].join("\n");

    }

    // type ConversationData = {
    //     conversation: {
    //       cast: {
    //         text: string;
    //         author: { username: string };
    //         parent_author: { fid: number };
    //       };
    //     };
    //     chronological_parent_casts: {
    //       author: { username: string };
    //       text: string;
    //       parent_author: { fid: number | null };
    //     }[];
    //   };

    extractConversationDetails(data: any): any {
        const conversation = data.conversation.cast;
        const chronological_parent_casts = data.conversation.chronological_parent_casts;

        // Extract conversation details
        const conversationText = conversation.text.split('\n').slice(0, -3).join('\n');;
        const conversationUsername = conversation.author.username;
        const conversationParentFid = conversation.parent_author?.fid;

        // Filter and map matching chronological parent casts
        const parentCasts = chronological_parent_casts
            .filter(cast => cast.author && cast.author?.fid === conversationParentFid)
            .map(cast => `@${cast.author.username}: ${cast.text}`);

        const imageUrls = chronological_parent_casts
            .filter(cast => cast.author && cast.author?.fid === conversationParentFid)
            .flatMap(cast =>
                cast.embeds?.filter(embed => embed.metadata.content_type.includes("image")) || []
            )
            .map(embed => embed.url);


        // console.log(imageUrls);

        // Add the conversation details
        const conversationDetail = `@${conversationUsername}: ${conversationText}`;

        // Combine parent casts and the conversation detail
        const formattedDetails = [...parentCasts, conversationDetail];

        // Join the formatted details with a newline character
        // return formattedDetails.join('\n');

        return {
            historyConversation: formattedDetails.join('\n'),
            imageUrls
        }
    }



}

