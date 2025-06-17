/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";
import { RAGLLMModel, JSONLLMModel } from "./config";
import { PLANING_SYSTEM, BUILDER_SYSTEM, COMMUNICATING_SYSTEM } from "./botPrompts";
import FileLogger from "./lib/FileLogger";
import { EventBus } from "./eventBus.interface";

export interface GraphInterface {
    question: string;
    conversationHistory: string;
    plannerOutput?: string;
    builderOutput?: string;
    communicatorOutput?: string;
    model: ChatOpenAI;
    jsonResponseModel: ChatOpenAI;
}

export class WorkersSystem {
    private graph: StateGraph<GraphInterface> | null = null;
    private ragApp: CompiledStateGraph<GraphInterface, Partial<GraphInterface>, "__start__", StateDefinition, StateDefinition, StateDefinition> | null = null;
    private log: FileLogger;
    private eventBus: EventBus;
    private wsClientId: number;

    constructor(eventBus: EventBus, clientId: number) {
        this.log = new FileLogger({ folder: './logs', printconsole: true });
        this.eventBus = eventBus;
        this.wsClientId = clientId;
        this.initializeGraph();
    }

    private initializeGraph() {
        const graphState = {
            question: null,
            conversationHistory: null,
            plannerOutput: null,
            builderOutput: null,
            communicatorOutput: null,
            model: null,
            jsonResponseModel: null
        };

        this.graph = new StateGraph<GraphInterface>({ channels: graphState })
            .addNode("create_model", this.createModel.bind(this))
            .addNode("create_json_response_model", this.createJsonResponseModel.bind(this))
            .addNode("planning", this.planning.bind(this))
            .addNode("building", this.building.bind(this))
            .addNode("communicating", this.communicating.bind(this))
            .addNode("return_results", this.returnResults.bind(this))
            .addEdge(START, "create_model")
            .addEdge("create_model", "create_json_response_model")
            .addEdge("create_json_response_model", "planning")
            .addEdge("planning", "building")
            .addEdge("building", "communicating")
            .addEdge("communicating", "return_results")
            .addEdge("return_results", END) as StateGraph<GraphInterface>;


        this.ragApp = this.graph.compile({ checkpointer: new MemorySaver() });
    }

    private async createModel(): Promise<Partial<GraphInterface>> {
        const model = new ChatOpenAI({
            model: RAGLLMModel,
            temperature: 0.1,
            apiKey: process.env.OPENAI_API_KEY as string
        });
        return { model };
    }

    private async createJsonResponseModel(state: GraphInterface) {
        const jsonModel = new ChatOpenAI({
            model: JSONLLMModel,
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY as string
        });

        return {
            jsonResponseModel: jsonModel.withConfig({
                response_format: { type: "json_object" }
            })
        };
    }

    private async planning(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const prompt = new PromptTemplate({
            template: PLANING_SYSTEM,
            inputVariables: ["history", "user_query"]
        });

        const output = await prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
            history: state.conversationHistory,
            user_query: state.question
        });

        this.log.log("[PLANNER] Plan generated:", "PLANNER");
        this.log.log(output, "PLANNER");
        const logPublish = {
          name: "Planner",
          type: "REPLY",
          clientId: this.wsClientId, // ensure clientId is preserved
          message: output
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { plannerOutput: output };
    }

    private async building(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const prompt = new PromptTemplate({
            template: BUILDER_SYSTEM,
            inputVariables: ["plan", "history", "question"]
        });

        const output = await prompt.pipe(state.jsonResponseModel).pipe(new StringOutputParser()).invoke({
            plan: state.plannerOutput,
            history: state.conversationHistory,
            question: state.question
        });

        this.log.log("[BUILDER] JSON generated:", "BUILDER");
        this.log.log(output, "BUILDER");
        const logPublish = {
          name: "BUILDER",
          type: "REPLY",
          clientId: this.wsClientId, // ensure clientId is preserved
          message: output
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { builderOutput: output };
    }

    private async communicating(state: GraphInterface): Promise<Partial<GraphInterface>> {
        const prompt = new PromptTemplate({
            template: COMMUNICATING_SYSTEM,
            inputVariables: ["plan", 
                // "json", "history", 
                "question"]
        });

        const output = await prompt.pipe(state.model).pipe(new StringOutputParser()).invoke({
            plan: state.plannerOutput,
            // json: state.builderOutput,
            // history: state.conversationHistory,
            question: state.question
        });

        this.log.log("[COMMUNICATOR] Final message:", "COMMUNICATOR");
        this.log.log(output, "COMMUNICATOR");
        const logPublish = {
          name: "COMMUNICATOR",
          type: "REPLY",
          clientId: this.wsClientId, // ensure clientId is preserved
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
          type: "REPLY",
          clientId: this.wsClientId, // ensure clientId is preserved
          message: state.communicatorOutput
        };
        this.eventBus.publish("AGENT_LOGS", logPublish);
        return { communicatorOutput: state.communicatorOutput };
    }

    public getGraph() {
        return this.ragApp;
    }


    public async invokeWorkers(user: string, question: string, conversationHistory: string) {
        if (!this.ragApp) {
            console.error("RAG app is not initialized");
            return "";
        }

        // console.log("")
        // console.log("----- INVOKERAG ------")
        // console.log("question: " + question)
        // console.log("----------------------------")
        // console.log("")

        const graphResponse = await this.ragApp.invoke(
            { user_query: question, conversationHistory },
            // { configurable: { thread_id: crypto.randomUUID() } }
            
            // TODO 
            // understand and debug user_thread id
            { configurable: { thread_id: user + "_thread" } }
        );

        // this.tokenRateLimiter.printTokensUsedPerMinute();

        return graphResponse;
    }
}
