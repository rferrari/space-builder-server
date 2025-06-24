/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";
import { WORKERS_MODEL, JSON_MODEL, WORKERS_TEMP, JSON_TEMP, ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY } from "./config";
import FileLogger from "./lib/FileLogger";
import { EventBus } from "./eventBus.interface";
import { BotChatMessage } from "./bot.types";
import {
    PLANING_SYSTEM,
    COMMUNICATING_PROMPT,
    BUILDER_SYSTEM_PROMPT,
    DESIGNER_SYSTEM_PROMPT,
    MAIN_SYSTEM_PROMPT
} from "./botPrompts";
// import {  } from "./one-shot-builder-v2";

import OpenAI from "openai";
const client = new OpenAI();

type Annotation = {
    type: string;
    title: string;
    url: string;
};


export interface GraphInterface {
    currentConfig: any;
    clientId: number;
    model: ChatOpenAI;
    jsonResponseModel: ChatOpenAI;
    userQuery: string;
    conversationHistory: string;
    plannerOutput: string;
    designerOutput: string;
    builderOutput: string;
    communicatorOutput: string;
    mediaJson: any;
}

function escapeBraces(str: string): string {
    return str.replace(/{{/g, '{{{{').replace(/}}/g, '}}}}');
}

const isValidRss = async (url: string): Promise<boolean> => {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        const type = res.headers.get('content-type') || "";
        return type.includes("application/rss+xml") || type.includes("application/xml") || type.includes("text/xml");
    } catch {
        return false;
    }
};

const isValidImage = async (url: string): Promise<boolean> => {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        const type = res.headers.get('content-type') || "";
        return type.startsWith("image/"); // allows png, jpeg, etc.
    } catch {
        return false;
    }
};


const validateMediaArray = async (mediaArray: any[]) => {
    const validated = [];

    for (const item of mediaArray) {
        if (item.type === "rss" && await isValidRss(item.url)) {
            validated.push(item);
        }
        if (item.type === "image" && await isValidImage(item.url)) {
            validated.push(item);
        }
        if (item.type === "video" || item.type === "social") {
            validated.push(item); // optionally add further checks
        }
    }

    return validated;
};


export class WorkersSystem {
    private graph: StateGraph<GraphInterface> | null = null;
    private ragApp: CompiledStateGraph<GraphInterface, Partial<GraphInterface>, "__start__", StateDefinition, StateDefinition, StateDefinition> | null = null;
    private log: FileLogger;
    private eventBus: EventBus;
    // private wsClientId: number;

    constructor(eventBus: EventBus, clientId: number) {
        this.log = new FileLogger({ folder: './logs', printconsole: true, logtofile: true });
        this.eventBus = eventBus;
        // this.wsClientId = clientId;
        this.initializeGraph();
    }

    private initializeGraph() {
        const graphState = {
            userQuery: null,
            clientId: null,
            conversationHistory: null,
            plannerOutput: null,
            designerOutput: null,
            builderOutput: null,
            communicatorOutput: null,
            model: null,
            jsonResponseModel: null,
            currentConfig: null,
            mediaJson: null,
        };

        this.graph = new StateGraph<GraphInterface>({ channels: graphState })
            .addNode("create_model", this.createModel.bind(this))
            .addNode("create_json_response_model", this.createJsonResponseModel.bind(this))
            .addNode("researcher", this.researcher.bind(this))
            .addNode("planning", this.planning.bind(this))
            .addNode("designing", this.designing.bind(this))
            .addNode("building", this.building.bind(this))
            .addNode("communicating", this.communicating.bind(this))
            .addEdge(START, "create_model")
            .addEdge("create_model", "create_json_response_model")
            .addEdge("create_json_response_model", "researcher")
            .addEdge("researcher", "planning")
            .addEdge("planning", "designing")
            .addEdge("designing", "building")
            .addEdge("building", "communicating")
            .addEdge("communicating", END) as StateGraph<GraphInterface>;

        this.ragApp = this.graph.compile({ checkpointer: new MemorySaver() });
    }

    private async createModel(): Promise<Partial<GraphInterface>> {
        const model = new ChatOpenAI({
            model: WORKERS_MODEL,
            temperature: WORKERS_TEMP,
            apiKey: process.env.OPENAI_API_KEY as string
        });
        return { model };
    }

    private async createJsonResponseModel(state: GraphInterface) {
        const jsonModel = new ChatOpenAI({
            model: JSON_MODEL,
            temperature: JSON_TEMP,
            apiKey: ANTHROPIC_API_KEY as string,
            configuration: {
                baseURL: ANTHROPIC_BASE_URL
            },
            modelKwargs: {
                response_format: { type: "json_object" }
            }
        });

        return {
            jsonResponseModel: jsonModel
        };
    }

    private async researcher(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const logPublish = {
            name: "Researcher",
            type: "PLANNER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: ""
        }
        logPublish.message = "☕ Preparing coffee..."
        this.eventBus.publish("AGENT_LOGS", logPublish);

        const research = await client.responses.create({
            model: "gpt-4.1",
            tools: [{ type: "web_search_preview" }],
            tool_choice: { type: "web_search_preview" },
            // input: `Search the web for websites links, images url, and videos related to: "${state.userQuery}"`,
            // input: ``,

            input: `
Search the web and return a JSON array of valid, direct links related to main subject from user query: "${state.userQuery}".

item in the array must include:
- "type": one of "information", "image", "video", "rss", or "social"
- "info": a short descriptive
- "url": the direct, valid link

Strict rules:
- "information": summary of information about main subject on user query
- "video": only include direct links ending in .mp4 or full YouTube video URLs (not playlist pages or channels)
- "social": only include public profile URLs from Twitter
- "image":
    - Give priority to cdn.pexels.com, images.pexels.com
    - Must be a direct link ending in .jpg, .jpeg, or .png
    - Must contain the subject in the filename
- "rss": give priority to https://cointelegraph.com/rss/tag/<coins> feeds. ONLY include if:
    - URL ends with '.xml' or includes '/feed'
    - AND it returns Content-Type: application/rss+xml, application/xml, or text/xml
    - If the RSS URL returns HTML or is not verifiable, skip it
    - for example, https://solana.com/news/rss.xml looks valid, but is not. choose another

Important:
- Do not include links to image search sites (e.g., Unsplash, Pixabay, Getty)
- Do not include general websites or pages that don't directly serve media
- Do not include portals or download pages pretending to be image links
- Do not include links unless they end with the correct file extension (for images or videos)

Return only a valid JSON array inside a \`\`\`json code block. Do not include any text or explanation outside the JSON.
`

            // Do not return:
            // - Search portals (e.g., Unsplash search pages, image collections)
            // - General websites or homepages
            // - Any links that require further navigation to access media or feeds

        });

        // const results = research.tool_outputs?.[0]?.output?.results || [];
        // const links = results.map(item => ({
        //     title: item.title,
        //     url: item.url,
        //     image: item.image_url || item.thumbnail || null,
        //     video: item.video_url || (item.url?.includes("youtube.com") || item.url?.includes("vimeo.com") ? item.url : null),
        // }));
        // console.log(links);

        const jsonMatch = research.output_text.match(/```json\s*([\s\S]*?)\s*```/);
        let mediaJson = "[]";

        if (jsonMatch) {
            try {
                const mediaArray = JSON.parse(jsonMatch[1]);
                const validatedMediaArray = await validateMediaArray(mediaArray); // ✅ await it
                mediaJson = JSON.stringify(validatedMediaArray, null, 2); // ✅ use the cleaned array
                // mediaJson = JSON.stringify(mediaArray, null, 2);
            } catch (err) {
                console.error("Failed to parse media JSON:", err);
            }
        }

        // const jsonMatch = research.output_text.match(/```json\s*([\s\S]*?)\s*```/);
        // if (!jsonMatch) {
        //     console.error("No JSON block found.");
        // } else {
        //     try {
        //         const mediaArray = JSON.parse(jsonMatch[1]);
        //         console.log(mediaArray); // ready to use!
        return {
            mediaJson
        }
        //     } catch (err) {
        //         console.error("Failed to parse JSON:", err);
        //         return {
        //             mediaArray: null
        //         }
        //     }
        // }
        // const researchResult = research.output_text;
        // console.dir(extractedLinks)

        // const researchResult = research.;
        // tool_choice parameter, and setting it to 

    }

    private async planning(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        const msgPublish = {
            name: "Researcher",
            type: "PLANNER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: ""
        }
        msgPublish.message = "🔎 searching web..."
        this.eventBus.publish("AGENT_LOGS", msgPublish);

        console.log(`\n` + '=--'.repeat(250) + `\n`);
        console.log(`[PLANNER] Inputs: 
            currentConfig: ${state.currentConfig}
            userQuery: ${state.userQuery}
            mediaJson: ${state.mediaJson}
            `);

        const prompt = new PromptTemplate({
            template: PLANING_SYSTEM,
            inputVariables: ["currentConfig", "userQuery", "mediaJson"]
        });

        const filledPrompt = await prompt.format({
            currentConfig: state.currentConfig,
            userQuery: state.userQuery,
            mediaJson: state.mediaJson
        });

        console.log(`
            [PLANNER PROMPT]:
            ${filledPrompt}`
        );


        // const messages = [
        //     { role: "system", content: botPrompts.SHOULDRESPOND_SYSTEM },
        //     { role: "user", content: filledPrompt },
        // ];

        // const result = await this.chatBotLLM.invoke(messages);

        // console.log(filledPrompt);


        const result = await state.model.invoke(filledPrompt);
        prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
            // const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
            currentConfig: state.currentConfig,
            userQuery: state.userQuery,
            mediaJson: state.mediaJson
        });

        const output = result.content.toString()

        this.log.log("[PLANNER] Plan generated:", "PLANNER");
        this.log.log(output, "PLANNER");
        const logPublish = {
            name: "Planner",
            type: "PLANNER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("PLANNER_LOGS", logPublish);
        logPublish.message = "🎨 Designer doodling something radical..."
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { plannerOutput: escapeBraces(output) };
    }

    private async designing(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        console.log('-'.repeat(50));
        console.log(`[DESIGNER] Inputs: 
            plannerOutput: ${state.plannerOutput}
            `);


        const prompt = new PromptTemplate({
            template: DESIGNER_SYSTEM_PROMPT,
            inputVariables: ["plan"]
        });

        const filledPrompt = await prompt.format({
            plan: state.plannerOutput,
        });


        console.log(`
            [DESIGNER PROMPT]:
            ${filledPrompt}`
        );


        const result = await state.model.invoke(filledPrompt);
        const output = result.content.toString()

        // const output = await prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
        //     plan: state.plannerOutput
        // });

        this.log.log("[DESIGN] Plan generated:", "DESIGN");
        this.log.log(output, "DESIGN");
        const logPublish = {
            name: "DESIGNER",
            type: "DESIGNER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("DESIGN_LOGS", logPublish);

        logPublish.message = "🔧 Builder hammering pixels into place..."
        this.eventBus.publish("AGENT_LOGS", logPublish);

        return { designerOutput: escapeBraces(output) };
    }


    private async building(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        console.log('-'.repeat(50));
        console.log(`[BUILDER] Inputs: 
            plannerOutput: ${state.plannerOutput}, 
            designerOutput: ${state.designerOutput}`);

        const prompt = new PromptTemplate({
            template: BUILDER_SYSTEM_PROMPT,
            inputVariables: [
                "plan",
                "designer",
            ]
        });

        const filledPrompt = await prompt.format({
            plan: state.plannerOutput,
            designer: state.designerOutput,
        });

        console.log(`
            [BUILDER PROMPT]:
            ${filledPrompt}`
        );

        let result;
        try {
            result = await state.jsonResponseModel.invoke(filledPrompt);
        } catch (error) {
            this.log.log(`[BUILDER] Error during building: ${error.message}`, "BUILDER");
            throw error; // Re-throw the error after logging
        }
        const output = result.content.toString()

        // const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
        //     plan: state.plannerOutput,
        //     designer: state.designerOutput,
        // });


        this.log.log("[BUILDER] JSON generated:", "BUILDER");
        this.log.log(output, "BUILDER");
        let logPublish = {
            name: "BUILDER",
            type: "BUILDER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);

        // logPublish.message = "🕵️ Checking what changed behind the curtains..."
        // this.eventBus.publish("AGENT_LOGS", logPublish);

        // this.log.log("[BUILDER] JSON generated:", "BUILDER");
        // this.log.log(output, "BUILDER");
        // const logPublish = {
        //     name: "BUILDER",
        //     type: "BUILDER_LOGS",
        //     clientId: state.clientId, // ensure clientId is preserved
        //     message: output
        // };
        // this.eventBus.publish("AGENT_LOGS", logPublish);

        // logPublish.message = "🕵️ Checking what changed behind the curtains..."
        // this.eventBus.publish("AGENT_LOGS", logPublish);

        return { builderOutput: output };
    }

    // private async verify(state: GraphInterface): Promise<Partial<GraphInterface>> {
    //     // log the inputs
    //     console.log('-'.repeat(50));
    //     console.log(`[VERIFY] Inputs:
    //         designerOutput: ${state.designerOutput}, 
    //         builderOutput: ${state.builderOutput}`);

    //     const prompt = new PromptTemplate({
    //         template: VERIFY_SYSTEM,
    //         inputVariables: [
    //             // "current_space",
    //             "designerOutput",
    //             "builderOutput"]
    //     });


    //     const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
    //         builderOutput: state.builderOutput,
    //         designerOutput: state.designerOutput
    //     });

    //     try {
    //         const parsed = JSON.parse(output);
    //         const match = parsed?.match?.toUpperCase?.();
    //         const jsonfixed = parsed?.jsonfixed || null;

    //         if (match === "YES") return { builderOutput: state.builderOutput };
    //         if (match === "NO") return { builderOutput: jsonfixed };
    //     } catch (e) {
    //         return {builderOutput: state.builderOutput}
    //     }


    //     // this.log.log("[VERIFY] Final message:\n", "VERIFY");
    //     // this.log.log(output, "VERIFY");
    //     // const logPublish = {
    //     //     name: "VERIFY",
    //     //     type: "COMM_LOGS",
    //     //     clientId: state.clientId, // ensure clientId is preserved
    //     //     message: output
    //     // };
    //     // this.eventBus.publish("COMM_LOGS", logPublish);

    //     // return { builderOutput: output };
    // }

    private async communicating(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        console.log('-'.repeat(50));
        console.log(`[COMMUNICATOR] Inputs:
            User Query: ${state.userQuery}`
        );

        // const prompt = new PromptTemplate({
        //     template: COMMUNICATING_PROMPT,
        //     inputVariables: [
        //         "current_space",
        //         "new_space",
        //         "userQuery"]
        // });

        const promptTemplate = PromptTemplate.fromTemplate(
            COMMUNICATING_PROMPT
        );

        const filledPrompt = await promptTemplate.format({
            // current_space: state.currentConfig,
            // new_space: state.plannerOutput,
            userQuery: state.userQuery
        });

        const messages = [
            { role: "system", content: MAIN_SYSTEM_PROMPT },
            { role: "user", content: filledPrompt },
        ];

        // const result = await this.chatBotLLM.invoke(messages);
        const result = await state.model.invoke(messages);
        const output = result.content.toString();

        this.log.log("[COMMUNICATOR] Final message:\n", "COMMUNICATOR");
        this.log.log(output, "COMMUNICATOR");
        const logPublish = {
            name: "COMMUNICATOR",
            type: "COMM_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("COMM_LOGS", logPublish);

        return { communicatorOutput: output };
    }


    public async invokeWorkers(inputQuery: BotChatMessage, conversationHistory: string) {
        if (!this.ragApp) {
            console.error("RAG app is not initialized");
            return "";
        }

        const graphResponse = await this.ragApp.invoke({
            userQuery: inputQuery.message,
            conversationHistory,
            current_space: inputQuery.spaceContext || "",
            clientId: inputQuery.clientId
        },
            { configurable: { thread_id: inputQuery.name + "_thread" } }
        );

        // this.tokenRateLimiter.printTokensUsedPerMinute();
        return graphResponse;
    }
}
