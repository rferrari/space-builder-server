import * as WebSocket from 'ws';
import { BotAvatar } from './bot.controller';
import { Farcaster } from './farcaster.controller';
import { EventBus, EventBusImpl } from './eventBus.interface';
import { randomInt } from 'crypto';
import * as botConfig from "./config";
import { ChatMessage } from '@langchain/core/messages';

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

class BotCustomServer {
  //public MEM_USED: NodeJS.MemoryUsage;

  private wss: WebSocket.Server;
  private botAvatar: BotAvatar;
  private farcaster: Farcaster;
  private eventBus: EventBus;

  public MEM_USED: NodeJS.MemoryUsage;

  constructor() {
    this.MEM_USED = process.memoryUsage();
    this.eventBus = new EventBusImpl();

    this.init();

  }

  private async initEventBus() {
    this.eventBus.subscribe('LAST_EVENT_ID', (logData) => {
      if (this.wss)
        this.wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'LAST_EVENT_ID', message: logData }));
          }
        });
    });

    this.eventBus.subscribe('LOG', (logData) => {
      if (this.wss)
        this.wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'LOG', message: logData }));
          }
        });
    });

    this.eventBus.subscribe('PRINT_MSG', (data) => {
      if (this.wss)
        this.wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            const message = JSON.stringify(data);
            client.send(message);
          }
        });
    });
  }

  private initWebSockets() {
    // this.wss = new WebSocket.Server({ port: 3030 });
    if (botConfig.USE_WS)
      this.wss = new WebSocket.Server({ port: parseInt(botConfig.WS_PORT) });

    if (this.wss)
      this.wss.on('connection', (ws: WebSocket) => {
        ws.on('message', (data: string) => {
          // Check if the message is a command
          this.handleCommand(this.wss, data);
          this.wss.clients.forEach((client: WebSocket) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              console.log('Sending to another client:', data);
              client.send(data);
            }
          });
        });
      });
  }

  private async init() {
    console.log("Initializing Events Bus...");
    this.initEventBus();

    console.log("Initializing Farcaster Events...")
    this.farcaster = new Farcaster(this.eventBus);

    console.log("Waking up Bot " + botConfig.BotName + botConfig.BotIcon + "...");
    this.botAvatar = new BotAvatar(this.eventBus, this.farcaster);

    // display date time now
    this.botAvatar.displayInternalClock();

    // preload Noticon Documents
    await this.botAvatar.preloadNotionDocuments();

    console.log(botConfig.USE_WS ? "Initializing WebSockets..." : "WebSockets OFF");
    if (botConfig.USE_WS)
      this.initWebSockets();

    // Set interval to broadcast new messages
    // const minTimeout = 0.1 * 60 * 1000; // 5 minutes in milliseconds
    // const maxTimeout = 0.3 * 60 * 1000; // 10 minutes in milliseconds
    // const fixedTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds
    // const randomTimeout = minTimeout + randomInt(maxTimeout - minTimeout);

    // init checking options
    console.log("Targets:");
    console.dir(botConfig.TARGETS);
    console.dir(botConfig.TARGET_CHANNELS);
    console.dir(botConfig.CAST_TO_CHANNEL);

    console.log(botConfig.LOG_MESSAGES ? `LOG MESSAGES is ON` : "LOG MESSAGES is OFF");

    botConfig.PUBLISH_TO_FARCASTER
    ? console.warn(Yellow+`PUBLISH TO FARCASTER is ON`+Reset)
    : console.warn(Yellow+"PUBLISH TO FARCASTER is OFF"+Reset);

    console.log(botConfig.NEW_CASTS_INTERVAL_MIN > 0
      ? Yellow+`Cast New Messages ${botConfig.NEW_CASTS_INTERVAL_MIN} minutes interval...`+Reset
      : Yellow+"Cast New Messages OFF"+Reset);

    if (botConfig.NEW_CASTS_INTERVAL_MIN > 0) {
      setInterval(async () => {
        this.handleCastNewMessagetoChannel().then((data) => {
          if (this.wss)
            this.wss.clients.forEach((client: WebSocket) => {
              if (client.readyState === WebSocket.OPEN) {
                const message = JSON.stringify(data);
                client.send(message);
              }
            });
        });
      },
        botConfig.NEW_CASTS_INTERVAL_MIN * 60 * 1000    // in minutes
        // fixedTimeout
        // randomTimeout
      ); // Broadcast new messages every x minutes
    }

    // Set interval to get Farcaster Trending Feed
    // setTimeout(() => {
    // if(this.wss)
    //   this.getTrendingFeed(this.wss);  
    // }, 0.3 * 60 * 1000);

    // Set interval to display used Memory
    if (botConfig.DISPLAY_MEM_USAGE) {
      setInterval(() => {
        this.printMemUsage();
      }, 1 * 60 * 1000);
      this.printMemUsage();
    }

    if (this.wss)
      this.wss.on('listening', () => {
        console.log('WS Server ready on port: ' + botConfig.WS_PORT);
      });

    // Print "Server is ready" when the server starts
    console.log(`Bot ${Cyan}${botConfig.BotName}${Reset} is up! ${Cyan}${botConfig.BotIcon}${Reset}`);
    console.log("")
  }

  public async printMemUsage() {
    console.log(Green);
    console.log("##########################");
    for (let key in this.MEM_USED)
      console.log(`${key}: ${Math.round(this.MEM_USED[key] / 1024 / 1024 * 100) / 100} MB`);
    console.log("##########################");
    console.log(Reset);
  }

  private async handleCommand(wss: WebSocket.Server, data: string) {
    const { name, message } = JSON.parse(data);
    const commandObj = {name, message}

    // this.eventBus.publish("COMMAND", commandObj);
    const response = await this.botAvatar.handleCommand(commandObj);
    // console.log(response);
    
    // wss.clients.forEach((client: WebSocket) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(JSON.stringify(response));
    //   }
    // });
  }


  private async handleCastNewMessagetoChannel() {
    const response = await this.botAvatar.castNewMessagetoChannel();
    if (!response) {
      console.error("Error generating new Cast Message for Channel");
      return;
    }

    this.farcaster.publishNewChannelCast(response.message);

    return response;
  }


}

process.on('uncaughtException', (err) => {
  console.error('Crash Prevent! Uncaught Exception:', err);
});

new BotCustomServer();
