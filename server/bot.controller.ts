import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { GraphInterface, WorkersSystem } from "./workers";
import { ConversationChain } from "langchain/chains";
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import {
  CombinedMemory,
  ConversationSummaryMemory,
} from "langchain/memory";
import { HumanMessage, AIMessage, filterMessages, MessageContent } from "@langchain/core/messages";
import { EventBus } from './eventBus.interface'
// import { Farcaster } from './farcaster.controller';
import { BotCastObj, BotChatMessage, CastIdJson } from './bot.types';
import * as botConfig from "./config";
import * as botPrompts from "./botPrompts";
// import { getLatestEvent } from './api/event'
import FileLogger from './lib/FileLogger'
import { UserResponse } from '@neynar/nodejs-sdk/build/api/models/user-response';
import { Magenta, Reset, Yellow } from './lib/colors';

// const IMG_URL_REGEX = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/;

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
  private workersSystem: WorkersSystem;

  // Internal Clock
  private agora: Date;
  private nowis: any;
  private hour: number;
  private today: string;
  private weekday: string;
  private dayPeriod: string;

  constructor(eventBus: EventBus
    // , farcaster: Farcaster
    ) {
    this.MEM_USED = process.memoryUsage();
    this.isStopped = false;
    this.eventBus = eventBus;
    
    // this.farcaster = farcaster;
    this.messagesLog = new FileLogger({ folder: './logs', printconsole: true });
    this.memoryLog = new FileLogger({ folder: './logs', printconsole: false });
    // this.newCasts = new FileLogger({ folder: './logs', printconsole: false });
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
      ["system", botPrompts.MAIN_SYSTEM_PROMPT,],
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

  private async generateShouldRespond(history: string, query: BotChatMessage): Promise<boolean> {
    const promptTemplate = PromptTemplate.fromTemplate(
      botPrompts.shouldRespondTemplate
    );

    const filledPrompt = await promptTemplate.format({ history, query: query.message });

    const messages = [
      { role: "system", content: botPrompts.SHOULDRESPOND_SYSTEM },
      { role: "user", content: filledPrompt },
    ];

    const result = await this.chatBotLLM.invoke(messages);

    // Convert complex message content to string
    const responseText = Array.isArray(result.content)
      ? result.content.map((c: any) => c.text || c.value || "").join(" ")
      : String(result.content || "");

    // Try to parse JSON first
    try {
      const parsed = JSON.parse(responseText);
      const action = parsed?.action?.toUpperCase?.();

      // this.eventBus.publish("AGENT_LOGS", {name: botConfig.BotName, message: action + " " + parsed?.reason?.()});
      let agentReply: BotChatMessage = { 
        name: botConfig.BotName, 
        message: parsed?.reason, 
        clientId: query.clientId,
        type: "LOG", 
      }
      this.eventBus.publish("AGENT_LOGS", agentReply);

      if (action === "RESPOND") return true;
      if (action === "IGNORE") return false;
    } catch (e) {
      // Fallback to text matching
      const lower = responseText.toLowerCase();
      if (lower.includes("respond")) return true;
      if (lower.includes("ignore")) return false;
    }

    return false;
  }



  private async getRAGContext(userQuery: BotChatMessage, history): Promise<string> {
    const RAG_SYSTEM = true;
    var ragContext = "";

    if (RAG_SYSTEM) {
      // experimental send more context from user to RAG
      const ragResponse = await this.workersSystem.invokeWorkers(
        userQuery,
        // `@${user}: ${userQuery}`,
        history)
        // const ragResponse = await ragSystem.invokeRAG(user, `${userQuery}`)
        .catch(err => {
          this.messagesLog.error("Failed to generate RAG response", "RAG-ERROR");
          this.messagesLog.error(err.message, "RAG-ERROR");
        }) as GraphInterface;

      if (ragResponse && ragResponse.communicatorOutput) {
        ragContext = ragResponse.communicatorOutput;
      }
    }

    return ragContext;
  }

  private async replyMessage(inputMessage: BotChatMessage, vision: string = "",
    conversation: BotChatMessage[] = [], userDataInfo: UserResponse = null)
  {
    const config = { configurable: { thread_id: inputMessage.name + "_thread" } };
    var joinedConversation: string = '';
    var userInfoAbout: string = '';
    var userPrompt: string = '';
    const LOG_ID = "REPLY" + inputMessage.name

    // set userInfo
    if (userDataInfo) {
      userInfoAbout = this.userDataInfo2Text(userDataInfo)
    }

    // Swap Memories retrieving the relevant messages based on keywords
    const relevantMemory = await this.getRelevantUserMemory(inputMessage.name, inputMessage.message);
    this.chatChain.memory = relevantMemory;

    // set conversationContent
    // filter and create a conversation content history for RAG System
    const chatHistoryMessages = await relevantMemory.chatHistory.getMessages();
    const filteredMessages = chatHistoryMessages.slice(botConfig.LAST_CONVERSATION_LIMIT); // Adjust the number as needed
    const memoryConversationContent = filteredMessages.map((message) => {
      // Check the type of the message and assign the name accordingly
      const name = message instanceof AIMessage ? botConfig.BotName :
        message instanceof HumanMessage ? message.name : 'User'; // Fallback in case of an unexpected type
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
    const finalMessage = await this.getRAGContext(inputMessage, ragHisstory);

    this.addtoBotMemory(inputMessage.name, inputMessage.message, finalMessage)
    await this.addtoUserMemory(inputMessage.name, inputMessage.message, finalMessage)

    return {
      name: botConfig.BotName,
      message: finalMessage,
    };
  }

  public async handleCommand(command: string, message: BotChatMessage) {
    let agentReply: BotChatMessage = {
      name: botConfig.BotName,
      message: "",
      clientId: message.clientId,
      type: "REPLY"
    }

    switch (command) {
      case "ping":
        agentReply.message = "pong";
        break;
      default:
        // messages from discord dont have fid -1 set
        const shouldReply = await this.generateShouldRespond("", message)
        if (!shouldReply ) {
          agentReply.message = "Cant help with that!";
          break;
        }

        this.workersSystem = new WorkersSystem(this.eventBus, message.clientId);
        const reply = await this.replyMessage(message, "", [], null);
        agentReply = {
          ...reply,
          type: "REPLY",
          clientId: message.clientId, // ensure clientId is preserved
        };
        // tomReply = await this.replyMessage(message.name, message.message, "", [], null);
        console.log(agentReply.name, agentReply.message)
        break;
    }

    this.eventBus.publish("AGENT_LOGS", agentReply);
    return agentReply;
  }

  // // Get Groq chat completion
  // async getTomNewMessage(user_prompt: string): Promise<any> {
  //   // Create an array of messages
  //   const messages = [
  //     { role: "system", content: botPrompts.BOT_NEW_CAST_SYSTEM },
  //     { role: "user", content: user_prompt },
  //   ];

  //   // Invoke the model with the messages array
  //   return this.chatBotLLM.invoke(messages);
  // }


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

  public async displayInternalClock() {
    this.updateInternalClockTime();
    console.warn(`
    ${Yellow}
    ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨  ⌐◨-◨
    ⌐◨-◨  
    ⌐◨-◨  Greetings from ${botConfig.BotName}!
    ⌐◨-◨  
    ⌐◨-◨  ${Magenta}Today is ${this.weekday}, ${this.today}. ${Yellow}
    ⌐◨-◨  ${Magenta}It's currently ${this.nowis} in ${botConfig.TIMEZONE}, and we're in the ${this.dayPeriod}. ${Yellow}
    ⌐◨-◨  ${Magenta}Best Day Ever! ${Yellow}
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

  // async castNewMessagetoChannel(): Promise<BotChatMessage> {
  //   if (this.isStopped) return { name: botConfig.BotName, message: "Zzzzzzzzzz" };

  //   // update Space Time Awereness
  //   this.updateInternalClockTime();

  //   const castPromptForToday =
  //     //botPrompts.CAST_WEEK_PROMPT[this.weekday]+
  //     botPrompts.BOT_NEW_CAST_PROMPT;

  //   const promptTemplate = PromptTemplate.fromTemplate(
  //     castPromptForToday
  //   );

  //   // const filledPrompt = await promptTemplate.format({
  //   //   // weekday: this.weekday,
  //   //   today: this.today,
  //   //   dayPeriod: this.dayPeriod,
  //   //   suggestion: smSugestion.content,
  //   // });

  //   const reply = "" //chatCompletion.choices[0]?.message?.content || "";
  //   var designerImage: any;

  //   if (reply !== "") {
  //     this.stringPromptMemory.chatHistory.addMessage(new AIMessage({
  //       content: reply,
  //       id: botConfig.BotName,
  //       name: botConfig.BotName
  //     }));

  //     const tomReply: BotChatMessage = {
  //       name: botConfig.BotName,
  //       message: reply + " --- " + designerImage.name,
  //       imageUrl: designerImage.message,
  //     }

  //     if (botConfig.LOG_MESSAGES) {
  //       let logid = this.weekday;
  //       this.newCasts.log("", logid);
  //       this.newCasts.log("", logid);
  //       this.newCasts.log("CAST_NEW_MESSAGE " + this.weekday + " " + this.dayPeriod, logid);
  //       this.newCasts.log("", logid);
  //       this.newCasts.log(`${tomReply.name}: ${tomReply.message}`, logid);
  //       this.newCasts.log("", logid);
  //     }

  //     return tomReply;
  //   } else {
  //     return undefined;
  //   }
  // }

  public getMemUsed() {
    return undefined;
    // const memRag = this.workersSystem.MEM_USED.rss;
    // return {
    //   memRag,
    // }
  }

  private userDataInfo2Text(userDataInfo: UserResponse) {
    if (userDataInfo.user.experimental.neynar_user_score) {
      console.log("--- Neynar Score @" + userDataInfo.user.username + ": " + userDataInfo.user.experimental.neynar_user_score)
      console.log("--- BIO @" + userDataInfo.user.username + ": " + userDataInfo.user.profile.bio.text)
    }

    if (userDataInfo.user.profile.bio.text)
      return `(About ${userDataInfo.user.username}: ${userDataInfo.user.profile.bio.text})`
    else return "";
  }

}
