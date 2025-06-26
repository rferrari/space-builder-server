/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";
import {
    WORKERS_MODEL, JSON_MODEL, WORKERS_TEMP, JSON_TEMP,
    ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY,
    VENICE_BASE_URL, VENICE_API_KEY,
    VENICE_JSON_MODEL
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

    const isYouTubeUrl = (url: string) => {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
    };

    for (const item of mediaArray) {
        if (item.type === "rss" && await isValidRss(item.url)) {
            validated.push(item);
        }

        if (item.type === "image" && await isValidImage(item.url)) {
            validated.push(item);
        }

        if (item.type === "video" && isYouTubeUrl(item.url)) {
            validated.push(item);
        }

        if (item.type === "social") {
            validated.push(item);
        }

        if (item.type === "information") {
            validated.push(item);
        }
    }

    return validated;
};


export async function extractImagesFromPage(url: string): Promise<string[]> {
    try {
        const { data, headers } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000,
        });

        if (!headers['content-type']?.includes('text/html')) return [];

        const $ = cheerio.load(data);
        const images: string[] = [];

        $('img').each((_, el) => {
            let src = $(el).attr('src') || '';
            if (src.startsWith('//')) src = 'https:' + src;
            else if (src.startsWith('/')) src = new URL(src, url).href;
            else if (!src.startsWith('http')) src = new URL(src, url).href;

            if (/\.(jpg|jpeg|png|svg)$/i.test(src)) {
                images.push(src);
            }
        });

        console.log(`🔍 Found ${$('img').length} <img> tags, extracted ${images.length} valid images`);
        return images;
    } catch {
        console.warn(`⚠️ Failed to extract from ${url}`);
        return [];
    }
}

export function scoreImage(url: string, query: string, seen: Map<string, number>): number {
    let score = 0;
    const urlLower = url.toLowerCase();
    const filename = urlLower.split('/').pop() || '';
    const baseName = filename.replace(/\.[a-z0-9]+$/, '');
    const isLogoQuery = query.toLowerCase().includes('logo');

    if (urlLower.includes('thumb') || urlLower.includes('small') || urlLower.includes('icon') || urlLower.includes('sprite')) score -= 2;
    if (/\/\d{1,3}px-/.test(urlLower)) score -= 2;

    if (urlLower.includes('large') || urlLower.includes('xlarge') || urlLower.includes('original') || urlLower.includes('hires')) score += 2;

    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) score += 2;
    else if (filename.endsWith('.png') || filename.endsWith('.webp')) score += 1;
    else if (filename.endsWith('.svg')) score += isLogoQuery ? 1 : -1;

    seen.set(baseName, (seen.get(baseName) || 0) + 1);
    if (seen.get(baseName)! > 1) score -= 1;

    if (filename.includes('logo')) score += isLogoQuery ? 2 : -2;
    if (filename.includes('banner') || filename.includes('icon')) score -= 1;
    if (/\d{3,}/.test(filename)) score += 1;

    if (urlLower.match(/\b(tui|roy|konrad|wothe|vermeer|fitzharris|gallery|photo|artwork|print)\b/)) score += 2;

    const cleanedQuery = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'with', 'from', 'for', 'of'].includes(w));

    const tokens = filename.split(/[^a-z0-9]+/);
    let matchCount = 0;

    for (const word of cleanedQuery) {
        const singular = word.replace(/s$/, '');
        if (tokens.includes(word) || tokens.includes(singular)) {
            matchCount++;
            score += 2;
        }
    }

    if (matchCount > 1) score += 1;

    return score;
}

async function extractImagesFromText(text: string): Promise<string[]> {
    const urlRegex = /https?:\/\/[^\s)\]]+/g;
    const links = [...text.matchAll(urlRegex)].map(m => m[0]);
    const allImages: string[] = [];

    const results = await Promise.allSettled(
        links.map(link => extractImagesFromPage(link).then(images => ({ link, images })))
    );

    for (const result of results) {
        if (result.status === 'fulfilled') {
            const { link, images } = result.value;
            if (images.length) {
                console.log(`🔗 ${link} → 🖼️ Found ${images.length} image(s)`);
                allImages.push(...images);
            } else {
                console.warn(`🔗 ${link} → ❌ No valid images found`);
            }
        } else {
            console.warn(`⚠️ Failed to extract from link due to error`);
        }
    }

    console.log(`\n🎯 Total images extracted: ${allImages.length}`);
    return allImages;
}

export async function imageResearcher(prompt: string): Promise<{
    mediaJson: string;
    validMedia: any[];
    invalidMedia: any[];
}> {
    const research = await client.responses.create({
        model: 'gpt-4.1',
        tools: [{ type: 'web_search_preview' }],
        tool_choice: { type: 'web_search_preview' },
        input: `Find and return great websites links about main subject from this query: "${prompt}".`,
    });

    const outputText = research.output_text || '';
    console.log(outputText);

    const extractedUrls = await extractImagesFromText(outputText);
    const seen = new Map<string, number>();

    const validMedia = extractedUrls.map(url => {
        const score = scoreImage(url, prompt, seen);
        return {
            type: 'image',
            info: 'Extracted from page',
            url,
            score: typeof score === 'number' && !isNaN(score) ? score : -9999,
        };
    });

    if (validMedia.length === 0) {
        console.warn('⚠️ No valid media to score.');
        return {
            mediaJson: '[]',
            validMedia: [],
            invalidMedia: [],
        };
    }

    const scores = validMedia.map(m => m.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const cutoff = minScore + (maxScore - minScore) * 0.4;

    validMedia.forEach(img =>
        console.log(`${img.score >= cutoff ? "✅" : "❌"} ${img.score} - ${img.url}`)
    );

    const sorted = validMedia
        .filter(img => img.score >= cutoff && img.score >= 0)
        .sort((a, b) => b.score - a.score);

    console.log(`\n${Yellow}🔢 Scored and sorted image list:${Reset}`);
    sorted.forEach(item => console.log(`${Green}${item.score} - ${item.url}${Reset}`));

    return {
        mediaJson: JSON.stringify(sorted, null, 2),
        validMedia: sorted,
        invalidMedia: [],
    };
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
            model: "gpt-4.1",
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

        let result: any;
        try {
            // using first VENICE
            const jsonModel = new OpenAI({
                apiKey: process.env.VENICE_API_KEY,
                baseURL: process.env.VENICE_BASE_URL
            });

            const modelResult = await jsonModel.chat.completions.create({
                model: VENICE_JSON_MODEL,
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
            // console.log(); // Log the result for each model            } catch (e) {
            result = modelResult.choices[0].message;
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
                    modelName: "gpt-4o", // or "gpt-4-turbo"
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

        return { builderOutput: output };
    }

    private async communicating(state: GraphInterface): Promise<Partial<GraphInterface>> {
        return { communicatorOutput: "Done!" };

        // log the inputs
        console.log('-'.repeat(50));
        console.log(`[COMMUNICATOR] Inputs:
            User Query: ${state.userQuery}`
        );

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

        // this.eventBus.publish("COMM_LOGS", logPublish);
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

        return graphResponse;
    }
}
