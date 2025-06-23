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
    SINGLE_WORKER_SYSTEM_PROMPT,
    SPACE_DESIGNER_SYSTEM_PROMPT,
    MAIN_SYSTEM_PROMPT
} from "./botPrompts";
// import {  } from "./one-shot-builder-v2";

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
    // current_space?: string;
}

function escapeBraces(str: string): string {
    return str.replace(/{{/g, '{{{{').replace(/}}/g, '}}}}');
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
            currentConfig: null
        };

        this.graph = new StateGraph<GraphInterface>({ channels: graphState })
            .addNode("create_model", this.createModel.bind(this))
            .addNode("create_json_response_model", this.createJsonResponseModel.bind(this))
            .addNode("planning", this.planning.bind(this))
            .addNode("designing", this.designing.bind(this))
            .addNode("building", this.building.bind(this))
            .addNode("communicating", this.communicating.bind(this))
            .addEdge(START, "create_model")
            .addEdge("create_model", "create_json_response_model")
            .addEdge("create_json_response_model", "planning")
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

    private async planning(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        console.log(`\n`+'=--'.repeat(250)+`\n`);
        console.log(`[PLANNER] Inputs: 
            currentConfig: ${state.currentConfig}
            userQuery: ${state.userQuery}
            `);

        const prompt = new PromptTemplate({
            template: PLANING_SYSTEM,
            inputVariables: ["currentConfig", "userQuery"]
        });

        const filledPrompt = await prompt.format({
            currentConfig: state.currentConfig,
            userQuery: state.userQuery
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

        const output = await state.model.invoke(filledPrompt);
        // prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
        //     // const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
        //     currentConfig: state.currentConfig,
        //     userQuery: state.userQuery
        // });

        const result = output.content.toString()

        this.log.log("[PLANNER] Plan generated:", "PLANNER");
        this.log.log(result, "PLANNER");
        const logPublish = {
            name: "Planner",
            type: "PLANNER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: result
        };
        this.eventBus.publish("PLANNER_LOGS", logPublish);
        logPublish.message = "🎨 Designer doodling something radical..."
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { plannerOutput: escapeBraces(result) };
    }

    private async designing(state: GraphInterface): Promise<Partial<GraphInterface>> {
        // log the inputs
        console.log('-'.repeat(50));
        console.log(`[DESIGNER] Inputs: 
            plannerOutput: ${state.plannerOutput}
            `);


        const prompt = new PromptTemplate({
            template: SPACE_DESIGNER_SYSTEM_PROMPT,
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

        this.log.log("[DESIGN] Plan generated:", "PLANNER");
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
            template: SINGLE_WORKER_SYSTEM_PROMPT,
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
            Current Space: ${state.currentConfig}, 
            New Space: ${state.plannerOutput}, 
            User Query: ${state.userQuery}`);

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
            current_space: state.currentConfig,
            new_space: state.plannerOutput,
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
