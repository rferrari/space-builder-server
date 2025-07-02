/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";
import {
    DEFAULT_WORKERS_MODEL, JSON_MODEL, WORKERS_TEMP, JSON_TEMP,
    ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY,
    VENICE_BASE_URL, VENICE_API_KEY,
    DEFAULT_VENICE_JSON_MODEL,
    DEFAULT_CHAT_BOT_MODEL
} from "./config";
import FileLogger from "./lib/FileLogger";
import { EventBus } from "./eventBus.interface";
import { BotChatMessage } from "./bot.types";
import {
    PLANING_SYSTEM,
    COMMUNICATING_PROMPT,
    BUILDER_SYSTEM_PROMPT,
    DESIGNER_SYSTEM_PROMPT,
    MAIN_SYSTEM_PROMPT,
    RESEARCHER_SYSTEM
} from "./botPrompts";
// import { imageResearcher } from './lib/ImageWebSearch'; // path where your final image code is

import { Reset, Blue, Green, Red, Cyan, Gray, Yellow } from '../server/lib/colors';
import axios from 'axios';
import * as cheerio from 'cheerio';

import OpenAI from "openai";
import { err } from "neverthrow/dist";
import { escapeBraces, imageResearcher, validateMediaArray } from "./lib/ImageWebSearch";
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
            model: DEFAULT_WORKERS_MODEL,
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
            clientId: state.clientId,
            message: "☕ Preparing coffee..."
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);

        const userQuery = state.userQuery;

        const RESEARCHER_PROMPT = new PromptTemplate({
            template: RESEARCHER_SYSTEM,
            inputVariables: ["userQuery"]
        });

        const filledPrompt = await RESEARCHER_PROMPT.format({
            userQuery: userQuery,
        });


        // 🔍 Text + RSS + video search
        const research = await client.responses.create({
            model: DEFAULT_WORKERS_MODEL || "gpt-4.1",
            tools: [{ type: "web_search_preview" }],
            tool_choice: { type: "web_search_preview" },
            input: filledPrompt
        });

        const jsonMatch = research.output_text.match(/```json\s*([\s\S]*?)\s*```/);
        let baseMedia: any[] = [];

        if (jsonMatch) {
            try {
                const rawMedia = JSON.parse(jsonMatch[1]);
                baseMedia = await validateMediaArray(rawMedia);
            } catch (err) {
                console.error("❌ Failed to parse main media JSON:", err);
            }
        }

        // 🖼️ Now run image researcher
        let imageMedia: any[] = [];
        try {
            const imageResult = await imageResearcher(userQuery);
            imageMedia = imageResult.validMedia.map(item => ({
                type: "image",
                info: item.info,
                url: item.url,
                score: item.score
            }));
        } catch (err) {
            console.error("❌ Image researcher failed:", err);
        }

        // ✅ Combine all media
        console.log("Base Media:", baseMedia);
        console.log("Image Media:", imageMedia);
        const combinedMedia = [...baseMedia, ...imageMedia];
        const mediaJson = JSON.stringify(combinedMedia, null, 2);

        // await this.communicateChanges(state, 
        //     "Researcher",
        //     `searched web for main subject from the user query: "${state.userQuery}"` 
        //     );

        return {
            mediaJson
        };
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
        // await this.communicateChanges(state, "planning will choose your fidgets for: "+state.userQuery);
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

        // await this.communicateChanges(state, 
        //     "Planner",
        //     `finised planing: ${output}`);

        return { plannerOutput: escapeBraces(output) };
    }

    private async designing(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        console.log('-'.repeat(50));
        console.log(`[DESIGNER] Inputs: 
            plannerOutput: ${state.plannerOutput}
            `);

        const GRID_SIZES = {
            columns: 12,
            rows: 10
        }

        const prompt = new PromptTemplate({
            template: DESIGNER_SYSTEM_PROMPT,
            inputVariables: [
                "plan",
                "GRID_SIZES_columns",
                "GRID_SIZES_rows",
                "GRID_SIZES_columns_1",
                "GRID_SIZES_rows_1",
            ]
        });

        const filledPrompt = await prompt.format({
            plan: state.plannerOutput,
            GRID_SIZES_columns: GRID_SIZES.columns,
            GRID_SIZES_rows: GRID_SIZES.rows,
            GRID_SIZES_columns_1: GRID_SIZES.columns - 1,
            GRID_SIZES_rows_1: GRID_SIZES.rows - 1
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
        // this.eventBus.publish("DESIGN_LOGS", logPublish);

        logPublish.message = "🔧 Builder hammering pixels into place..."
        this.eventBus.publish("AGENT_LOGS", logPublish);

        // await this.communicateChanges(state, "Designer",
        //     "finished: " + state.plannerOutput);

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

        let result: any;
        try {
            // using first VENICE
            const jsonModel = new OpenAI({
                apiKey: process.env.VENICE_API_KEY,
                baseURL: process.env.VENICE_BASE_URL
            });

            const modelResult = await jsonModel.chat.completions.create({
                model: DEFAULT_VENICE_JSON_MODEL,
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: filledPrompt,
                    },
                    // {
                    //     role: "user",
                    //     content: "write a simple json example.",
                    // },
                ],
                // @ts-expect-error Venice.ai paramters are unique to Venice.
                venice_parameters: {
                    include_venice_system_prompt: false,
                },
            });

            // console.log(); // Log the result for each model
            result = modelResult.choices[0].message;
            result.content = result.content.replace(/<think>[\s\S]*?<\/think>\n?/g, '');
            result.content = result.content.replace(/```json\n?|```/g, '');
        } catch (error) {
            this.log.error(`[BUILDER.1] Error during building: ${error.message}`, "BUILDER");
            // using fallback claude
            try {
                result = await state.jsonResponseModel.invoke(filledPrompt);
            } catch (error) {
                this.log.error(`[BUILDER.2] Error during building: ${error.message}`, "BUILDER");
                //using second fabllback open ai
                const jsonModel = new ChatOpenAI({
                    modelName: DEFAULT_CHAT_BOT_MODEL || "gpt-4o", // or "gpt-4-turbo"
                    temperature: 0,
                    openAIApiKey: process.env.OPENAI_API_KEY, // your OpenAI key
                    modelKwargs: {
                        response_format: { type: "json_object" } // required for strict JSON output
                    }
                });
                try {
                    result = await jsonModel.invoke(filledPrompt);
                } catch (error) {
                    this.log.error(`[BUILDER.3] Error during building: ${error.message}`, "BUILDER");
                    return undefined
                }
            }
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

        // await this.communicateChanges(state, "Builder",
        //     "Finished: "+state.plannerOutput );

        return { builderOutput: output };
    }

    private async communicating(state: GraphInterface): Promise<Partial<GraphInterface>> {
        return { communicatorOutput: "Done!" };

        // // log the inputs
        // console.log('-'.repeat(50));
        // console.log(`[COMMUNICATOR] Inputs:
        //     User Query: ${state.userQuery}`
        // );

        // const promptTemplate = PromptTemplate.fromTemplate(
        //     COMMUNICATING_PROMPT
        // );

        // const filledPrompt = await promptTemplate.format({
        //     // current_space: state.currentConfig,
        //     // new_space: state.plannerOutput,
        //     userQuery: state.userQuery
        // });

        // const messages = [
        //     { role: "system", content: MAIN_SYSTEM_PROMPT },
        //     { role: "user", content: filledPrompt },
        // ];

        // // const result = await this.chatBotLLM.invoke(messages);
        // const result = await state.model.invoke(messages);
        // const output = result.content.toString();

        // this.log.log("[COMMUNICATOR] Final message:\n", "COMMUNICATOR");
        // this.log.log(output, "COMMUNICATOR");
        // const logPublish = {
        //     name: "COMMUNICATOR",
        //     type: "COMM_LOGS",
        //     clientId: state.clientId, // ensure clientId is preserved
        //     message: output
        // };

        // // this.eventBus.publish("COMM_LOGS", logPublish);
        // return { communicatorOutput: output };
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

        return graphResponse;
    }

    private async communicateChanges(state: GraphInterface, stage: string, changes: string) {
        const promptTemplate = PromptTemplate.fromTemplate(
            COMMUNICATING_PROMPT
        );

        const filledPrompt = await promptTemplate.format({
            userQuery: changes,
            stageName: stage
        });

        const messages = [
            { role: "system", content: MAIN_SYSTEM_PROMPT },
            { role: "user", content: filledPrompt },
        ];

        const result = await state.model.invoke(messages);
        const output = result.content.toString();

        const logPublish = {
            name: "COMMUNICATOR",
            type: "COMM_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };

        this.eventBus.publish("AGENT_LOGS", logPublish);
    }
}
