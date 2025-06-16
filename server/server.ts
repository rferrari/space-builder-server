import * as WebSocket from 'ws';
import { BotAvatar } from './bot.controller';
import { EventBus, EventBusImpl } from './eventBus.interface';
import * as botConfig from "./config";
import FileLogger from './lib/FileLogger';

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
  // private farcaster: Farcaster;
  private eventBus: EventBus;
  private logger: FileLogger;

  constructor() {
    this.MEM_USED = process.memoryUsage();
    this.logger = new FileLogger({ folder: './logs', printconsole: true, logtofile: false });
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

          // this.wss.clients.forEach((client: WebSocket) => {
          //   if (client !== ws && client.readyState === WebSocket.OPEN) {
          //     this.logger.log('Sending to another client:', data);
          //     client.send(data);
          //   }
          // });
        });
      });
  }

  private async init() {
    this.logger.log("Initializing Events Bus... ✅");
    this.initEventBus();

    this.logger.log("Waking up Bot " + botConfig.BotName + botConfig.BotIcon + "...  ✅");
    this.botAvatar = new BotAvatar(this.eventBus, null); //this.farcaster);

    // display date time now
    const { dayPeriod } = await this.botAvatar.displayInternalClock();

    this.logger.log(botConfig.USE_WS ? "Initializing WebSockets...  ✅" : "WebSockets OFF  🚨");
    if (botConfig.USE_WS)
      this.initWebSockets();

    // init checking options
    this.logger.log(botConfig.LOG_MESSAGES ? `LOG MESSAGES is ON` : "LOG MESSAGES is OFF");


    this.logger.log("🙃 TEMPERAMENT: " + botConfig.BotLLMModel_TEMP);
    this.logger.log("🤖 Tom Model: " + botConfig.BotLLMModel);
    this.logger.log("📄 RAG Model: " + botConfig.RAGLLMModel);
    this.logger.log("👀 Vision: " + botConfig.VisionModel);
    this.logger.log("💻 Assistent: " + botConfig.AssistentModel);

    if (this.wss)
      this.wss.on('listening', () => {
        this.logger.log('WS Server ready on port: ' + botConfig.WS_PORT);
      });

    // Print "Server is ready" when the server starts
    this.logger.log(`Bot ${Cyan}${botConfig.BotName}${Reset} is up! ${Cyan}${botConfig.BotIcon}${Reset}`);
    this.logger.log("")
  }

  private async handleCommand(wss: WebSocket.Server, data: string) {
    const { name, message } = JSON.parse(data);
    const commandObj = { name, message }
    //await
    this.botAvatar.handleCommand(commandObj.message, commandObj);
  }

}

process.on('uncaughtException', (err) => {
  console.error('Crash Prevent! Uncaught Exception:', err);
});

new BotCustomServer();
