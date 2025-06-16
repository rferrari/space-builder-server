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


//// DEBUG_WEEK_DAYS_PERIODS
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

import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { GraphInterface, workersSystem } from "./workers";
import { ConversationChain } from "langchain/chains";

import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
// Combined Memory Experimental
import {
  // BufferMemory,
  CombinedMemory,
  ConversationSummaryMemory,
} from "langchain/memory";


import { HumanMessage, AIMessage, filterMessages, MessageContent } from "@langchain/core/messages";

import { EventBus } from './eventBus.interface'
import { Farcaster } from './farcaster.controller';

import { BotCastObj, BotChatMessage, CastIdJson } from './bot.types';

import * as botConfig from "./config";
import * as botPrompts from "./botPrompts";

import { getLatestEvent } from './api/event'

import FileLogger from './lib/FileLogger'
// import { UserResponse } from '@neynar/nodejs-sdk/build/';
// import { ClankerBot } from './lib/ClankerBot';
// import neynarClient from './lib/neynarClient';
import { UserResponse } from '@neynar/nodejs-sdk/build/api/models/user-response';
// import { cat } from '@xenova/transformers/types/transformers';

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

  private openai: OpenAI;

  private chatPrompt: ChatPromptTemplate;
  private chatBotLLM: ChatOpenAI;
  

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

  private userMemories: Map<string, UserMemory> = new Map();

  private lastTrendingSummary: MessageContent;

  // Internal Clock
  private agora: Date;
  private nowis: any;
  private hour: number;
  private today: string;
  private weekday: string;
  private dayPeriod: string;

  constructor(eventBus: EventBus, farcaster: Farcaster) {
    this.printTomPicture();

    this.MEM_USED = process.memoryUsage();

    this.isStopped = false;

    this.eventBus = eventBus;
    // this.farcaster = farcaster;

    this.messagesLog = new FileLogger({ folder: './logs-messages', printconsole: true });
    this.memoryLog = new FileLogger({ folder: './logs-memory', printconsole: false });
    this.newCasts = new FileLogger({ folder: './logs-newcasts', printconsole: false });

    this.userMemories = new Map();

    this.MESSAGES_HISTORY_SIZE = botConfig.MESSAGES_HISTORY_SIZE; // Set the maximum history limit
    this.MEMORY_EXPIRATION_MIN = botConfig.MEMORY_EXPIRATION_MIN * 60 * 1000; // 24 hours

    this.updateInternalClockTime();
 
    this.chatBotLLM = new ChatOpenAI({
      openAIApiKey: botConfig.OPENAI_API_KEY,
      temperature: botConfig.BotLLMModel_TEMP,
      modelName: botConfig.BotLLMModel,
    });

    this.chatPrompt = ChatPromptTemplate.fromMessages([
      ["system", botPrompts.BOT_SYSTEM_PROMPT,],
      ["human", "{userquery}"],
    ]);

    this.chatChain = new ConversationChain({
      memory: null,
      prompt: this.chatPrompt,
      llm: this.chatBotLLM,
    });

    this.stringPromptMemory = new BufferMemory({
      returnMessages: true,
      memoryKey: "history",
      inputKey: "userquery",
    })

    // this.farcaster.start("lastid");

    // Schedule periodic cleanup
    setInterval(() =>
      this.cleanupOldMemories.call(this)
      , botConfig.MEMORY_CLEANUP_MIN * 60 * 1000); // Run every hour
  }

  private cleanupOldMemories() {
    const currentTime = Date.now();
    for (const [userId, userMemory] of this.userMemories.entries()) {
      if (currentTime - userMemory.lastInteraction > this.MEMORY_EXPIRATION_MIN) {
        this.userMemories.delete(userId); // Remove outdated memory
        this.memoryLog.log(`Memory for user ${userId} removed due to inactivity.`, "MEM_CLEAN_UP")
      }
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

  // Return the relevant Yser Memory entries based on keywords
  // create a new one if do not exist
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
    } catch (error) {
      this.memoryLog.error("Error summarizing conversation:", "ERROR");
      this.memoryLog.error(error, "ERROR");
    }
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

    const botListString = botConfig.KNOW_BOT_LIST.filter(Boolean).join(", ");
    const knowbotsare = `\nKnown bots are: "${botListString}"`;

    const messages = [
      { role: "system", content: botPrompts.SHOULDRESPOND_SYSTEM2 + knowbotsare },
      { role: "user", content: filledPrompt },
    ];

    console.dir(messages);

    // Invoke the model with the messages array
    const result = await this.chatBotLLM.invoke(messages)
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
      const ragResponse = await workersSystem.invokeWorkers(
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
    }

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
    var finalMessage = reply.response;
    if (/namespace/i.test(finalMessage))
      console.warn("MISSPELL: namespace found in reply response");
    finalMessage = finalMessage
      .replace(/^"|"$/g, '')
      .replace(/namespace/g, 'nounspace');

    this.addtoBotMemory(user, userQuery, finalMessage)
    await this.addtoUserMemory(user, userQuery, finalMessage)

    // await this.sumarizeUserHistoryMemory(user);

    // return response to be published
    return {
      name: botConfig.BotName,
      message: finalMessage,
    };
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
      case "ping":
        tomReply = { 
          name: "Space Builder", 
          message: "pong"
        };
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
            const result = await workersSystem.reloadDocuments();
            tomReply.message = result >= 0 ? `Reloaded in ${result} seconds!` : "Failed reloading docs. Try Again.";
            break
        }
        break;
      case "vision":
        // let cmdvision = await this.visionTool([message.imageUrl], message.message);
        // tomReply.message = cmdvision;
        // tomReply = await this.replyMessage(message.name, message.message, cmdvision, [], null);
        break;
      default:
        // messages from discord dont have fid -1 set
        if (!this.shouldReply(-1, message.message)) {
          tomReply = { name: botConfig.BotName, message: "Message Too Short!" };
          break;
        }
        tomReply = await this.replyMessage(message.name, message.message, "", [], null);
        console.log(tomReply.name, tomReply.message)
        break;
    }

    this.eventBus.publish("PRINT_MSG", tomReply);
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
    return this.chatBotLLM.invoke(messages);
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

  async castNewMessagetoChannel(): Promise<BotChatMessage> {
    if (this.isStopped) return { name: botConfig.BotName, message: "Zzzzzzzzzz" };

    // update Space Time Awereness
    this.updateInternalClockTime();

    // if (this.lastTrendingSummary === undefined)
    //   await this.getFarcasaterTrendingFeed();

    // const resumoConversa = await this.summarizeConversation();
    // const smSugestion = await this.socialMediaSugestion(resumoConversa, this.lastTrendingSummary);

    const castPromptForToday =
      //botPrompts.CAST_WEEK_PROMPT[this.weekday]+
      botPrompts.BOT_NEW_CAST_PROMPT;

    const promptTemplate = PromptTemplate.fromTemplate(
      castPromptForToday
    );

    // const filledPrompt = await promptTemplate.format({
    //   // weekday: this.weekday,
    //   today: this.today,
    //   dayPeriod: this.dayPeriod,
    //   suggestion: smSugestion.content,
    // });

    const reply = "" //chatCompletion.choices[0]?.message?.content || "";

    // attach image
    var designerImage: any;


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
        // this.newCasts.log(`SMM: ${smSugestion.content}`, logid);
        this.newCasts.log("", logid);
        this.newCasts.log(`${tomReply.name}: ${tomReply.message}`, logid);
        this.newCasts.log("", logid);
      }

      return tomReply;
    } else {
      return undefined;
    }
  }

  public getMemUsed() {
    const memRag = workersSystem.MEM_USED.rss;
    return {
      memRag,
    }
  }

  private async getBotStatus(): Promise<BotChatMessage> {
    const lastEventId = await getLatestEvent();
    const message = `helloww!`
    return { name: botConfig.BotName, message: message }
  }

  private setBotStop(): BotChatMessage {
    let message = "Fail";
    // if (this.farcaster.stop()) {
      this.isStopped = true;
      message = "Stop";
      return { name: botConfig.BotName, message: message }
    // }
  }

  private setBotStart(from: string): BotChatMessage {
    let message = "Fail";
    // if (this.farcaster.start(from)) {
      this.isStopped = false;
      message = "Start";
    // }
    return { name: botConfig.BotName, message: message }
  }

  public getisRunning() {
    return !this.isStopped;
  }


  async getEmbedsFirstImage(embedsLinks: string[]): Promise<string | null> {
    const mimeTypes = [
      'image/jpeg',
      'image/png',
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
