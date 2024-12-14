import * as WebSocket from 'ws';
import { BotAvatar } from './bot.controller';
import { Farcaster } from './farcaster.controller';
import DiscordBot from './discord/DiscordApp';
import { EventBus, EventBusImpl } from './eventBus.interface';
import * as botConfig from "./config";
// import botConfig from './config.js';

import FileLogger from './lib/FileLogger';
import Table from 'cli-table3'
// import { randomInt } from 'crypto';
// import { ChatMessage } from '@langchain/core/messages';

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
  public MEM_USED: NodeJS.MemoryUsage;

  private wss: WebSocket.Server;
  private botAvatar: BotAvatar;
  private farcaster: Farcaster;
  private eventBus: EventBus;
  private logger: FileLogger;
  private discord: DiscordBot;

  constructor() {
    this.MEM_USED = process.memoryUsage();
    this.logger = new FileLogger({ folder: './logs', printconsole: true, logtofile: false });
    this.eventBus = new EventBusImpl();
    this.init();
  }

  private async initDiscordBot(avatarBot: BotAvatar) {
    this.discord = new DiscordBot(botConfig.DISCORD_TOKEN, avatarBot);
  }

  private async initEventBus() {
    // this.eventBus.subscribe('LAST_EVENT_ID', (logData) => {
    //   if (this.wss)
    //     this.wss.clients.forEach((client: WebSocket) => {
    //       if (client.readyState === WebSocket.OPEN) {
    //         client.send(JSON.stringify({ type: 'LAST_EVENT_ID', message: logData }));
    //       }
    //     });
    // });

    // this.eventBus.subscribe('LOG', (logData) => {
    //   if (this.wss)
    //     this.wss.clients.forEach((client: WebSocket) => {
    //       if (client.readyState === WebSocket.OPEN) {
    //         client.send(JSON.stringify({ type: 'LOG', message: logData }));
    //       }
    //     });
    // });

    // this.eventBus.subscribe('PRINT_MSG', (data) => {
    //   if (this.wss)
    //     this.wss.clients.forEach((client: WebSocket) => {
    //       if (client.readyState === WebSocket.OPEN) {
    //         const message = JSON.stringify(data);
    //         client.send(message);
    //       }
    //     });
    // });
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
              this.logger.log('Sending to another client:', data);
              client.send(data);
            }
          });
        });
      });
  }

  private async init() {
    this.logger.log("Initializing Events Bus... ✅");
    this.initEventBus();

    this.logger.log("Initializing Farcaster Events... ✅")
    this.farcaster = new Farcaster(this.eventBus);

    this.logger.log("Waking up Bot " + botConfig.BotName + botConfig.BotIcon + "...  ✅");
    this.botAvatar = new BotAvatar(this.eventBus, this.farcaster);

    this.logger.log("Initializing Discord Bot... ✅")
    this.initDiscordBot(this.botAvatar);

    // display date time now
    const { dayPeriod } = await this.botAvatar.displayInternalClock();

    // preload Noticon Documents
    await this.botAvatar.preloadNotionDocuments();

    this.logger.log(botConfig.USE_WS ? "Initializing WebSockets...  🚨" : "WebSockets OFF  ✅");
    if (botConfig.USE_WS)
      this.initWebSockets();

    // init checking options
    this.logger.log("Targets:");
    this.logger.log(botConfig.TARGETS);
    this.logger.log(botConfig.TARGET_CHANNELS);
    this.logger.log(botConfig.CAST_TO_CHANNEL);
    this.logger.log(botConfig.LOG_MESSAGES ? `LOG MESSAGES is ON` : "LOG MESSAGES is OFF");
    botConfig.PUBLISH_TO_FARCASTER ? this.logger.warn(Yellow + `PUBLISH TO FARCASTER is ON  ✅` + Reset) : this.logger.warn(Yellow + "PUBLISH TO FARCASTER is OFF 🚨" + Reset);
    this.logger.log(botConfig.NEW_CASTS_INTERVAL_MIN > 0 ? Yellow + `Cast New Messages ${botConfig.NEW_CASTS_INTERVAL_MIN} minutes interval...  ✅` + Reset : Yellow + "Cast New Messages OFF 🚨" + Reset);

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

    // Set interval to broadcast new messages
    // const minTimeout = 0.1 * 60 * 1000; // 5 minutes in milliseconds
    // const maxTimeout = 0.3 * 60 * 1000; // 10 minutes in milliseconds
    // const fixedTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds
    // const randomTimeout = minTimeout + randomInt(maxTimeout - minTimeout);

    // Set interval to display used Memory
    if (botConfig.DISPLAY_MEM_USAGE) {
      setInterval(() => {
        this.printMemUsage();
      }, 10 * 60 * 1000);
      this.printMemUsage();
    }

    if (this.wss)
      this.wss.on('listening', () => {
        this.logger.log('WS Server ready on port: ' + botConfig.WS_PORT);
      });

    // Print "Server is ready" when the server starts
    // this.discord.sendMessageToChannel(`Good ${dayPeriod} fam! ${botConfig.BotIcon}`);
    this.logger.log(`Bot ${Cyan}${botConfig.BotName}${Reset} is up! ${Cyan}${botConfig.BotIcon}${Reset}`);
    this.logger.log("")
  }

  public async printMemUsage() {
    let table = new Table({ head: ["Service", "MB"] })
    let Total = 0;

    const { memFarcaster, memRag, memTLimiter } = this.botAvatar.getMemUsed();
    const GROUP_MEM_USED = {
      Server: this.MEM_USED.rss,
      Avatar: this.botAvatar.MEM_USED.rss,
      Discord: this.discord.MEM_USED.rss,
      Farcaster: memFarcaster,
      RAG: memRag,
      TokenLimiter: memTLimiter
    }

    for (let key in GROUP_MEM_USED) {
      table.push([key, Math.round(GROUP_MEM_USED[key] / 1024 / 1024 * 100) / 100]);
      Total += GROUP_MEM_USED[key];
    }
    table.push(["Total", Math.round(Total / 1024 / 1024 * 100) / 100]);
    this.logger.log(table.toString());
  }

  private async handleCommand(wss: WebSocket.Server, data: string) {
    const { name, message } = JSON.parse(data);
    const commandObj = { name, message }
    //await
    this.botAvatar.handleCommand("", commandObj);
  }


  private async handleCastNewMessagetoChannel() {
    const response = await this.botAvatar.castNewMessagetoChannel();
    if (!response) {
      this.logger.error("Error generating new Cast Message for Channel");
      return;
    }

    if(botConfig.PUBLISH_TO_FARCASTER)
    this.farcaster.publishNewChannelCast(response.message);

    if(botConfig.PUBLISH_TO_DISCORD)
      this.discord.sendMessageToChannel(response.message, response.imageUrl)

    return response;
  }
}

process.on('uncaughtException', (err) => {
  console.error('Crash Prevent! Uncaught Exception:', err);
});

new BotCustomServer();
