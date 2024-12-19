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


interface ArtStyle {
  [key: string]: string;
}

const artStyle: ArtStyle = {
  'Sunday': '64-bit Pixel Art',
  'Monday': '64-bit Oil Painting ',
  'Tuesday': 'Solarpunk Pixel Art',
  'Wednesday': '64-bit Watercolor Painting',
  'Thursday': '64-bit Retro Sci-fi Art',
  'Friday': 'Psychedelic 64-bit Pixel Art',
  'Saturday': '64-bit Abstract Pixel Art'
};


//// DEBUG_WEEK_DAYS_PERIODS //////////
const DEBUG_WEEK_DAYS_PERIODS = false;
const test_run_counter_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const test_run_counter_period = [
  // "Morning",
  "Afternoon",
  // "Night", 
  // "Late Night",
  // "Early Morning"
];
let weekdayCounter = 0;
let dayPeriodCounter = 0;
//////////////////////////////////////////

const TOM_PICTURE = `
..................=##=....................................--
.......:=-.......:#@#+@+=-..:-............................:-
.......-%#%%*--....=%@%++*#%##%%%#---:...:-.................
......:-@%*++##****##***+++++***###**#+.:#@#:...............
........+@@%*#*+-:-=++=-+++**##*++**#%##*#@@%+:.............
.........+@@%#******+::=++#%%###*++*#%%#*%@@%%%=............
........-#@@@@%%#+===-=#%%####%@@@**##%%##+#*#%%:.-*-.......
........:+@@@@%%%*+#%%%%%%%#++##%#++**@%%%***##%@=@%#:......
.-%@@@@@%%#**#%%%%%@@@@@@@@@@@@%#+*#%#**#%###%#*#%%@%:-=:...
.-=#@@@%%%%%%@@@@@@@%#*%%@@@@#*##@@%***####*+*#*#%%@%++%=...
....+@@@@@@@@@@@@@@@@%@@#**@%%@@@@#++**#%@%@####%@@@##%%=...
......:*@@@@@@@%+==+#@+:::%%++++==%@@@@@@@@#%#*#%%@@@@@-....
....:*%%@@@@@#+-::-*-::::::::::-=%%*++@@@%*#%%%%%%##@@@@+...
...+#%**@@@@%=:::::::::::::::::--::::::@%**%@@@%%@%%%%%%@%-.
...::*@@%%@@+-:::::::::::+*****#-:::::*###@@@@%@@%%@@@@%+*#-
...:----=@@@@@@@%=:::::-%@@@@@@@@@#-:::+%@@@@@@@@%@@@@@@@=..
......:+#%%%%%%%%#+=-::%#+-=----#@%#+::%@@%%@@@@%@@@@@@@@@=.
......-+===-+*****#*+:=++****+*+*%#*+=:-%@@@@@@@@@@@@@@@#*-.
......-++:...=@@@@###-=#=-...-%@@@%+*-:-#@@@@@@@@@@@@@@@+:..
......-**:...=@@@@#*##***-...-@@@@%##=*##*+*@@@@@@@@@@@*:...
......+*+:...=@@@@*+===++:...-@@@@%#*=+**###*-==-#@@@@@=....
......:*#:...-@@@@*++::+*-...:#@@@@%*-::-#+:-+++*-=@@@:.....
......-*#-.::-%@@@#++::**-::--*@@@%#*-:-#%=-++===*=@@-......
......:+==*+-=+*==+*+::*=++++*###%*++-:-#+:+@*-:-==%#:......
.......:::.=*:::-++-::::---------==-::::::*%#*+=--+-........
...........=#:::---::::::::::-=-::::::::::==+=-:=*:.........
...........=#::::---------#%%@@+:::::::------+*#:.........:-
...........=@+:::%@+------....*+:::::::=*%@@@@%-.........:--
...........:*#=:::=+:.......-+-:::::---*%+=%@%-.........::.:
.............-#+:::+*+....+*+::::-=-=+%#+=::*%:.........--::
...............#*-::::::::::::::+=-#@@#*=:::-#:.........----
................+#+::::::::::-=#*#@%##*=-:::-#+:.........:--
.................:#*-::::-#=@@@@@%*=*#+-:::::+#-...........:
...................=%%%%%%%%@@@@@#+**+--------=%%%-.........
............................#@##*=+####+++++++++.=++-.......
`

import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { Groq } from 'groq-sdk';
import { GraphInterface, ragSystem } from "./ragSystem";
import { ConversationChain } from "langchain/chains";
import { ChatGroq } from "@langchain/groq";

import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";

import { BufferMemory } from "langchain/memory";

///
// Combined Memory Experimental

import {
  // BufferMemory,
  CombinedMemory,
  ConversationSummaryMemory,
} from "langchain/memory";
// Combined Memory Experimental
///


import { HumanMessage, AIMessage, filterMessages, MessageContent } from "@langchain/core/messages";

import { EventBus } from './eventBus.interface'
import { Farcaster } from './farcaster.controller';

import { BotCastObj, BotChatMessage, CastIdJson } from './bot.types';

import * as botConfig from "./config";
import * as botPrompts from "./botPrompts";

import { getLatestEvent } from './api/event'

import FileLogger from './lib/FileLogger'
// import { UserResponse } from '@neynar/nodejs-sdk/build/';
import { ClankerBot } from './lib/ClankerBot';
import neynarClient from './lib/neynarClient';
import { UserResponse } from '@neynar/nodejs-sdk/build/api/models/user-response';
import { cat } from '@xenova/transformers/types/transformers';
// import { cat } from "@xenova/transformers";
// import { config, configDotenv } from "dotenv";

// import { mimeTypes } from 'mimetype';
// import { response } from 'express';
// import neynarClient from './lib/neynarClient';
// import { CastParamType } from '@neynar/nodejs-sdk';

const IMG_URL_REGEX = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface UserMemory {
  memory: BufferMemory;
  lastInteraction: number; // Timestamp
}

export class BotAvatar {
  public MEM_USED: NodeJS.MemoryUsage;

  private eventBus: EventBus;
  private farcaster: Farcaster;

  private openai: OpenAI;
  private botVision: Groq;

  private chatPrompt: ChatPromptTemplate;

  private chatBotBackuptLLM: ChatGroq;
  private chatBotLLM: ChatOpenAI;

  private assistentLLM: ChatGroq;

  private isStopped: boolean;
  private userAskToStart: string;
  private userAskToStop: string;

  private stringPromptMemory: BufferMemory;
  private chatChain: ConversationChain;
  private MESSAGES_HISTORY_SIZE: number;
  private MEMORY_EXPIRATION_MIN: number;

  private messagesLog: FileLogger;
  private memoryLog: FileLogger;
  private newCasts: FileLogger;

  // private resumoHumanos: any;
  // private resumoTom: any;
  // private resumoAll: any;

  private userMemories: Map<string, UserMemory> = new Map();


  private lastTrendingSummary: MessageContent;

  private clanker: ClankerBot;

  // Internal Clock
  private agora: Date;
  private nowis: any;
  private hour: number;
  private today: string;
  private weekday: string;
  private dayPeriod: string;


  //
  // Constructor
  //
  constructor(eventBus: EventBus, farcaster: Farcaster) {
    this.printTomPicture();

    this.MEM_USED = process.memoryUsage();

    this.isStopped = false;

    this.eventBus = eventBus;
    this.farcaster = farcaster;

    this.eventBus.subscribe("CAST_ADD", (data: BotCastObj) => this.handleCastAddMessage(data));
    this.eventBus.subscribe("WAS_MENTIONED", (data: BotCastObj) => this.handleMention(data));
    this.eventBus.subscribe("WAS_REPLIED", (data: BotCastObj) => this.handleReply(data));
    this.eventBus.subscribe("CHANNEL_NEW_MESSAGE", (data: BotCastObj) => this.handleChannelNewMessage(data));

    // this.eventBus.subscribe("COMMAND", (data: BotCastObj) => this.handleReply(data));

    this.messagesLog = new FileLogger({ folder: './logs-messages', printconsole: true });
    this.memoryLog = new FileLogger({ folder: './logs-memory', printconsole: false });
    this.newCasts = new FileLogger({ folder: './logs-newcasts', printconsole: false });

    // this.resumoHumanos = new FileLogger({ folder: './logs-resumos' });
    // this.resumoTom = new FileLogger({ folder: './logs-resumos' });
    // this.resumoAll = new FileLogger({ folder: './logs-resumos' });

    this.userMemories = new Map();

    this.MESSAGES_HISTORY_SIZE = botConfig.MESSAGES_HISTORY_SIZE; // Set the maximum history limit
    this.MEMORY_EXPIRATION_MIN = botConfig.MEMORY_EXPIRATION_MIN * 60 * 1000; // 24 hours

    // this.botAvatar = new Groq({ apiKey: botConfig.GROQ_API_KEY });

    this.updateInternalClockTime();
    // this.displayInternalClock();

    this.chatBotBackuptLLM = new ChatGroq({
      temperature: botConfig.BotLLMModel_TEMP,
      model: botConfig.ChatBackupLLMModel,
      stop: null,
    });

    this.chatBotLLM = new ChatOpenAI({
      openAIApiKey: botConfig.OPENAI_API_KEY,
      temperature: botConfig.BotLLMModel_TEMP,
      modelName: botConfig.BotLLMModel,
      // apiKey: botConfig.OPENAI_API_KEY,
      // model: botConfig.BotLLMModel,
      // modelName: "gpt-4-turbo",
      // stop: null,
    });

    this.assistentLLM = new ChatGroq({
      temperature: 0.7,
      model: botConfig.AssistentModel, //llama-3.2-90b-text-preview
      stop: null,
    });

    this.chatPrompt = ChatPromptTemplate.fromMessages([
      ["system", botPrompts.BOT_SYSTEM_PROMPT,],
      ["human", "{userquery}"],
    ]);

    this.chatChain = new ConversationChain({
      // memory: this.getCurrentUserMemory(user),
      // memory: await this.getRelevantUserMemory(user, userQuery),
      memory: null,
      prompt: this.chatPrompt,
      llm: this.chatBotLLM,
    });

    this.stringPromptMemory = new BufferMemory({
      returnMessages: true,
      memoryKey: "history",
      inputKey: "userquery",
    })

    this.farcaster.start("lastid");

    // Schedule periodic cleanup
    setInterval(() =>
      this.cleanupOldMemories.call(this)
      , botConfig.MEMORY_CLEANUP_MIN * 60 * 1000); // Run every hour

    // Schedule get Farcasater Trendings Feed 
    setInterval(() =>
      this.getFarcasaterTrendingFeed()
      , botConfig.FARCASTER_TRENDING_MIN * 60 * 1000); // Run 24 hour

    // const chatPrompt = ChatPromptTemplate.fromMessages([
    //   ["system",
    //     botPrompts.BOT_SYSTEM_PROMPT2,
    //   ],
    //   new MessagesPlaceholder("history"),
    //   ["human", "{input}"],
    // ]);

    // this.chatChain = new ConversationChain({
    //   memory: this.stringPromptMemory,
    //   prompt: chatPrompt,
    //   llm: this.botLLM,
    // });

    // this.printMemorySummary();
  }

  public async preloadNotionDocuments(): Promise<boolean> {
    console.log("Loading Notions Documents...")
    console.time("Document Load Time");             // Start the timer
    // ragSystem.preloadDocuments();
    ragSystem.preloadDocuments()
      .then((chunks) => {
        console.log(`Documents loaded successfully. Created ${chunks} vector chunks.`);
        console.timeEnd("Document Load Time");   // End the timer and print the time
        return true;
      })
      .catch(() => {
        console.error("Failed loading documents. Please restart service.");
        console.timeEnd("Document Load Time");    // Ensure the timer ends even in case of failure
        return false;
      });
    return false;
  }

  private cleanupOldMemories() {
    const currentTime = Date.now();
    for (const [userId, userMemory] of this.userMemories.entries()) {
      if (currentTime - userMemory.lastInteraction > this.MEMORY_EXPIRATION_MIN) {
        this.userMemories.delete(userId); // Remove outdated memory

        // console.warn(`Memory for user ${userId} removed due to inactivity.`);
        // this.messagesLog.log(``, "MEM_CLEAN_UP")
        this.memoryLog.log(`Memory for user ${userId} removed due to inactivity.`, "MEM_CLEAN_UP")
        // this.messagesLog.log(``, "MEM_CLEAN_UP")
      }
    }
  }

  private async sumarizeUserHistoryMemory(userId: string) {
    // Load current memory variables
    let userMem = this.userMemories.get(userId);
    const storedMessages = await userMem.memory.loadMemoryVariables({});

    // Check if the number of messages exceeds the limit
    if (storedMessages.history.length > this.MESSAGES_HISTORY_SIZE) {
      this.memoryLog.warn("User " + userId + " Memory is " + storedMessages.history.length, "MEM_CLEAN_UP");
      // this.logger.log("", "CONSOLE")
      // this.logger.log("User " + userId + " Memory is " + storedMessages.history.length, "CONSOLE");
      // this.logger.log("", "CONSOLE")

      const messages = await storedMessages.history;
      const filteredMessages = filterMessages(messages, { includeTypes: [AIMessage, HumanMessage] });
      const conversationContent = filteredMessages.map((message) => {
        // Check the type of the message and assign the name accordingly
        const name = message instanceof AIMessage ? botConfig.BotName :
          message instanceof HumanMessage ? userId :
            'Unknown'; // Fallback in case of an unexpected type
        return `${name}: ${message.content}`;
      }).join('\n'); // Join all messages with a newline

      // Create a prompt for summarization
      const prompt =
        `Summarize these conversation between Tom and ${userId} as concise first-person insights in 5 sentences max.
Remember: omit any introductory phrases or explanations:
${conversationContent}
Summary:`;

      // Get the summary from the model
      const summaryResponse = await this.assistentLLM.invoke([{ role: 'system', content: prompt }]);
      // this.assistentLLM.invoke([{ role: 'user', content: prompt }]);

      let logid = `${userId}_Summary`;
      this.memoryLog.log(``, logid)
      this.memoryLog.log(`SummaryResponse for ${userId}`, logid)
      this.memoryLog.log(summaryResponse.content, logid)
      this.memoryLog.log(``, logid)

      userMem.memory.clear().then(() => { userMem.memory.chatHistory.addUserMessage(summaryResponse.content as string) })
    }
  }


  private async addtoUserMemory(userId: string, userQuery: string, aiResponse: string) {
    // Retrieve the existing memory object
    let userMem = this.userMemories.get(userId);

    // If no memory exists for this user, initialize a new structure
    if (!userMem.memory) return

    // Add the new interaction (user query and AI response) to the history
    await userMem.memory.chatHistory.addUserMessage(userQuery);
    await userMem.memory.chatHistory.addAIChatMessage(aiResponse);

    // (Optional) Log or perform any additional actions with the updated memory
    // console.log(`Memory updated for user ${userId}:`, userQuery + "\n" + aiResponse);
    // this.limitUserHistoryMemory(userId);

  }

  private async addtoBotMemory(userId: string, userQuery: string, aiResponse: string) {
    this.stringPromptMemory.chatHistory.addMessage(new HumanMessage({ content: userQuery, id: "user", name: userId }));
    this.stringPromptMemory.chatHistory.addAIChatMessage(aiResponse);
  }

  private async getCombinedMemory(userId: String, userQuery: string) {
    // buffer memory
    const bufferMemory = new BufferMemory({
      memoryKey: "chat_history_lines",
      inputKey: "userquery",
    });

    // summary memory
    const summaryMemory = new ConversationSummaryMemory({
      llm: new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0, apiKey: botConfig.OPENAI_API_KEY }),
      inputKey: "userquery",
      memoryKey: "conversation_summary",
    });

    //
    const memory = new CombinedMemory({
      memories: [bufferMemory, summaryMemory],
    });

    return memory;
  }

  //
  // Return the relevant Yser Memory entries based on keywords
  // create a new one if do not exist
  //
  private async getRelevantUserMemory(userId: string, userQuery: string): Promise<BufferMemory> {
    // Check if the BufferMemory for the user already exists
    if (!this.userMemories.has(userId)) {
      const userMemory: UserMemory = {
        memory: new BufferMemory({
          returnMessages: true,
          memoryKey: "history",
          inputKey: "userquery",
        }),
        lastInteraction: Date.now(), // Initialize the timestamp
      };
      this.userMemories.set(userId, userMemory);
    }

    // Return the existing BufferMemory
    const userMem = this.userMemories.get(userId)!; // Use non-null assertion since we checked existence

    userMem.lastInteraction = Date.now();

    // Retrieve the stored messages from BufferMemory
    // if (memory.chatHistory.getMessages().)
    const storedMessages = await userMem.memory.loadMemoryVariables({}); // This should give you the stored messages
    // const storedMessages = memory.loadMemoryVariables({})['history'] || []; // Adjust based on your BufferMemory implementation

    // Split user input into keywords
    const keywords = userQuery.split(" ");

    // Filter relevant memories based on keywords
    const relevantMemories = storedMessages.history.filter((entry: { content: string; }) =>
      keywords.some(keyword => entry.content.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Create a new BufferMemory instance to hold the relevant messages
    // Create a memory key for the prompt history 
    const userMemoryKey = `history`;
    const relevantMemory = new BufferMemory({ returnMessages: true, memoryKey: userMemoryKey, inputKey: "userquery" });

    // Add relevant messages to the new BufferMemory
    await relevantMemory.chatHistory.addMessages(relevantMemories)
    // Return the new BufferMemory with relevant history
    return relevantMemory;
  }

  // Function to initialize memory for a specific user
  private getCurrentUserMemory(userId: string): BufferMemory {
    // Check if the BufferMemory for the user already exists
    if (this.userMemories.has(userId)) {
      // Return the existing BufferMemory
      const userMem = this.userMemories.get(userId)!; // Use non-null assertion since we checked existence
      return userMem.memory
    }

    // Create a memory key for the prompt history 
    const userMemoryKey = `history`;

    // Initialize BufferMemory with the user-specific memory key
    const newMemory = new BufferMemory({ returnMessages: true, memoryKey: userMemoryKey, inputKey: "userquery" });

    // Create the UserMemory object with the BufferMemory and the current timestamp
    const userMemory: UserMemory = {
      memory: newMemory,
      lastInteraction: Date.now(), // Set the initial timestamp
    };

    // Store the new BufferMemory in the map
    this.userMemories.set(userId, userMemory);

    return newMemory; // Return the newly created BufferMemory
  }

  // Experimental
  private async trimMemoryHistory(resumoConversa: MessageContent) {
    // Load current memory variables
    const memoryVariables = await this.stringPromptMemory.loadMemoryVariables({});

    // Check if the number of messages exceeds the limit
    if (memoryVariables.length > this.MESSAGES_HISTORY_SIZE) {
      // Trim the oldest messages
      // const trimmedMemory = memoryVariables.slice(-this.MESSAGES_HISTORY_SIZE); // Keep the latest messages
      // Clear the current memory and save the trimmed memory
      await this.stringPromptMemory.clear(); // Clear existing memory
      await this.stringPromptMemory.chatHistory.addAIChatMessage(resumoConversa.toString());

      // await this.stringPromptMemory.chatHistory.addAIChatMessage(resumoConversa.toString());
      // await this.stringPromptMemory.saveContext(resumoConversa);
      // for (const message of trimmedMemory) {
      //   await this.stringPromptMemory.saveContext(
      //     { content: message.content, role: message.role },
      //     { content: '', role: 'assistant' } // Placeholder for assistant response
      //   );
      // }
    }
  }

  async printMemorySummary() {
    const intervalId = setInterval(async () => {
      const memorySummary = await this.stringPromptMemory.loadMemoryVariables({});
      // console.warn("memorySummary");
      // console.warn(memorySummary);

      this.memoryLog.log("MEMORYSUMMARY:", "MemUsed")
      this.memoryLog.log(memorySummary, "MEMORYSUMMARY");

    }, 5 * 60 * 1000); // 5 minutes
  }

  async summarizeTrendingFeed(feed: string) {
    try {
      // Create a prompt for summarization
      const prompt = botPrompts.WHATS_IS_TRENDING + feed;
      this.stringPromptMemory.chatHistory.addMessage(new AIMessage({ content: prompt, id: "tom", name: "tom" }));

      // Get the summary from the model
      const summaryResponse = await this.assistentLLM.invoke([{ role: 'user', content: prompt }]);
      // Output the summary as text
      return summaryResponse.content; // Return the summary if needed
    } catch (error) {
      this.memoryLog.error("Error summarizing conversation:", "ERROR");
      this.memoryLog.error(error, "ERROR");
    }
  }

  async summarizeConversationHumans() {
    try {
      // Load the memory variables
      const messages = await this.stringPromptMemory.chatHistory.getMessages()

      // Extract content from memorySummary based on user messages only
      const filteredMessages = filterMessages(messages, { includeTypes: [HumanMessage] });
      const conversationContent = filteredMessages.map((message) => {
        return `${message.name}: ${message.content}`;
      }).join('\n'); // Join all messages with a newline;

      // Create a prompt for summarization
      const prompt = `Summarize what users are talking about:\n${conversationContent}`;

      // Get the summary from the model
      const summaryResponse = await this.assistentLLM.invoke([{ role: 'user', content: prompt }]);

      // Output the summary as text
      return summaryResponse.content; // Return the summary if needed
    } catch (error) {
      this.memoryLog.error("Error summarizing conversation:", "ERROR");
      this.memoryLog.error(error, "ERROR");
    }
  }

  async summarizeConversationTom() {
    try {
      // Load the memory variables
      // Extract content from memorySummary based on AI messages only
      const messages = await this.stringPromptMemory.chatHistory.getMessages()
      const filteredMessages = filterMessages(messages, { includeTypes: [AIMessage, HumanMessage] });
      const conversationContent = filteredMessages.map((message) => {
        return `${message.name}: ${message.content}`;
      }).join('\n'); // Join all messages with a newline;

      // Create a prompt for summarization
      const prompt = `Summarize this messages in first person insights:\n${conversationContent}`;

      // Get the summary from the model
      const summaryResponse = await this.assistentLLM.invoke([{ role: 'user', content: prompt }]);

      // Output the summary as text
      return summaryResponse.content; // Return the summary if needed
    } catch (error) {
      this.memoryLog.error("Error summarizing conversation:", "ERROR");
      this.memoryLog.error(error, "ERROR");
    }
  }

  async summarizeConversation() {
    try {
      // Load the memory variables
      // Extract content from memorySummary
      // Extract content from memorySummary based on user and AI messages
      const messages = await this.stringPromptMemory.chatHistory.getMessages()
      const filteredMessages = filterMessages(messages, { includeTypes: [AIMessage] });

      // console.warn("filteredMessages length: " + filterMessages.length)
      // Get the last 10 messages
      const lastTenMessages = filteredMessages.slice(-10);
      // console.warn("lastTenMessages length: " + lastTenMessages.length)

      const conversationContent = lastTenMessages.map((message) => {
        return `${message.name}: ${message.content}`;
      }).join('\n'); // Join all messages with a newline;

      // console.warn("conversationContent: ");
      // console.dir(conversationContent);

      // Create a prompt for summarization
      const prompt = `Summarize the following conversation:\n${conversationContent}`;
      // const prompt = `Please summarize the following conversation:\n${memorySummary}`;

      // Get the summary from the model
      const summaryResponse = await this.assistentLLM.invoke([{ role: 'user', content: prompt }]);

      // Output the summary as text
      // console.warn("Conversation Summary:", summaryResponse.content);
      return summaryResponse.content; // Return the summary if needed
    } catch (error) {
      this.memoryLog.error("Error summarizing conversation:", "ERROR");
      this.memoryLog.error(error, "ERROR");
    }
  }

  private async getFarcasaterTrendingFeed() {
    const trendingFeed = await this.farcaster.getTrendingFeed();
    const trendingSummary = await this.summarizeTrendingFeed(trendingFeed);
    if (!trendingSummary) return;

    const chatmessage = {
      name: botConfig.BotName,
      message: trendingSummary
    }

    this.lastTrendingSummary = trendingSummary;
    // this.eventBus.publish("PRINT_MSG", chatmessage);
  }

  private countChars(text: string): number {
    return text.length;
  }

  private countWords(text: string): number {
    // const words = text.trim().split(/\s+/).filter(word => word.length > 0);

    // for also count japanese. experimental
    const regex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g;
    const words = text.trim().match(regex).filter(word => word.length > 0);

    return words.length;
  }

  private isQuestion(text: string): boolean {
    // Define common question-related characters and phrases
    const questionMarks = ["?", "？", "¿", "⁇", "⸮", "❓", "❔", "؟"];
    const questionPhrases = [
      "how do", "how much", "what is", "why is", "can you",
      "is it", "does it", "do you", "should i", "could you"
    ];

    // Convert text to lowercase for comparison
    const normalizedText = text.toLowerCase().trim();

    // Check if the text contains any question marks
    const hasQuestionMark = questionMarks.some(mark => normalizedText.includes(mark));

    // Check if the text contains any question phrases
    const containsQuestionPhrase = questionPhrases.some(phrase =>
      normalizedText.includes(phrase)
    );

    return hasQuestionMark || containsQuestionPhrase;
  }


  private async generateShouldRespond(history: string, query: string) {
    // Create an array of messages
    const promptTemplate = PromptTemplate.fromTemplate(
      botPrompts.shouldRespondTemplate
    );

    const filledPrompt = await promptTemplate.format({
      history,
      query,
    });

    const messages = [
      { role: "system", content: botPrompts.SHOULDRESPOND_SYSTEM },
      { role: "user", content: filledPrompt },
    ];

    // Invoke the model with the messages array
    const result = await this.assistentLLM.invoke(messages)
    return result.content;
  }

  private shouldReply(fid: number, text: string): boolean {
    // is Own message? Should Reply?
    if (fid == botConfig.BotFID) return false

    // const wordCount = this.countWords(text);
    const wordCount = this.countChars(text);

    const isQuestion = this.isQuestion(text);
    const keywords = ["good morning", "gm"]; // List of keywords to check
    // Normalize text for case-insensitive comparison
    const normalizedText = text.toLowerCase().trim();
    // Check if any keyword exists in the text
    const containsKeyword = keywords.some(keyword => normalizedText.includes(keyword.toLowerCase()));

    if (!isQuestion && wordCount < botConfig.MIN_REPLY_WORD_COUNT && !containsKeyword) {
      this.messagesLog.log(
        `Reply too small (${wordCount} < ${botConfig.MIN_REPLY_WORD_COUNT}), and no keywords."`, "MESSAGE");
      return false;
    }
    return true; // Reply if it's a question, long enough, or contains a keyword
  }


  private async getRAGContext(userQuery: string, user, history): Promise<string> {
    const RAG_SYSTEM = true;
    var ragContext = "";

    if (RAG_SYSTEM) {
      // experimental send more context from user to RAG
      const ragResponse = await ragSystem.invokeRAG(
        user,
        `@${user}: ${userQuery}`,
        history)
        // const ragResponse = await ragSystem.invokeRAG(user, `${userQuery}`)
        .catch(err => {
          this.messagesLog.error("Failed to generate RAG response", "RAG-ERROR");
          this.messagesLog.error(err.error.error.code, "RAG-ERROR");
        }) as GraphInterface;

      if (ragResponse && ragResponse.generatedAnswer) {
        ragContext = ragResponse.generatedAnswer;
      }
    }

    return ragContext;
  }

  //   private async replyMention(user: string, userQuery: string, vision: string = "",
  //     conversation: BotChatMessage[] = [], userDataInfo: UserResponse = null) {
  //     const config = { configurable: { thread_id: user + "_thread" } };
  //     var joinedConversation: string = '';
  //     var userInfoAbout: string = '';
  //     var userPrompt: string = '';
  //     const LOG_ID = "MENTION" + user

  //     // set userInfo
  //     if (userDataInfo) {
  //       userInfoAbout = this.userDataInfo2Text(userDataInfo)
  //     }

  //     // Swap Memories retrieving the relevant messages based on keywords
  //     // experimental
  //     // this.chatChain.memory = await this.getCombinedMemory(user, userQuery);
  //     const relevantMemory = await this.getRelevantUserMemory(user, userQuery);
  //     this.chatChain.memory = relevantMemory;

  //     // set conversationContent
  //     // filter and create a conversation content history for RAG System
  //     const chatHistoryMessages = await relevantMemory.chatHistory.getMessages();
  //     const filteredMessages = chatHistoryMessages.slice(botConfig.LAST_CONVERSATION_LIMIT); // Adjust the number as needed
  //     const memoryConversationContent = filteredMessages.map((message) => {
  //       // Check the type of the message and assign the name accordingly
  //       const name = message instanceof AIMessage ? botConfig.BotName :
  //         message instanceof HumanMessage ? user : 'User'; // Fallback in case of an unexpected type
  //       return `@${name}: ${message.content}`;
  //     }).join('\n'); // Join all messages with a newline


  //     if (conversation.length > 0) {
  //       conversation.forEach((message) => {
  //         joinedConversation += `User @${message.name} said: "${message.message}"\n\n`;
  //       });
  //       // joinedConversation += `\n`;
  //     }


  //     // if using RAG system... include conversationContent + userQuery
  //     // const ragContext = await this.getRAGContext(userQuery, user, memoryConversationContent);
  //     const ragHisstory = conversation.length > 0 ? joinedConversation : memoryConversationContent;
  //     const ragContext = await this.getRAGContext(userQuery, user, ragHisstory);

  //     // build user Prompt form user Query
  //     // userPrompt = userQuery;

  //     if (joinedConversation.length > 0) userPrompt = `Continue this conversation:
  // <conversation_history>
  // ${joinedConversation}
  // </conversation_history>

  // ${userPrompt}`;

  //     // experimental vision
  //     if (vision && vision !== "") userPrompt = `${vision}\n${userPrompt}`;
  //     // if (userInfoAbout && userInfoAbout !== "") userPrompt = `${userInfoAbout}\n${userQuery}`;

  //     // console.log("Prompt")
  //     // console.log(userQuery)

  //     // Swap Memories retrieving the relevant messages based on keywords
  //     // experimental
  //     // this.chatChain.memory = await this.getCombinedMemory(user, userQuery);

  //     userPrompt += `@${user}: ${userQuery}`;

  //     // Debug
  //     this.messagesLog.log(`-------Debug ${user} PROMPT:`, "PROMPT")
  //     // this.messagesLog.log(`<user_input>\n${userQuery}\n</user_input>\n\n`, "PROMPT")
  //     // this.messagesLog.log(`Prompt:`, "PROMPT")
  //     this.messagesLog.log(userPrompt, "PROMPT")
  //     this.messagesLog.log(`-------`, "PROMPT")
  //     this.messagesLog.log(``, "PROMPT")

  //     try {
  //       // throw new Error('This is a TEST backup system error!');
  //       var reply = await this.chatChain.invoke({
  //         context: ragContext,
  //         userquery: userPrompt,
  //       }, config);
  //     } catch (error) {
  //       this.messagesLog.error("FALLBACK BACKUP LLM SYSTEM", "ERROR");
  //       this.messagesLog.error(error, "ERROR");
  //       this.chatChain.llm = this.chatBotBackuptLLM;
  //       var reply = await this.chatChain.invoke({
  //         context: ragContext,
  //         userquery: userPrompt,
  //       }, config);

  //       this.chatChain.llm = this.chatBotLLM;
  //       this.messagesLog.error("backup response:", "ERROR");
  //       this.messagesLog.error(reply.response, "ERROR");
  //       this.messagesLog.error("chatBotLLM restored", "ERROR");
  //     }

  //     // console.log("this.chatChain.prompt");
  //     // console.log(this.chatChain.prompt);

  //     //
  //     // check reply size
  //     var textSize = new TextEncoder().encode(encodeURI(reply.response)).byteLength;
  //     var retryCounter = 0;
  //     while ((textSize > 1024) || retryCounter > 3) {
  //       let retryPrompt =
  //         `Rewrite this text to make it concise and under 1024 bytes. Output only the rewritten text: ${reply.response}`;
  //       this.messagesLog.log(`------- RETRYPROMPT  #${retryCounter} (${textSize} bytes) --------`, LOG_ID);
  //       // console.log(retryPrompt);
  //       // console.log("----------------------------");

  //       reply = await this.chatBotLLM.invoke(retryPrompt)

  //       reply.response = reply.content
  //       textSize = new TextEncoder().encode(encodeURI(reply.response)).byteLength;
  //       retryCounter++;
  //       this.messagesLog.log(`------- RETRY #${retryCounter} (${textSize} bytes) --------`, LOG_ID);
  //       // console.log(reply.response);
  //       // console.log("----------------------------");
  //       const delay = 30000; // 30 seconds
  //       await new Promise(resolve => setTimeout(resolve, delay));
  //     }

  //     // ^ matches start, $ matches end, | matches either " or '
  //     const finalMessage = reply.response.replace(/^"|"$/g, '');

  //     this.addtoBotMemory(user, userQuery, finalMessage)
  //     await this.addtoUserMemory(user, userQuery, finalMessage)

  //     await this.sumarizeUserHistoryMemory(user);

  //     // return response to be published
  //     return {
  //       name: botConfig.BotName,
  //       message: finalMessage,
  //     };
  //   }


  private async replyMessage(user: string, userQuery: string, vision: string = "",
    conversation: BotChatMessage[] = [], userDataInfo: UserResponse = null) {
    const config = { configurable: { thread_id: user + "_thread" } };
    var joinedConversation: string = '';
    var userInfoAbout: string = '';
    var userPrompt: string = '';
    const LOG_ID = "REPLY" + user

    // set userInfo
    if (userDataInfo) {
      userInfoAbout = this.userDataInfo2Text(userDataInfo)
    }

    // Swap Memories retrieving the relevant messages based on keywords
    // experimental
    // this.chatChain.memory = await this.getCombinedMemory(user, userQuery);
    const relevantMemory = await this.getRelevantUserMemory(user, userQuery);
    this.chatChain.memory = relevantMemory;

    // set conversationContent
    // filter and create a conversation content history for RAG System
    const chatHistoryMessages = await relevantMemory.chatHistory.getMessages();
    const filteredMessages = chatHistoryMessages.slice(botConfig.LAST_CONVERSATION_LIMIT); // Adjust the number as needed
    const memoryConversationContent = filteredMessages.map((message) => {
      // Check the type of the message and assign the name accordingly
      const name = message instanceof AIMessage ? botConfig.BotName :
        message instanceof HumanMessage ? user : 'User'; // Fallback in case of an unexpected type
      return `@${name}: ${message.content}`;
    }).join('\n'); // Join all messages with a newline


    if (conversation.length > 0) {
      conversation.forEach((message) => {
        joinedConversation += `User @${message.name} said: "${message.message.replace(/\n+/g, '\n')}"\n`;
      });
      // joinedConversation += `\n`;
    }


    // if using RAG system... include conversationContent + userQuery
    // const ragContext = await this.getRAGContext(userQuery, user, memoryConversationContent);
    const ragHisstory = conversation.length > 0 ? joinedConversation : memoryConversationContent;
    const ragContext = await this.getRAGContext(userQuery, user, ragHisstory);

    // build user Prompt form user Query
    // userPrompt = userQuery;

    if (joinedConversation.length > 0) userPrompt = `Continue this conversation:
<conversation_history>
${joinedConversation}
</conversation_history>

${userPrompt}`;

    // experimental vision
    if (vision && vision !== "") userPrompt = `${vision}\n${userPrompt}`;
    // if (userInfoAbout && userInfoAbout !== "") userPrompt = `${userInfoAbout}\n${userQuery}`;

    // console.log("Prompt")
    // console.log(userQuery)

    // Swap Memories retrieving the relevant messages based on keywords
    // experimental
    // this.chatChain.memory = await this.getCombinedMemory(user, userQuery);

    userPrompt += `@${user}: ${userQuery}`;

    // Debug
    this.messagesLog.log(`-------Debug ${user} PROMPT:`, "PROMPT")
    // this.messagesLog.log(`<user_input>\n${userQuery}\n</user_input>\n\n`, "PROMPT")
    // this.messagesLog.log(`Prompt:`, "PROMPT")
    this.messagesLog.log(userPrompt, "PROMPT")
    this.messagesLog.log(`-------`, "PROMPT")
    this.messagesLog.log(``, "PROMPT")

    try {
      // throw new Error('This is a TEST backup system error!');
      var reply = await this.chatChain.invoke({
        context: ragContext,
        userquery: userPrompt,
      }, config);
    } catch (error) {
      this.messagesLog.error("FALLBACK BACKUP LLM SYSTEM", "ERROR");
      this.messagesLog.error(error, "ERROR");
      this.chatChain.llm = this.chatBotBackuptLLM;
      var reply = await this.chatChain.invoke({
        context: ragContext,
        userquery: userPrompt,
      }, config);

      this.chatChain.llm = this.chatBotLLM;
      this.messagesLog.error("backup response:", "ERROR");
      this.messagesLog.error(reply.response, "ERROR");
      this.messagesLog.error("chatBotLLM restored", "ERROR");
    }

    // console.log("this.chatChain.prompt");
    // console.log(this.chatChain.prompt);

    //
    // check reply size
    var textSize = new TextEncoder().encode(encodeURI(reply.response)).byteLength;
    var retryCounter = 0;
    while ((textSize > 1024) || retryCounter > 3) {
      let retryPrompt =
        `Rewrite this text to make it concise and under 1024 bytes DO NOT INCLUDE "Here is the rewritten text:" Just RAW OUTPUT.

<text>
${reply.response}
<text>

Rewritten TEXT:`;

      this.messagesLog.log(`------- RETRYPROMPT  #${retryCounter} (${textSize} bytes) --------`, LOG_ID);
      // console.log(retryPrompt);
      // console.log("----------------------------");

      reply = await this.chatBotLLM.invoke(retryPrompt)

      reply.response = reply.content
      textSize = new TextEncoder().encode(encodeURI(reply.response)).byteLength;
      retryCounter++;
      this.messagesLog.log(`------- RETRY #${retryCounter} (${textSize} bytes) --------`, LOG_ID);
      // console.log(reply.response);
      // console.log("----------------------------");
      const delay = 30000; // 30 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Remove Quotes
    // do not misspell nounspace
    var finalMessage = reply.response;
    if (/namespace/i.test(finalMessage))
      console.warn("MISSPELL: namespace found in reply response");
    finalMessage = finalMessage
      .replace(/^"|"$/g, '')
      .replace(/namespace/g, 'nounspace');

    // const finalMessage = reply.response
    //   .replace(/^"|"$/g, '')
    //   .replace(/namespace/g, 'nounspace');

    this.addtoBotMemory(user, userQuery, finalMessage)
    await this.addtoUserMemory(user, userQuery, finalMessage)

    await this.sumarizeUserHistoryMemory(user);

    // return response to be published
    return {
      name: botConfig.BotName,
      message: finalMessage,
    };
  }


  // a message from target was sent, adding it to bot context
  private async handleCastAddMessage(castObj: BotCastObj): Promise<void> {
    if (!botConfig.TARGETS.includes(castObj.fid)) return
    const message = castObj.body.textWithMentions;

    switch (castObj.fid) {
      case 874542:    // clanker

        const { reply, hash, fid } = await this.handleClankerNewMessages((castObj));
        if (!reply) break;
        this.farcaster.publishUserReply(reply, hash, fid);
        break;

      case 527313:    // nounspacetom
        this.stringPromptMemory.chatHistory.addMessage(new AIMessage({
          content: message,
          id: botConfig.BotName,
          name: botConfig.BotName
        }));
        break;

      default:
        break;
    }


    if (botConfig.LOG_MESSAGES) {
      let logid = "NEW_CAST";
      this.newCasts.log("---- NEW TARGET MESSAGES WAS PUBLISHED by @" + castObj.fName, logid);
      this.newCasts.log(message, logid);
      this.newCasts.log("", logid);
    }
  }


  async handleClankerNewMessages(castObj: BotCastObj) {
    if (!this.clanker) {
      this.clanker = new ClankerBot();
    }

    let clankerObj: any;
    let reply: any;
    try {
      clankerObj = await this.clanker.processCast(castObj);
      // console.dir(clankerObj);
    } catch (error) {
      return { reply: undefined }
    }

    const image_description = await this.visionTool(clankerObj.imageUrls, clankerObj.historyConversation);
    const username = clankerObj.deployerInfo.username;
    const bio = clankerObj.deployerInfo.profile.bio.text;

    const prompt = `
Task: Generate a personalized and engaging 300-character message. The message should:

1. Be fun, creative, and context-aware, referencing:
-The token’s name and symbol.
-The user's bio, username, and other provided details like about_token and image_description.
2. Encourage action: Prompt the user to log in to Nounspace to customize their token's space, making it feel uniquely theirs.
3. Reflect Nounspace’s vibe: Keep it casual, playful, slightly mischievous, yet welcoming and clear. Use puns, clever references, and wordplay to match the tone.

Tips for Better Output:
-Include dynamic personalization to create a strong sense of connection.
-Maintain clarity despite the creative tone.

username: ${username}
user's bio: ${bio}
<about_token>
${image_description}
<nounspace_page>${clankerObj.nounspacePage}</nounspace_page>
${clankerObj.historyConversation}
<about_token>
`;

    try {
      reply = await this.chatBotLLM.invoke(prompt)
      const theTokenReply = reply.content;//+ `\n @${username}, here your token nounspace page: ${clankerObj.nounspacePage}`;

      this.messagesLog.log("", "TOKEN_CREATION");
      this.messagesLog.log("------------ NEW TOKEN DEPLOYED by: " + username, "TOKEN_CREATION");
      this.messagesLog.log(`<prompt>${prompt}</prompt>`, "TOKEN_CREATION");
      this.messagesLog.log("", "TOKEN_CREATION");
      this.messagesLog.log(theTokenReply, "TOKEN_CREATION");
      this.messagesLog.log("", "TOKEN_CREATION");

      return {
        reply: theTokenReply,
        hash: clankerObj.thread_hash,
        fid: clankerObj.deployerInfo.fid,
      };

    } catch (error) {
      this.messagesLog.log("", "TOKEN_CREATION");
      this.messagesLog.error(error, "TOKEN_CREATION_ERROR");
      this.messagesLog.log("", "TOKEN_CREATION");

      return { reply: undefined };
    }
  }


  private async handleReply(castObj: BotCastObj): Promise<void> {
    // handle bot reply
    const LOG_ID = "MSG_" + castObj.fName;
    const userChatMessage = { name: castObj.fName, message: castObj.body.textWithMentions }
    const userDataInfo = await this.farcaster.handleUserInfo(castObj.fName);
    const lastConversation = await this.farcaster.getConversationHistory(castObj.hash);

    //debug
    // console.log("#######################################")
    // if (userDataInfo) {
    //   console.log("userDataInfo:")
    //   console.dir(userDataInfo);
    // } else console.log("no userDataInfo yet...")
    // console.log("lastConversation:")
    // console.dir(lastConversation);
    // console.log("#######################################")
    //debug

    const tomVision = await this.visionTool(castObj.body.embeds, castObj.body.textWithMentions);
    if (tomVision) {
      console.log("TOMVISION")
      console.log(tomVision)
    }
    // if (!tomVision) return;    // DEBUG ONLY.    //COMMENT ME

    // experimental Decide Should Reply or Not
    this.messagesLog.warn("\n---- Decide Should Reply or Not", LOG_ID)
    let joinedConversation = "";
    lastConversation.forEach((message) => {
      joinedConversation += `User @${message.name} said: "${message.message}"\n\n`;
    });
    const shouldReply = await this.generateShouldRespond(joinedConversation, tomVision + castObj.body.textWithMentions)
    if ((shouldReply as string).includes("IGNORE")) {
      this.messagesLog.info("Its Better " + shouldReply, LOG_ID);
      this.messagesLog.info("@" + castObj.fName + ": " + castObj.body.textWithMentions, LOG_ID);
      return
    } else {
      this.messagesLog.warn("Lets Reply  @" + castObj.fName + " " + shouldReply, LOG_ID);
    }
    this.messagesLog.warn("", LOG_ID)

    const tomChatMessage = await this.replyMessage(
      castObj.fName,
      castObj.body.textWithMentions,
      tomVision,
      lastConversation,
      userDataInfo);

    this.messagesLog.log("", LOG_ID)
    this.messagesLog.log("------ HANDLE REPLY -------", LOG_ID)
    if (tomVision) {
      this.messagesLog.log(`Vision: `, LOG_ID)
      this.messagesLog.log(tomVision, LOG_ID)
      this.messagesLog.log("------")
    }

    // if (lastConversation && lastConversation.length > 0) {
    // let joinedConversation = '';
    // lastConversation.forEach((message) => {
    //   joinedConversation += `@${message.name}: ${message.message}\n`;
    // });
    this.messagesLog.log(`Last Conversation: `, LOG_ID)
    this.messagesLog.log(joinedConversation, LOG_ID)
    this.messagesLog.log("------")
    // }

    this.messagesLog.log("", LOG_ID)
    this.messagesLog.log("INPUT", LOG_ID)
    this.messagesLog.info(`@${userChatMessage.name}: ${userChatMessage.message}`, LOG_ID)
    this.messagesLog.log("REPLY")
    this.messagesLog.warn(`@${tomChatMessage.name}: ${tomChatMessage.message}`, LOG_ID)
    this.messagesLog.log("", LOG_ID)
    this.messagesLog.log("---------------------------", LOG_ID)

    this.farcaster.publishUserReply(tomChatMessage.message, castObj.hash, castObj.fid);
  }

  private async handleMention(castObj: BotCastObj): Promise<void> {
    // handle bot was mentioned
    const tomVision = await this.visionTool(castObj.body.embeds, castObj.body.textWithMentions);

    const userDataInfo = await this.farcaster.handleUserInfo(castObj.fName);
    const userChatMessage = { name: castObj.fName, message: castObj.body.textWithMentions }
    const lastConversation = await this.farcaster.getConversationHistory(castObj.hash);

    const tomChatMessage = await this.replyMessage(
      castObj.fName,
      castObj.body.textWithMentions,
      tomVision,
      lastConversation,
      userDataInfo);

    // this.eventBus.publish("PRINT_MSG", userChatMessage);
    // this.eventBus.publish("PRINT_MSG", tomChatMessage);
    let LOG_ID = "MENTIONS" + castObj.fName;
    this.messagesLog.log("", LOG_ID)
    this.messagesLog.log("------ HANDLE MENTION -------", LOG_ID)
    if (tomVision) {
      // this.messagesLog.log(`Vision: `, LOG_ID)
      this.messagesLog.log(tomVision, LOG_ID)
    }

    if (lastConversation && lastConversation.length > 0) {
      let joinedConversation = '';
      lastConversation.forEach((message) => {
        joinedConversation += `${message.name}: ${message.message}\n`;
      });
      // this.messagesLog.log(`Last Conversation: `, LOG_ID)
      this.messagesLog.log(joinedConversation, LOG_ID)
    }
    this.messagesLog.log(`@${userChatMessage.name}: ${userChatMessage.message}`, LOG_ID)
    this.messagesLog.log(`@${tomChatMessage.name}: ${tomChatMessage.message}`, LOG_ID)
    this.messagesLog.log("", LOG_ID)
    this.messagesLog.log("-----------------------------", LOG_ID)

    this.farcaster.publishUserReply(tomChatMessage.message, castObj.hash, castObj.fid);
  }

  private async handleChannelNewMessage(castObj: BotCastObj): Promise<void> {
    // handle channel new message
    if (!this.shouldReply(castObj.fid, castObj.body.textWithMentions)) return

    // seek for the first embbed image
    const tomVision = await this.visionTool(castObj.body.embeds, castObj.body.textWithMentions);

    const userDataInfo = await this.farcaster.handleUserInfo(castObj.fName);

    // save new message
    const userChatMessage = { name: castObj.fName, message: castObj.body.textWithMentions }

    // save bot reply
    const tomChatMessage = await this.replyMessage(
      castObj.fName,
      castObj.body.textWithMentions,
      tomVision,
      [],
      userDataInfo);

    // log conversation messages
    let logid = "MESSAGES";
    this.messagesLog.log("\n------ CHANNEL NEW MESSAGE -------", logid)
    this.messagesLog.log(`@${userChatMessage.name}: ${userChatMessage.message}`, logid)
    this.messagesLog.log(`@${tomChatMessage.name}: ${tomChatMessage.message}\n`, logid)

    // publish new event print message
    // this.eventBus.publish("PRINT_MSG", userChatMessage);
    // this.eventBus.publish("PRINT_MSG", tomChatMessage);

    // send event to publish to farcaster
    this.farcaster.publishUserReply(tomChatMessage.message, castObj.hash, castObj.fid);
  }

  public async handleCommand(command: string, message: BotChatMessage) {
    let tomReply = { name: botConfig.BotName, message: "" }

    switch (command) {
      case "start":
        this.userAskToStart = message.name;
        tomReply = this.setBotStart(message.message);
        break;
      case "stop":
        this.userAskToStop = message.name;
        this.setBotStop();
        break;
      case "status":
        tomReply = await this.getBotStatus();
        break;
      case "pixelart":
        tomReply = await this.drawingTool(message.message)
        break;
      case "reload":
        switch (message.message) {
          case "reloadVars":
            tomReply.message = "Sorry I cant do that.";
            // tomReply.message = "Reloading env vars (experimental)...";
            // const loadConfig = () => {
            //   const newBotConfig = require('./config');
            //   return newBotConfig;
            // };
            // botConfig = loadConfig();
            break
          case "reloadDocs":
            const result = await ragSystem.reloadDocuments();
            tomReply.message = result >= 0 ? `Reloaded in ${result} seconds!` : "Failed reloading docs. Try Again.";
            break
        }
        break;
      case "vision":
        let cmdvision = await this.visionTool([message.imageUrl], message.message);
        // tomReply.message = cmdvision;
        tomReply = await this.replyMessage(message.name, message.message, cmdvision, [], null);
        break;
      default:
        // messages from discord dont have fid -1 set
        if (!this.shouldReply(-1, message.message)) {
          tomReply = { name: botConfig.BotName, message: "Message Too Short!" };
          break;
        }
        tomReply = await this.replyMessage(message.name, message.message, "", [], null);
        break;
    }

    // this.eventBus.publish("PRINT_MSG", tomReply);
    return tomReply;
  }


  // Get Groq chat completion
  async socialMediaSugestion(resumoConversa: MessageContent, trendingTopics: MessageContent): Promise<any> {
    // Create an array of messages
    const promptTemplate = PromptTemplate.fromTemplate(
      botPrompts.SOCIAL_MEDIA_MANAGER_SUGESTION
    );

    const filledPrompt = await promptTemplate.format({
      trending: trendingTopics,
      summary: resumoConversa,
      todaycontext: botPrompts.CAST_WEEK_PROMPT[this.weekday]
    });

    const messages = [
      { role: "system", content: botPrompts.SOCIAL_MEDIA_MANAGER },
      { role: "user", content: filledPrompt },
    ];

    // Invoke the model with the messages array
    return this.assistentLLM.invoke(messages);
  }

  // Get Groq chat completion
  async getTomNewMessage(user_prompt: string): Promise<any> {
    // Create an array of messages
    const messages = [
      { role: "system", content: botPrompts.BOT_NEW_CAST_SYSTEM },
      { role: "user", content: user_prompt },
    ];

    // Invoke the model with the messages array
    return this.chatBotLLM.invoke(messages);
  }


  public formatTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) {
      return "morning";
    } else if (hour >= 12 && hour < 18) {
      return "afternoon";
    } else if (hour >= 18 && hour < 24) {
      return "night";
    } else if (hour >= 0 && hour < 3) {
      return "late night";
    } else {
      return "early morning";
    }
  }


  public formatDateWithOrdinal(date: { getDate: () => any; getMonth: () => string | number; }) {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];

    // Determine the ordinal suffix
    const ordinalSuffix = (day: number) => {
      if (day % 10 === 1 && day !== 11) return "st";
      if (day % 10 === 2 && day !== 12) return "nd";
      if (day % 10 === 3 && day !== 13) return "rd";
      return "th";
    };

    return `${month} ${day}${ordinalSuffix(day)}`;
  }

  async updateInternalClockTime(timeZone: string = botConfig.TIMEZONE) {
    this.agora = new Date();

    // Format the current time based on the provided timezone
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone
    };

    const fullDateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    };

    this.nowis = this.agora.toLocaleTimeString([], options);
    this.today = this.formatDateWithOrdinal(new Date(this.agora.toLocaleString("en-US", { timeZone })));

    // Adjust hour and weekday based on the timezone
    const adjustedDate = new Date(this.agora.toLocaleString("en-US", { timeZone }));
    this.hour = adjustedDate.getHours();
    this.weekday = WEEKDAYS[adjustedDate.getDay()];
    this.dayPeriod = this.formatTimeOfDay(this.hour);
  }

  private printTomPicture() {
    // console.log(TOM_PICTURE);
  }

  public async displayInternalClock() {
    this.updateInternalClockTime();
    console.warn(`
    ${Yellow}
    ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨
    ⌐◨-◨  
    ⌐◨-◨  Greetings from ${botConfig.BotName}!
    ⌐◨-◨  
    ⌐◨-◨  ${Magenta}Today is ${this.weekday}, ${this.today}. ${Yellow}
    ⌐◨-◨  ${Magenta}It's currently ${this.nowis}, and we're in the ${this.dayPeriod}. ${Yellow}
    ⌐◨-◨  ${Magenta}Hope you're having a great day! ${Yellow}
    ⌐◨-◨      
    ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨
    ${Reset}`);

    return {
      weekday: this.weekday,
      today: this.today,
      nowis: this.nowis,
      dayPeriod: this.dayPeriod
    }
  }

  private fakeTodaySpaceTime() {
    // Get the current weekday and day period based on counters
    const currentWeekday = test_run_counter_week[weekdayCounter];
    const currentDayPeriod = test_run_counter_period[dayPeriodCounter];

    // Update instance variables
    this.weekday = currentWeekday;
    this.dayPeriod = currentDayPeriod;

    // Increment counters
    dayPeriodCounter++;
    if (dayPeriodCounter >= test_run_counter_period.length) {
      dayPeriodCounter = 0; // Reset day period counter
      weekdayCounter++;
    }
    if (weekdayCounter >= test_run_counter_week.length) {
      weekdayCounter = 0; // Reset weekday counter
    }
  }

  async castNewMessagetoChannel(): Promise<BotChatMessage> {
    if (this.isStopped) return { name: botConfig.BotName, message: "Zzzzzzzzzz" };

    // update Space Time Awereness
    this.updateInternalClockTime();

    //////////////////////////////
    if (DEBUG_WEEK_DAYS_PERIODS)
      this.fakeTodaySpaceTime();
    //////////////////////////////


    if (this.lastTrendingSummary === undefined)
      await this.getFarcasaterTrendingFeed();

    const resumoConversa = await this.summarizeConversation();
    const smSugestion = await this.socialMediaSugestion(resumoConversa, this.lastTrendingSummary);

    // Experimental
    // this.resumoAll.log(resumoConversa);
    // const resumoConversaHumanos = await this.summarizeConversationHumans();
    // this.resumoHumanos.log(resumoConversaHumanos);
    // const resumoConversaTom = await this.summarizeConversationTom();
    // this.resumoTom.log(resumoConversaTom);
    // this.logger.log(resumoConversa);
    // console.warn(resumoConversa)

    const castPromptForToday =
      //botPrompts.CAST_WEEK_PROMPT[this.weekday]+
      botPrompts.BOT_NEW_CAST_PROMPT;

    const promptTemplate = PromptTemplate.fromTemplate(
      castPromptForToday
    );

    const filledPrompt = await promptTemplate.format({
      // weekday: this.weekday,
      today: this.today,
      dayPeriod: this.dayPeriod,
      suggestion: smSugestion.content,
    });

    // get llm reply
    const chatCompletion = await this.getTomNewMessage(filledPrompt);
    const reply = chatCompletion.content;
    // const chatCompletion = await this.getTomNewMessage(filledPrompt);
    // const reply = chatCompletion.choices[0]?.message?.content || "";

    // attach image
    var designerImage: any;
    // if(this.weekday=="Sunday"){
    designerImage = await this.drawingTool(reply); // message the url and name the prompt
    // imageUrl.message = imageUrl.message;
    // }

    if (reply !== "") {
      // add this cast to memory
      // this.stringPromptMemory.chatHistory.addAIChatMessage(reply);
      this.stringPromptMemory.chatHistory.addMessage(new AIMessage({
        content: reply,
        id: botConfig.BotName,
        name: botConfig.BotName
      }));
      // this.CheckWarning();
      // const reply = "";

      const tomReply: BotChatMessage = {
        name: botConfig.BotName,
        message: reply + " --- " + designerImage.name,
        imageUrl: designerImage.message,
      }

      if (botConfig.LOG_MESSAGES) {
        // let logid = "CAST_NEW_MESSAGE";

        let logid = this.weekday;
        this.newCasts.log("", logid);
        this.newCasts.log("", logid);
        this.newCasts.log("CAST_NEW_MESSAGE " + this.weekday + " " + this.dayPeriod, logid);
        this.newCasts.log(`SMM: ${smSugestion.content}`, logid);
        this.newCasts.log("", logid);
        this.newCasts.log(`${tomReply.name}: ${tomReply.message}`, logid);
        this.newCasts.log("", logid);
      }

      // Limit the history
      await this.trimMemoryHistory(resumoConversa);

      return tomReply;
    } else {
      return undefined;
    }
  }

  public getMemUsed() {
    const memFarcaster = this.farcaster.MEM_USED.rss;
    const memRag = ragSystem.MEM_USED.rss;
    const memTLimiter = ragSystem.tokenRateLimiter.MEM_USED.rss;

    return {
      memFarcaster,
      memRag,
      memTLimiter
    }
  }

  private async getBotStatus(): Promise<BotChatMessage> {
    const lastEventId = await getLatestEvent();
    const connStatus = this.farcaster.getConnectionStatus() === true
      ? "Im connected to Farcaster" : `Im disconnected from Farcaster cause ${this.userAskToStop} told so.`;
    const message = `

I have ${this.userMemories.size} users on my memory;
${connStatus};
The last Farcaster Event ID processed was ${lastEventId};

Mem. Usage: ${Math.round(this.MEM_USED.rss / 1024 / 1024 * 100) / 100} MB
`
    return { name: botConfig.BotName, message: message }
  }

  private setBotStop(): BotChatMessage {
    let message = "Fail";
    if (this.farcaster.stop()) {
      this.isStopped = true;
      message = "Stop";
      return { name: botConfig.BotName, message: message }
    }
  }

  private setBotStart(from: string): BotChatMessage {
    let message = "Fail";
    if (this.farcaster.start(from)) {
      this.isStopped = false;
      message = "Start";
    }
    return { name: botConfig.BotName, message: message }
  }

  public getisRunning() {
    return !this.isStopped;
  }



  // async getFirstImage(embeds): Promise<string> {
  //   const mimeTypes = [
  //     'image/jpeg',
  //     'image/png',
  //     // 'image/gif',
  //     // Add more image mime types as needed
  //   ];


  //   if (Object.keys(embeds).length > 0) {
  //     const promises = Object.values(embeds).map((value) => {
  //       if (typeof value === 'object' && ('url' in value)) { // Check if value is an object and has a url property
  //         if (value.url) { // Check if value has a url property
  //           return fetch(value.url as string, { method: 'HEAD' })
  //             .then((response) => 
  //               response.headers.get('Content-Type'))
  //             .then((mimeType) => {
  //               if (mimeTypes.includes(mimeType)) {
  //                 // if(mimeType == "image/gif"){
  //                 //   const response = await fetch(value.url);
  //                 //   const gifBuffer = await response.arrayBuffer();
  //                 //   const sharp = Sharp(gifBuffer);
  //                 //   const { data } = await sharp.frame(1);
  //                 //   return data;
  //                 // }
  //                 return value.url; // Return the first image URL found
  //               }
  //             });
  //         }
  //       }
  //     });

  //     const imageUrls = await Promise.all(promises)
  //       .then((results) => results.filter((result) => result !== null));

  //     // Wait for all promises to resolve
  //     const results = await Promise.all(promises);

  //     if (imageUrls[0])
  //       return imageUrls[0].toString();
  //     else return null; // Return the first image URL found, or null if none
  //   }

  //   return null;
  // }

  async getEmbedsFirstImage(embedsLinks: string[]): Promise<string | null> {
    const mimeTypes = [
      'image/jpeg',
      'image/png',
      // Add more image mime types as needed
    ];

    try {
      const promises = embedsLinks.map(async (link) => {
        const response = await fetch(link, { method: 'HEAD' });
        const mimeType = response.headers.get('Content-Type');
        return mimeType && mimeTypes.includes(mimeType) ? link : null;
      });

      const imageUrls = await Promise.all(promises)
        .then((results) =>
          results.filter((result) => result !== null));
      return imageUrls[0] ?? null;
    } catch (err) {
    }
    return null;
  }

  async getEmbedsImages(embedsLinks: string[]): Promise<string[] | null> {
    const mimeTypes = [
      'image/jpeg',
      'image/png',
      // Add more image mime types as needed
    ];

    try {
      const promises = embedsLinks.map(async (link) => {
        const response = await fetch(link, { method: 'HEAD' });
        const mimeType = response.headers.get('Content-Type');
        return mimeType && mimeTypes.includes(mimeType) ? link : null;
      });

      const imageUrls = await Promise.all(promises)
        .then((results) =>
          results.filter((result) => result !== null));
      return imageUrls ?? null;
    } catch (err) {
      return null;
    }
  }


  async drawingTool(subject: string): Promise<BotChatMessage> {

    const tomversion = await this.chatBotLLM.invoke(
      `Describe in one sentences an image to match the following text:
${subject}
OUTPUT:`);

    var dayArtStyle = artStyle[this.weekday];
    const DESIGNER_PROMPT = `Generate in "${dayArtStyle}" style: ` + (tomversion.content as string);

    const openai = new OpenAI();
    try {
      // console.log(tomversion.content);
      const response = await openai.images.generate({
        prompt: DESIGNER_PROMPT,
        n: 1, // Number of images to generate
        size: "1024x1024", // Image resolution
      });

      // console.log(response.data); // URL of the generated image
      return { name: (tomversion.content as string) + " (" + dayArtStyle + ")", message: response.data[0].url }
    } catch (error) {
      this.messagesLog.error("Error generating image:", "ERROR");
      this.messagesLog.error(error, "ERROR");

      return { name: "Error generating image:", message: "" }
    }
  }

  async visionTool(embeddes: any, context: string): Promise<string | undefined> {
    var imageDescription = "";
    var result = "";
    // debug
    // castObj Mode
    // [
    //   "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/bc04781b-3f0b-4144-c6b2-4144f5dff600/original",
    // ]
    // Farcaster Mode
    // embeddes = [{
    //   "url": "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/0c9c9666-18fc-4cb8-ba2a-add67a7d2d00/original"
    // }]
    if (!embeddes) return undefined;

    this.botVision = new Groq();
    // const firstImage = await this.getFirstImage(embeddes);
    const embedsImages = await this.getEmbedsImages(embeddes);
    if (!embedsImages) return undefined

    for await (const image of embedsImages) {
      const BOT_VISION_PROMPT = `What is in this image described in a maximum of 300 characters?`
      try {
        const chatCompletion = await this.botVision.chat.completions.create({
          "messages": [
            {
              "role": "user", "content": [
                {
                  "type": "text",
                  "text": BOT_VISION_PROMPT,
                },
                {
                  "type": "image_url",
                  "image_url": {
                    "url": image
                  }
                }
              ]
            }
          ],
          "model": botConfig.VisionModel,
          "temperature": 1,
          "max_tokens": 1024,
          "top_p": 1,
          "stream": false,
          "stop": null
        });

        imageDescription = chatCompletion.choices[0].message.content;
      } catch (error) {
        // console.log(error);
        // return undefined
      }

      if (imageDescription === "Unfortunately, I cannot identify people based on their photographs.")
        imageDescription = "A picture of a beautiful person";

      // const guess = recognitionResponse.content;
      result += `<image_description>\n${imageDescription
        }\n </image_description>\n`
    };
    return result

    // const BOT_VISION_PROMPT = `What's in this image in one short sentence?`
    // const BOT_VISION_PROMPT = `What is in this image described in a maximum of 300 characters?`
    //     const BOT_VISION_RECOGNITION =
    //       `You will receive an Image Description and your job its to
    // guess what is about and here are some informations that you may find interesting to guess it.

    // -${context}

    // Remember: Output directly your guess without introduction comments
    // OUTPUT: `

    /*
    `You will receive an Image Description and your job its to
    guess what is about and here are some informations that you may find interesting to guess it.
    
    Clues:
    -Draw of a guy in a white shirt, jeans, wearing sunglasses, is probably TOM or a User from nounspace;
    -Person wearing sunglasses, is probably a User from nounspace;
    -Person Face with sunglasses, say it' a beauty using a nOGs sunglass;
    -Using Sunglasses, probably it's a nOGs sunglass;
    -Offer/Sale/Buy, it is probably an NFT promo;
    -${context}
    
    Remember: Output directly your guess without introduction comments
    OUTPUT: `
    */

    // try {
    //   const chatCompletion = await this.botVision.chat.completions.create({
    //     "messages": [
    //       {
    //         "role": "user", "content": [
    //           {
    //             "type": "text",
    //             "text": BOT_VISION_PROMPT,
    //           },
    //           {
    //             "type": "image_url",
    //             "image_url": {
    //               "url": firstImage
    //             }
    //           }
    //         ]
    //       }
    //     ],
    //     "model": botConfig.VisionModel,
    //     "temperature": 1,
    //     "max_tokens": 1024,
    //     "top_p": 1,
    //     "stream": false,
    //     "stop": null
    //   });

    //   imageDescription = chatCompletion.choices[0].message.content;
    // } catch (error) {
    //   console.log(error);
    //   return undefined
    // }

    // if (imageDescription === "") return ""
    // if (imageDescription === "Unfortunately, I cannot identify people based on their photographs.")
    //   imageDescription = "A picture of a beautiful person";

    // const recognitionResponse = await this.assistentLLM.invoke([
    //   ["system", BOT_VISION_RECOGNITION,],
    //   ["user", imageDescription],
    // ]);

    // const guess = recognitionResponse.content;
    // const result = `<image_description>\n${imageDescription}\n</image_description>\n`
    // const result = `<image_description>\n${imageDescription}\n</image_description>\n<image_guess>\n${guess}\n</image_guess>\n`
    // console.log(result);
    // return result
  }


  // for gifs
  // import { Sharp } from 'sharp';

  // if (Object.keys(embeds).length > 0) {
  //   const promises = Object.values(embeds).map(async (value) => {
  //     if (typeof value === 'object' && ('url' in value)) {
  //       if (value.url) {
  //         const response = await fetch(value.url);

  //         const response_1 = await fetch(value.url as string, { method: 'HEAD' });
  //         const mimeType = response_1.headers.get('Content-Type');
  //         if (mimeTypes.includes(mimeType)) {
  //           if (mimeType == "image/gif") {
  //             const gifBuffer = await (getGifFrame(value.url));
  //             return gifBuffer;
  //           }
  //           return value.url;
  //         }
  //       }
  //     }
  //   });

  //   function getGifFrame(url: string): Promise<Buffer> {
  //     return fetch(url)
  //       .then(response => response.arrayBuffer())
  //       .then(buffer => Sharp(buffer).frame(1));
  //   }

  private userDataInfo2Text(userDataInfo: UserResponse) {
    // console.dir(userDataInfo)
    if (userDataInfo.user.experimental.neynar_user_score) {
      console.log("--- Neynar Score @" + userDataInfo.user.username + ": " + userDataInfo.user.experimental.neynar_user_score)
      console.log("--- BIO @" + userDataInfo.user.username + ": " + userDataInfo.user.profile.bio.text)
    }

    if (userDataInfo.user.profile.bio.text)
      return `(About ${userDataInfo.user.username}: ${userDataInfo.user.profile.bio.text})`
    else return "";
  }

}
