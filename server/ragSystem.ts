const Reset = "\x1b[0m",
Blue = "\x1b[34m",
Green = "\x1b[32m",
Red = "\x1b[31m",
Yellow = "\x1b[33m",
Magenta = "\x1b[35m",
Italic = "\x1b[3m",
Underscore = "\x1b[4m",
Cyan = "\x1b[36m",
Gray = "\x1b[90m";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";

import { ChatGroq } from "@langchain/groq";
import { NotionAPILoader } from "@langchain/community/document_loaders/web/notionapi";
import { NOTION_INTEGRATION_TOKEN, NOTION_DATABASE_ID } from './config'
import { PromptTemplate } from "@langchain/core/prompts"; // Import the PromptTemplate class

import { RAGLLMModel, JSONLLMModel } from './config'

import * as hub from "langchain/hub";
import { CharacterTextSplitter, RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import {
    ANSWER_GRADER_TEMPLATE,
    GRADER_TEMPLATE,
    SORRY_UNABLE_HELP,
    TOM_SECRETARY
} from "./botPrompts";
import { loadQAMapReduceChain } from "langchain/chains";

import { TokenRateLimiter } from './TokenLimiter'
import FileLogger from './lib/FileLogger'

export interface GraphInterface {
    question: string;
    conversationHistory: string;
    generatedAnswer: string;
    documents: Document[];
    model: ChatGroq;
    jsonResponseModel: ChatGroq;
    // model: ChatOllama;
    // jsonResponseModel: ChatOllama;
}

class RAGSystem {
    public MEM_USED: NodeJS.MemoryUsage;

    private vectorStore: MemoryVectorStore | null = null;
    private graph: StateGraph<GraphInterface> | null = null;
    private ragApp: CompiledStateGraph<GraphInterface, Partial<GraphInterface>, "__start__", StateDefinition, StateDefinition, StateDefinition> | null = null;
    private logSecretary: FileLogger;
    // public MEM_USED: NodeJS.MemoryUsage;
    private docsLoaded: boolean;
    private docsLoading: boolean;
    public tokenRateLimiter: TokenRateLimiter;

    constructor() {
        this.MEM_USED = process.memoryUsage();

        this.initializeGraph();

        this.docsLoaded = false;
        this.docsLoading = false;

        this.logSecretary = new FileLogger({ folder: './logs-messages', printconsole: true });

        // Initialize the vector store once
        this.vectorStore = new MemoryVectorStore(
            new HuggingFaceTransformersEmbeddings({
                model: "Xenova/all-MiniLM-L6-v2",
            })
        );

        this.tokenRateLimiter = new TokenRateLimiter({
            // 'llama-3.2-90b-text-preview': 7000,
            // 'llama-3.2-3b-preview': 7000,
            'llama3-8b-8192': 30000,
            // 'gemma2-9b-it': 15000,
            'llama3-70b-8192': 6000,
        });
        //await tokenRateLimiter.submit('llama-3.2-11b-text-preview', 1000);
    }

    private initializeGraph() {
        const graphState = {
            question: null,
            conversationHistory: null,
            generatedAnswer: null,
            documents: {
                value: (x: Document[], y: Document[]) => y,
                default: () => [],
            },
            model: null,
            jsonResponseModel: null
        };

        this.graph = new StateGraph<GraphInterface>({ channels: graphState })
            .addNode("retrieve_docs", this.retrieveDocs.bind(this))
            .addNode("create_model", this.createModel.bind(this))
            .addNode("create_json_response_model", this.createJsonResponseModel.bind(this))
            .addNode("grade_documents", this.gradeDocuments.bind(this))
            .addNode("generate_answer", this.generateAnswer.bind(this))
            .addNode("grade_answer", this.gradeAnswer.bind(this))
            .addEdge(START, "retrieve_docs")
            .addEdge("retrieve_docs", "create_model")
            .addEdge("create_model", "create_json_response_model")
            .addEdge("create_json_response_model", "grade_documents")
            .addConditionalEdges("grade_documents", this.hasRelevantDocs.bind(this), {
                yes: "generate_answer",
                no: END
            })
            .addEdge("generate_answer", "grade_answer")
            .addEdge("grade_answer", END) as StateGraph<GraphInterface>;

        this.ragApp = this.graph.compile({
            checkpointer: new MemorySaver()
        });
    }

    private async createModel(state: GraphInterface) {
        return {
            model: new ChatGroq({
                model: RAGLLMModel,
                temperature: 0.1,
                apiKey: process.env.GROQ_API_KEY as string
            })
        };
    }

    private async createJsonResponseModel(state: GraphInterface) {
        const groqModel = new ChatGroq({
            model: JSONLLMModel,
            temperature: 0,
            apiKey: process.env.GROQ_API_KEY as string
        });

        return {
            jsonResponseModel: groqModel.bind({
                response_format: { type: "json_object" }
            })
        };
    }

    // private async printMemUsage() {
    //     for (let key in this.MEM_USED)
    //         console.warn(`${key}: ${Math.round(this.MEM_USED[key] / 1024 / 1024 * 100) / 100} MB`);
    // }

    // Helper function to wait for documents to load.
    public async reloadDocuments(): Promise<number> {
        const start = new Date().getTime();
        try {
            this.docsLoaded = false;
            this.docsLoading = false;
            this.vectorStore = null;
            await this.buildVectorStore();
            const end = new Date().getTime();
            console.log(`Reloaded in ${(end - start) / 1000} seconds!`);
            return (end - start) / 1000; // Return the execution time in seconds
        } catch (error) {
            console.log(error);
            return -1; // Return -1 if an error occurs
        }
    }

    public async preloadDocuments() {
        const response = await this.buildVectorStore();
        return response.memoryVectors.length;
    }

    public waitForDocumentsToLoad(): Promise<void> {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.docsLoaded) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100); // Check every 100ms.
        });
    }

    private async buildVectorStore() {
        if (this.docsLoaded) {
            return this.vectorStore;
        }

        // If documents are currently loading, wait for the process to complete.
        if (this.docsLoading) {
            await this.waitForDocumentsToLoad();
            return this.vectorStore;
        }

        // Start the document loading process.
        this.docsLoading = true;

        /* Load Notion Pages
        const urls = NOTION_PAGE_IDS;
        const docs = await Promise.all(urls.map(url => {
            const reged = new RegExp(/(?<!=)[0-9a-f]{32}/);
            const pageIdMatch = url.match(reged);

            if (pageIdMatch && pageIdMatch.length > 0) {
                const notionPageId = pageIdMatch[0];
                // console.log("Loading Notion Page " + notionPageId);

                const loader = new NotionAPILoader({
                    clientOptions: {
                        auth: NOTION_INTEGRATION_TOKEN!,
                    },
                    id: notionPageId,
                    type: "page",
                });

                return loader.load();
            }
        }))*/

        // notion load database
        const dbLoader = new NotionAPILoader({
            clientOptions: { auth: NOTION_INTEGRATION_TOKEN! },
            id: NOTION_DATABASE_ID,
            type: "database",
            propertiesAsHeader: true,
        });
        const dbDocs = await dbLoader.load();
        const docs = dbDocs;
        // return loader.load();

        //console.warn("Text Splitter");


        // Test Split form Language (good results with larger chucksize)
        // Split the documents
        // const textSplitter = new RecursiveCharacterTextSplitter({
        //     chunkSize: 1000,
        //     chunkOverlap: 0,
        // });

        const textSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
            chunkSize: 1200,
            chunkOverlap: 125,
        });

        // const textSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {    (original V ZERO 0.5  goods)
        //     chunkSize: 500,
        //     chunkOverlap: 0,
        // });
        const splittedDocs = await textSplitter.splitDocuments(docs.flat());

        try {
            this.vectorStore = await MemoryVectorStore.fromDocuments(
                splittedDocs,
                new HuggingFaceTransformersEmbeddings({
                    model: "Xenova/all-MiniLM-L6-v2",

                }));
            this.docsLoaded = true;
        } catch (err) {
            console.error("HuggingFaceTransformersEmbeddings");
            console.dir(err);
            this.docsLoaded = false;
        }

        this.docsLoading = false;
        return this.vectorStore;
    }

    private async retrieveDocs(state: GraphInterface) {
        const vectorStore = await this.buildVectorStore();
        const retrievedDocs = await vectorStore.asRetriever().invoke(state.question);

        // console.log("")
        // console.log("----- RETRIEVEDOCS ------")
        // console.log("retrievedDocs: " + retrievedDocs.length)
        // console.log("----------------------------")
        // console.log("")

        return { documents: retrievedDocs };
    }

    private async gradeDocuments(state: GraphInterface) {
        const docs = state.documents;
        const gradingPrompt = ChatPromptTemplate.fromTemplate(GRADER_TEMPLATE);
        const docsGrader = gradingPrompt.pipe(state.jsonResponseModel);

        const gradingPromises = docs.map(async (doc) => {
            const gradedResponse = await docsGrader.invoke({
                document: doc.pageContent,
                question: state.question
            });

            // console.warn("tokenUsage.totalTokens: " + gradedResponse.response_metadata.tokenUsage.totalTokens)
            // experimental
            // await this.tokenRateLimiter.submit(
            //     state.model.modelName, 
            //     gradedResponse.response_metadata.tokenUsage.totalTokens
            // );

            const parsedResponse = JSON.parse(gradedResponse.content as string);
            return parsedResponse.relevant ? doc : null;
        });

        const gradedDocs = await Promise.all(gradingPromises);
        const goodDocuments = gradedDocs.filter(Boolean);

        let logId = "RAG"
        this.logSecretary.log("", logId)
        this.logSecretary.log(`----- RETRIVED ${goodDocuments.length} DOCUMENTS ------`, logId)
        this.logSecretary.log(`INPUT: ${state.question}`, logId);
        this.logSecretary.log("", logId)
        // console.log("gradedDocs: " + gradedDocs.filter(Boolean))
        goodDocuments.forEach((doc) => {
            if (doc) {
                let logId = "RAG"
                this.logSecretary.log(Yellow + `DOC: ${doc.metadata.properties.question} @ ${doc.metadata.properties._title}` + Reset, logId);
                // this.logSecretary.log(`${doc.pageContent}`, logId);
                // this.logSecretary.log(`${doc.pageContent.replace(/\n+/g, '\n')}`, logId);
                // this.logSecretary.log("--------", logId)
                // this.logSecretary.log("", logId)
            }
          });
          this.logSecretary.log("----------------------------", logId)

        return { documents: goodDocuments };
    }

    private hasRelevantDocs(state: GraphInterface) {
        const relevant = state.documents.length > 0;

        // console.log("")
        // console.log("----- HASRELEVANTDOCS ------")
        // console.log("relevant: " + relevant)
        // console.log("----------------------------")
        // console.log("")

        return relevant ? "yes" : "no";
    }

    private async generateAnswer(state: GraphInterface) {
        // const ragPrompt = await hub.pull("rlm/rag-prompt");
        const ragPromptString = TOM_SECRETARY;

        // Create a PromptTemplate from the string
        const ragPrompt = new PromptTemplate({
            template: ragPromptString,
            inputVariables: ["context", "history", "question"], // Specify the input variables
        });

        const ragChain = ragPrompt.pipe(state.model).pipe(new StringOutputParser());

        // Extract pageContent and join
        const docsContext = state.documents.map(doc => doc.pageContent).join("\n").replace(/###.*\n/g, '').trim();

        const generatedAnswer = await ragChain.invoke({
            context: docsContext,
            history: state.conversationHistory,
            question: state.question
        });

        // experimental
        // await this.tokenRateLimiter.submit(
        //     state.model.modelName, 
        //     generatedAnswer.length + docsContext.length + state.question.length
        // );

        let logId = "RAG"
        this.logSecretary.log("", logId)
        this.logSecretary.log("----- SECRETARY ASSIST ------", logId)
        // console.warn("context:" + docsContext);
        // console.warn("")
        this.logSecretary.log(Green+ "Q: " + state.question +Reset, logId)
        this.logSecretary.log(Cyan+ "A: " + generatedAnswer +Reset, logId)
        this.logSecretary.log("----------------------------", logId)

        return { generatedAnswer };
    }

    private async gradeAnswer(state: GraphInterface) {
        const answerGraderPrompt = ChatPromptTemplate.fromTemplate(ANSWER_GRADER_TEMPLATE);
        const answerGrader = answerGraderPrompt.pipe(state.jsonResponseModel);

        const gradedResponse = await answerGrader.invoke({
            question: state.question,
            answer: state.generatedAnswer
        });

        const parsedResponse = JSON.parse(gradedResponse.content as string);

        if (parsedResponse.relevant) {
            // console.log("")
            // console.log("----- GRADEANSWER ------")
            // console.log("relevant: " + parsedResponse.relevant)
            // console.log("generatedAnswer: " + state.generatedAnswer)
            // console.log("----------------------------")
            // console.log("")
            return { generatedAnswer: state.generatedAnswer };
        }

        return { generatedAnswer: SORRY_UNABLE_HELP };
    }

    // public async preloadDocuments() {
    //     const response = await this.buildVectorStore();
    //     return response.memoryVectors.length;
    // }

    public async invokeRAG(user: string, question: string, conversationHistory: string) {
        if (!this.ragApp) {
            console.error("RAG app is not initialized");
            return "";
        }

        // console.log("")
        // console.log("----- INVOKERAG ------")
        // console.log("question: " + question)
        // console.log("----------------------------")
        // console.log("")

        const graphResponse: GraphInterface = await this.ragApp.invoke(
            { question, conversationHistory },
            { configurable: { thread_id: crypto.randomUUID() } }
            
            // TODO 
            // understand and debug user_thread id
            // { configurable: { thread_id: user + "_thread" } }
        );

        // this.tokenRateLimiter.printTokensUsedPerMinute();

        return graphResponse;
    }
}

export const ragSystem = new RAGSystem();
