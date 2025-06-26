import * as http from "http";
import * as WebSocket from 'ws';
import { BotAvatar } from './bot.controller';
import { EventBus, EventBusImpl } from './eventBus.interface';
import * as botConfig from "./config";
import FileLogger from './lib/FileLogger';
import { Cyan, Reset } from './lib/colors';
import { BotChatMessage } from './bot.types';
import { IncomingMessage } from 'http';

const port = process.env.PORT || botConfig.WS_PORT || "3040";

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

    this.eventBus.subscribe('AGENT_LOGS', (payload: { clientId: number, type: string, name: string, message: any }) => {
      if (this.wss)
        this.wss.clients.forEach((client: WebSocket & { id?: number }) => {
          if (client.readyState === WebSocket.OPEN && client.id === payload.clientId) {
            client.send(JSON.stringify({
              type: payload.type,
              name: payload.name,
              message: payload.message
            }));
          }
        });

      // this.wss.clients.forEach((client: WebSocket) => {
      // if (client.readyState === WebSocket.OPEN) {
      // const message = JSON.stringify(data);
      // client.send(message);
      // }
      // });
    });
  }

  private initWebSockets() {
    // if (botConfig.USE_WS) {

    const app = http.createServer(); // You can use Express here too
    this.wss = new WebSocket.Server({ server: app });

    app.listen(parseInt(port), () => {
      this.logger.log('✅ WS Server ready on port: ' + port);
      this.logger.log(`✅ Agent ${Cyan}${botConfig.BotName}${Reset} is up! ${Cyan}${botConfig.BotIcon}${Reset}`);
    });
    // }
    // this.wss = new WebSocket.Server({ port: parseInt(port) });

    if (this.wss) {
      let clientId = 0; // Initialize a client ID counter

      this.wss.on('connection', (ws: WebSocket & { id?: number }, req: IncomingMessage) => {
        this.logger.log(`🧩 New WS connection from ${req.socket.remoteAddress}`);
        ws.id = clientId++;

        ws.on('message', (data: string) => {
          // Check if the message is a command
          const { name, message, spaceContext } = JSON.parse(data);
          let extractedMessage = message;
          let extractedSpaceContext = spaceContext;
          if (!spaceContext) {
            const userRequestMatch = message.match(/User request:(.*?)(\n\n)/s);
            if (userRequestMatch) {
              extractedMessage = userRequestMatch[1].trim();
            }
            const spaceContextMatch = message.match(/\n\nCurrent space configuration:\n(.*)/s);
            if (spaceContextMatch) {
              extractedSpaceContext = spaceContextMatch[1].trim();
            }
          }
          const commandObj: BotChatMessage = {
            name,
            message: extractedMessage,
            clientId: ws.id,
            type: null,
            spaceContext: extractedSpaceContext
          };

          this.botAvatar.processCommand(commandObj.message, commandObj);

          // send message to all connected clients
          // this.wss.clients.forEach((client: WebSocket) => {
          //   if (client !== ws && client.readyState === WebSocket.OPEN) {
          //     this.logger.log('Sending to another client:', data);
          //     client.send(data);
          //   }
          // });
        });
      });
    }
  }

  private async init() {
    this.logger.log("✅ Initializing Events Bus...");
    this.initEventBus();

    this.logger.log("✅ Waking up Bot " + botConfig.BotName + botConfig.BotIcon + "...");
    this.botAvatar = new BotAvatar(this.eventBus);

    // display date time now
    const { dayPeriod } = await this.botAvatar.displayInternalClock();

    this.logger.log(botConfig.USE_WS ? "✅ Initializing WebSockets..." : "🚨 WebSockets OFF");
    // if (botConfig.USE_WS)
    this.initWebSockets();

    // init checking options
    this.logger.log(botConfig.LOG_MESSAGES ? `✅ LOG MESSAGES is ON` : "🚨 LOG MESSAGES is OFF");

    this.logger.log("")
    this.logger.log("")

    this.logger.log("🙃 TEMPERAMENT: " + botConfig.CHAT_BOT_TEMP);
    this.logger.log("🤖 Agent Model: " + botConfig.CHAT_BOT_MODEL);
    this.logger.log("")
    this.logger.log("🙃 Workers Temp: " + botConfig.WORKERS_TEMP);
    this.logger.log("📄 Workers Model: " + botConfig.WORKERS_MODEL);
    this.logger.log("")
    this.logger.log("🙃 JSON TEMP: " + botConfig.JSON_TEMP);
    this.logger.log("📄 ANTHROPIC JSON MODEL: " + botConfig.JSON_MODEL);
    this.logger.log("📄 VENICE JSON MODEL: " + botConfig.VENICE_JSON_MODEL);

    this.logger.log("")

    // if (this.wss)
    //   this.wss.on('listening', () => {
    //     this.logger.log('✅ WS Server ready on port: ' + port);
    //     this.logger.log(`✅ Agent ${Cyan}${botConfig.BotName}${Reset} is up! ${Cyan}${botConfig.BotIcon}${Reset}`);
    //   });
  }

}

process.on('uncaughtException', (err) => {
  console.error('Crash Prevent! Uncaught Exception:', err);
});

new BotCustomServer();
