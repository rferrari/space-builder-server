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
// import { ChatOpenAI } from "@langchain/openai";
// import {
//   // BufferMemory,
//   CombinedMemory,
//   ConversationSummaryMemory,
// } from "langchain/memory";
// Combined Memory Experimental
///


import { HumanMessage, AIMessage, filterMessages, MessageContent } from "@langchain/core/messages";

import { EventBus } from './eventBus.interface'
import { Farcaster } from './farcaster.controller';

import { BotCastObj } from './bot.types';

import * as botConfig from "./config";
import * as botPrompts from "./botPrompts";

import { getLatestEvent } from './api/event'

import FileLogger from './lib/FileLogger'
import { cat } from "@xenova/transformers";
import { config } from "dotenv";

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

interface ChatMessage {
  name: string;
  message: string;
  imageUrl?: string;
}

interface UserMemory {
  memory: BufferMemory;
  lastInteraction: number; // Timestamp
}

export class BotAvatar {
  private eventBus: EventBus;
  private farcaster: Farcaster;

  private botLLM: ChatGroq;
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

    //this.MEM_USED = process.memoryUsage();

    this.isStopped = false;

    this.eventBus = eventBus;
    this.farcaster = farcaster;

    this.eventBus.subscribe("CAST_ADD", (data: BotCastObj) => this.handleCastAddMessage(data));
    this.eventBus.subscribe("WAS_MENTIONED", (data: BotCastObj) => this.handleMention(data));
    this.eventBus.subscribe("WAS_REPLIED", (data: BotCastObj) => this.handleReply(data));
    this.eventBus.subscribe("CHANNEL_NEW_MESSAGE", (data: BotCastObj) => this.handleChannelNewMessage(data));

    // this.eventBus.subscribe("COMMAND", (data: BotCastObj) => this.handleReply(data));

    this.messagesLog = new FileLogger({ folder: './logs-messages', printconsole: true });
    this.memoryLog = new FileLogger({ folder: './logs-memory', printconsole: true });
    this.newCasts = new FileLogger({ folder: './logs-newcasts', printconsole: true });

    // this.resumoHumanos = new FileLogger({ folder: './logs-resumos' });
    // this.resumoTom = new FileLogger({ folder: './logs-resumos' });
    // this.resumoAll = new FileLogger({ folder: './logs-resumos' });

    this.userMemories = new Map();

    this.MESSAGES_HISTORY_SIZE = botConfig.MESSAGES_HISTORY_SIZE; // Set the maximum history limit
    this.MEMORY_EXPIRATION_MIN = botConfig.MEMORY_EXPIRATION_MIN * 60 * 1000; // 24 hours

    this.updateInternalClockTime();  // this.displayInternalClock();

    this.botLLM = new ChatGroq({
      temperature: 0.7,
      model: botConfig.BotLLMModel,
      stop: null,
    });

    this.assistentLLM = new ChatGroq({
      temperature: 0.7,
      model: botConfig.AssistentModel, //llama-3.2-90b-text-preview
      stop: null,
    });

    const chatPrompt = ChatPromptTemplate.fromMessages([
      ["system", botPrompts.BOT_SYSTEM_PROMPT,],
      ["human", "{userquery}"],
    ]);

    this.chatChain = new ConversationChain({
      memory: null,
      prompt: chatPrompt,
      llm: this.botLLM,
    });

    this.farcaster.start("lastid");

    // Schedule periodic cleanup
    setInterval(() =>
      this.cleanupOldMemories.call(this)
      , botConfig.MEMORY_CLEANUP_MIN * 60 * 1000); // Run every hour


    // Schedule get Farcasater Trendings Feed 
    setInterval(() =>
      this.getFarcasaterTrendingFeed()
      , botConfig.FARCASTER_TRENDING_MIN * 60 * 1000); // Run 24 hour

    this.stringPromptMemory = new BufferMemory({
      returnMessages: true,
      memoryKey: "history",
      inputKey: "userquery",
    })
  }

  public async preloadNotionDocuments(): Promise<boolean> {
    console.log("Loading Notions Documents...")
    console.time("Document Load Time");             // Start the timer

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
        this.messagesLog.log(``, "MEM_CLEAN_UP")
        this.messagesLog.log(`Memory for user ${userId} removed due to inactivity.`, "MEM_CLEAN_UP")
        this.messagesLog.log(``, "MEM_CLEAN_UP")
      }
    }
  }

  private async sumarizeUserHistoryMemory(userId: string) {
    // Load current memory variables
    let userMem = this.userMemories.get(userId);
    const storedMessages = await userMem.memory.loadMemoryVariables({});

    // Check if the number of messages exceeds the limit
    if (storedMessages.history.length > this.MESSAGES_HISTORY_SIZE) {
      console.warn("User " + userId + " Memory is " + storedMessages.history.length);
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

      // console.log(summaryResponse);
      let logid = `${userId}_Summary`;
      this.messagesLog.log(``, logid)
      this.messagesLog.log(`SummaryResponse for ${userId}`, logid)
      this.messagesLog.log(summaryResponse.content, logid)
      this.messagesLog.log(``, logid)

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

  // Experimental Combined Memory
  // private async getCombinedMemory(userId: String, userQuery: string) {
  //   // buffer memory
  //   const bufferMemory = new BufferMemory({
  //     memoryKey: "chat_history_lines",
  //     inputKey: "userquery",
  //   });

  //   // summary memory
  //   const summaryMemory = new ConversationSummaryMemory({
  //     llm: new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0, apiKey: botConfig.OPENAI_API_KEY }),
  //     inputKey: "userquery",
  //     memoryKey: "conversation_summary",
  //   });

  //   //
  //   const memory = new CombinedMemory({
  //     memories: [bufferMemory, summaryMemory],
  //   });

  //   return memory;
  // }

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
    const storedMessages = await userMem.memory.loadMemoryVariables({});

    // Split user input into keywords
    const keywords = userQuery.split(" ");

    // Filter relevant memories based on keywords
    const relevantMemories = storedMessages.history.filter((entry: { content: string; }) =>
      keywords.some(keyword => entry.content.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Get the last 5 messages from the history
    const latestMessages = storedMessages.history.slice(-5);

    // Merge the relevant memories and latest messages
    const lastMemories = [...relevantMemories, ...latestMessages];

    // Create a new BufferMemory instance to hold the relevant messages
    // Create a memory key for the prompt history 
    const userMemoryKey = `history`;
    const relevantMemory = new BufferMemory({ returnMessages: true, memoryKey: userMemoryKey, inputKey: "userquery" });

    // Add relevant messages to the new BufferMemory
    await relevantMemory.chatHistory.addMessages(lastMemories)
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
      console.error("Error summarizing conversation:", error);
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
      console.error("Error summarizing conversation:", error);
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
      console.error("Error summarizing conversation:", error);
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
      console.error("Error summarizing conversation:", error);
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
      console.log(
        `Reply too small (${wordCount} < ${botConfig.MIN_REPLY_WORD_COUNT}), and no keywords."`
      );
      return false;
    }
    return true; // Reply if it's a question, long enough, or contains a keyword
  }


  private async replyMessage(user: string, userQuery: string, vision: string = "", conversation: string = "") {
    const config = { configurable: { thread_id: user + "_thread" } };

    // if (user == "System-uuid-bot") {
    //   // this.getTrendingFeed();
    //   return {
    //     name: botConfig.BotName,
    //     // message: `Hi ${user}, let me check what is trending today on Farcaster...`,
    //     message: `Hi, how can I assist you today?`,
    //   };
    // }

    const rag_system = true;
    let ragContext = "";
    if (rag_system) {
      const ragResponse = await ragSystem.invokeRAG(user, userQuery)
        .catch(err => { console.error("Failed to generate RAG response", err); }) as GraphInterface;

      if (ragResponse && ragResponse.generatedAnswer) {
        ragContext = ragResponse.generatedAnswer;
      }
    }

    // Swap Memories retrieving the relevant messages based on keywords
    // experimental
    // this.chatChain.memory = await this.getCombinedMemory(user, userQuery);
    this.chatChain.memory = await this.getRelevantUserMemory(user, userQuery);

    const response = await this.chatChain.invoke({
      context: ragContext,
      userquery: userQuery,
    }, config);

    let logid = "MESSAGES";
    this.messagesLog.log("", logid)
    this.messagesLog.log(`@${user}: ${userQuery}`, logid)
    this.messagesLog.log(`@${botConfig.BotName}: ${response.response}`, logid)
    this.messagesLog.log("", logid)
    this.messagesLog.log("", logid)

    await this.addtoUserMemory(user, userQuery, response.response)
    await this.sumarizeUserHistoryMemory(user);

    return {
      name: botConfig.BotName,
      message: response.response,
    };
  }

  // a message from target was sent, add it to bot context
  private async handleCastAddMessage(castObj: BotCastObj): Promise<void> {
    const message = castObj.body.textWithMentions;

    this.stringPromptMemory.chatHistory.addMessage(new AIMessage({
      content: message,
      id: botConfig.BotName,
      name: botConfig.BotName
    }));

    if (botConfig.LOG_MESSAGES) {
      let logid = "NEW_CAST";
      this.newCasts.log("---- NEW TARGET MESSAGES WAS PUBLISHED by @" + castObj.fName, logid);
      // this.newCasts.log("NEW_CAST:", logid);
      // this.newCasts.log("", logid);
      this.newCasts.log(message, logid);
      this.newCasts.log("", logid);
    }
    // console.dir(msgs);
  }


  private async handleReply(castObj: BotCastObj): Promise<void> {
    // handle bot reply
    const userChatMessage = { name: castObj.fName, message: castObj.body.textWithMentions }
    if (!this.shouldReply(castObj.fid, castObj.body.textWithMentions)) {
      console.dir(userChatMessage);
      return;
    }

    const tomChatMessage = await this.replyMessage(castObj.fName, castObj.body.textWithMentions);

    //this.eventBus.publish("PRINT_MSG", userChatMessage);
    //this.eventBus.publish("PRINT_MSG", tomChatMessage);

    this.farcaster.publishUserReply(tomChatMessage.message, castObj.hash, castObj.fid);
  }

  private async handleMention(castObj: BotCastObj): Promise<void> {
    // handle bot was mentioned
    const userChatMessage = { name: castObj.fName, message: castObj.body.textWithMentions }
    const tomChatMessage = await this.replyMessage(castObj.fName, castObj.body.textWithMentions);

    this.eventBus.publish("PRINT_MSG", userChatMessage);
    this.eventBus.publish("PRINT_MSG", tomChatMessage);

    this.farcaster.publishUserReply(tomChatMessage.message, castObj.hash, castObj.fid);
  }

  private async handleChannelNewMessage(castObj: BotCastObj): Promise<void> {
    // handle channel new message
    if (!this.shouldReply(castObj.fid, castObj.body.textWithMentions)) return

    const userChatMessage = { name: castObj.fName, message: castObj.body.textWithMentions }
    const tomChatMessage = await this.replyMessage(castObj.fName, castObj.body.textWithMentions);

    //this.eventBus.publish("PRINT_MSG", userChatMessage);
    //this.eventBus.publish("PRINT_MSG", tomChatMessage);

    this.farcaster.publishUserReply(tomChatMessage.message, castObj.hash, castObj.fid);
  }

  public async handleCommand(command: string, message: ChatMessage) {
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
      default:
        // messages from discord dont have fid -1 set
        if (!this.shouldReply(-1, message.message)) {
          tomReply = { name: botConfig.BotName, message: "Message Too Short!" };
          break;
        }
        tomReply = await this.replyMessage(message.name, message.message);
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
    return this.botLLM.invoke(messages);
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

  async castNewMessagetoChannel(): Promise<ChatMessage> {
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

      const tomReply = {
        name: botConfig.BotName,
        message: reply,
      }

      if (botConfig.LOG_MESSAGES) {
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
    // const memFarcaster = this.farcaster.MEM_USED.rss;
    // const memRag = ragSystem.MEM_USED.rss;
    // const memTLimiter = ragSystem.tokenRateLimiter.MEM_USED.rss;

    // return {
    //   memFarcaster,
    //   memRag,
    //   memTLimiter
    // }
  }

  private async getBotStatus(): Promise<ChatMessage> {
    const lastEventId = await getLatestEvent();
    const connStatus = this.farcaster.getConnectionStatus() === true
      ? "Im connected to Farcaster" : `Im disconnected from Farcaster cause ${this.userAskToStop} told so.`;
    const message = `

        I have ${this.userMemories.size} users on my memory;
        ${connStatus};
        The last Farcaster Event ID processed was ${lastEventId};
        `
    //        Mem. Usage: ${Math.round(this.MEM_USED.rss / 1024 / 1024 * 100) / 100} MB

    return { name: botConfig.BotName, message: message }
  }

  private setBotStop(): ChatMessage {
    let message = "Fail";
    if (this.farcaster.stop()) {
      this.isStopped = true;
      message = "Stop";
      return { name: botConfig.BotName, message: message }
    }
  }

  private setBotStart(from: string): ChatMessage {
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


  async getFirstImage(embeds): Promise<string> {
    const mimeTypes = [
      'image/jpeg',
      'image/png',
      // 'image/gif',
      // Add more image mime types as needed
    ];
    if (Object.keys(embeds).length > 0) {
      const promises = Object.values(embeds).map((value) => {
        if (typeof value === 'object' && ('url' in value)) { // Check if value is an object and has a url property
          if (value.url) { // Check if value has a url property
            return fetch(value.url as string, { method: 'HEAD' })
              .then((response) => response.headers.get('Content-Type'))
              .then((mimeType) => {
                if (mimeTypes.includes(mimeType)) {
                  return value.url; // Return the first image URL found
                }
              });
          }
        }
      });
      const imageUrls = await Promise.all(promises)
        .then((results) => results.filter((result) => result !== null));

      if (imageUrls[0])
        return imageUrls[0].toString();
      else return ""; // Return the first image URL found, or null if none
    }

    return null;
  }

  async drawingTool(subject: string): Promise<ChatMessage> {

    const tomversion = await this.botLLM.invoke(
      `Describe in one sentences an image to match the following text:
${subject}
OUTPUT:`);

    var dayArtStyle = artStyle[this.weekday];
    const DESIGNER_PROMPT = `Generate in "${dayArtStyle}" style: ` + (tomversion.content as string);

    const openai = new OpenAI();
    try {
      console.log(tomversion.content);
      const response = await openai.images.generate({
        prompt: DESIGNER_PROMPT,
        n: 1, // Number of images to generate
        size: "1024x1024", // Image resolution
      });

      // console.log(response.data); // URL of the generated image
      return { name: (tomversion.content as string) + " (" + dayArtStyle + ")", message: response.data[0].url }
    } catch (error) {
      console.error("Error generating image:", error);
      return { name: "Error generating image:", message: "" }
    }
  }

  async visionTool(embeddes: any) {
    // if (!embeddes) return;

    // this.botEyes = new Groq();
    // const firstImage = await this.getFirstImage(embeddes);

    // try {
    //   const chatCompletion = await this.botEyes.chat.completions.create({
    //     "messages": [
    //       {
    //         "role": "user", "content": [
    //           {
    //             "type": "text",
    //             "text": "What's in this image?"
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
    //     "model": "llama-3.2-11b-vision-preview",
    //     "temperature": 1,
    //     "max_tokens": 1024,
    //     "top_p": 1,
    //     "stream": false,
    //     "stop": null
    //   });
    //   return chatCompletion.choices[0].message.content;
    // } catch (error) {
    return "";
    // }
  }


}
