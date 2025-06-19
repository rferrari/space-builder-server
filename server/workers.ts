/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";
import { RAGLLMModel, JSONLLMModel } from "./config";
import FileLogger from "./lib/FileLogger";
import { EventBus } from "./eventBus.interface";
import { BotChatMessage } from "./bot.types";
import { PLANING_SYSTEM, COMMUNICATING_SYSTEM } from "./botPrompts";
import { SINGLE_WORKER_SYSTEM_PROMPT } from "./one-shot-builder-v2";

export interface GraphInterface {
    currentConfig: any;
    clientId: number;
    model: ChatOpenAI;
    jsonResponseModel: ChatOpenAI;
    userQuery: string;
    conversationHistory: string;
    plannerOutput?: string;
    builderOutput?: string;
    communicatorOutput?: string;
    current_space?: string;
}

export class WorkersSystem {
    private graph: StateGraph<GraphInterface> | null = null;
    private ragApp: CompiledStateGraph<GraphInterface, Partial<GraphInterface>, "__start__", StateDefinition, StateDefinition, StateDefinition> | null = null;
    private log: FileLogger;
    private eventBus: EventBus;
    // private wsClientId: number;

    constructor(eventBus: EventBus, clientId: number) {
        this.log = new FileLogger({ folder: './logs', printconsole: true });
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
            .addNode("building", this.building.bind(this))
            .addNode("communicating", this.communicating.bind(this))
            // .addNode("return_results", this.returnResults.bind(this))
            .addEdge(START, "create_model")
            .addEdge("create_model", "create_json_response_model")
            .addEdge("create_json_response_model", "planning")
            .addEdge("planning", "building")
            .addEdge("building", "communicating")
            // .addEdge("communicating", "return_results")
            // .addEdge("return_results", END) as StateGraph<GraphInterface>;
            // .addEdge("planning", "communicating")
            .addEdge("communicating", END) as StateGraph<GraphInterface>;


        this.ragApp = this.graph.compile({ checkpointer: new MemorySaver() });
    }

    private async createModel(): Promise<Partial<GraphInterface>> {
        const model = new ChatOpenAI({
            model: RAGLLMModel,
            temperature: 0.2,
            apiKey: process.env.OPENAI_API_KEY as string
        });
        return { model };
    }

    private async createJsonResponseModel(state: GraphInterface) {
        const jsonModel = new ChatOpenAI({
            model: JSONLLMModel,
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY as string,
            modelKwargs: {
                response_format: { type: "json_object" }
            }
        });


        // jsonModel.bindTools()

        return {
            jsonResponseModel: jsonModel
        };
    }

    private async planning(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const prompt = new PromptTemplate({
            template: PLANING_SYSTEM,
            inputVariables: ["currentConfig", "userQuery"]
        });

      const output = await prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
        // const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
            currentConfig: state.currentConfig,
            userQuery: state.userQuery
        });

        this.log.log("[PLANNER] Plan generated:", "PLANNER");
        this.log.log(output, "PLANNER");
        const logPublish = {
            name: "Planner",
            type: "PLANNER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { plannerOutput: output };
    }

    private async building(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const prompt = new PromptTemplate({
            template: SINGLE_WORKER_SYSTEM_PROMPT,
            inputVariables: ["plan"
                // , "current_config"
            ]
        });

        const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
            plan: state.plannerOutput,
            // current_config: state.plannerOutput
            // userQuery: state.userQuery
        });

        this.log.log("[BUILDER] JSON generated:", "BUILDER");
        this.log.log(output, "BUILDER");
        const logPublish = {
            name: "BUILDER",
            type: "BUILDER_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { builderOutput: output };
    }

    private async communicating(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const prompt = new PromptTemplate({
            template: COMMUNICATING_SYSTEM,
            inputVariables: [
                "current_space",
                "new_space",
                "userQuery"]
        });

        const output = await prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
            current_space: state.current_space,
            new_space: state.plannerOutput,
            userQuery: state.userQuery
        });

        this.log.log("[COMMUNICATOR] Final message:\n", "COMMUNICATOR");
        this.log.log(output, "COMMUNICATOR");
        const logPublish = {
            name: "COMMUNICATOR",
            type: "COMM_LOGS",
            clientId: state.clientId, // ensure clientId is preserved
            message: output
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { communicatorOutput: output };
    }

    private async returnResults(state: GraphInterface): Promise<Partial<GraphInterface>> {
        this.log.log("[RESULT] Returning response:", "RESULT");
        this.log.log(state.communicatorOutput || "No output", "RESULT");
        const logPublish = {
            name: "RESULT",
            type: "PLANNER_LOGS",
            clientId: state.clientId,
            message: state.communicatorOutput
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { communicatorOutput: state.communicatorOutput };
    }

    public getGraph() {
        return this.ragApp;
    }


    public async invokeWorkers(inputQuery: BotChatMessage, conversationHistory: string) {
        if (!this.ragApp) {
            console.error("RAG app is not initialized");
            return "";
        }

        // console.log("")
        // console.log("----- INVOKERAG ------")
        // console.log("question: " + question)
        // console.log("----------------------------")
        // console.log("")

const mock_current_space = `
{
  "layout": [                   // GridItem[]
    { "i": "gallery:hero", "x": 0, "y": 0, "w": 12, "h": 3 }
  ],
  "fidgets": [                  // one entry per fidget
    {
      "id": "gallery:hero",
      "type": "gallery",
      "settings": { "imageUrl": "...", "RedirectionURL": "..." }
    }
  ]
}
`;

        const graphResponse = await this.ragApp.invoke(
            {
                userQuery: inputQuery.message,
                conversationHistory,
                current_space: mock_current_space,
                clientId: inputQuery.clientId
            },
            // { configurable: { thread_id: crypto.randomUUID() } }

            // TODO 
            // understand and debug user_thread id
            { configurable: { thread_id: inputQuery.name + "_thread" } }
        );

        // this.tokenRateLimiter.printTokensUsedPerMinute();

        return graphResponse;
    }
}
