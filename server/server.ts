import * as WebSocket from 'ws';
import { BotAvatar } from './bot.controller';
import { EventBus, EventBusImpl } from './eventBus.interface';
import * as botConfig from "./config";
import FileLogger from './lib/FileLogger';
import { Cyan, Reset } from './lib/colors';

// declare module 'ws' {
//   interface WebSocket {
//     id?: number; // Optional property
//   }
// }


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

    // this.eventBus.subscribe('PLANNER_LOGS', (logData) => {
    //   if (this.wss)
    //     this.wss.clients.forEach((client: WebSocket) => {
    //       if (client.readyState === WebSocket.OPEN) {
    //         client.send(JSON.stringify({ type: 'LAST_EVENT_ID', message: logData }));
    //       }
    //     });
    // });

    // this.eventBus.subscribe('BUILDER_LOGS', (logData) => {
    //   if (this.wss)
    //     this.wss.clients.forEach((client: WebSocket) => {
    //       if (client.readyState === WebSocket.OPEN) {
    //         client.send(JSON.stringify({ type: 'LOG', message: logData }));
    //       }
    //     });
    // });

    // // this.eventBus.subscribe('PRIVATE_REPLY', (payload: { clientId: number, message: any }) => {
    // //   this.wss.clients.forEach((client: WebSocket & { id?: number }) => {
    // //     if (client.readyState === WebSocket.OPEN && client.id === payload.clientId) {
    // //       client.send(JSON.stringify({ type: 'REPLY', message: payload.message }));
    // //     }
    // //   });
    // // });

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
    if (botConfig.USE_WS)
      this.wss = new WebSocket.Server({ port: parseInt(botConfig.WS_PORT) });

    if (this.wss) {
      let clientId = 0; // Initialize a client ID counter

      this.wss.on('connection', (ws: WebSocket & { id?: number }) => {
        ws.id = clientId++;

        ws.on('message', (data: string) => {
          // Check if the message is a command
          this.handleCommand(this.wss, ws, data);

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
    if (botConfig.USE_WS)
      this.initWebSockets();

    // init checking options
    this.logger.log(botConfig.LOG_MESSAGES ? `✅ LOG MESSAGES is ON` : "🚨 LOG MESSAGES is OFF");


    this.logger.log("🙃 TEMPERAMENT: " + botConfig.BotLLMModel_TEMP);
    this.logger.log("🤖 Agent Model: " + botConfig.BotLLMModel);
    this.logger.log("📄 Workers Model: " + botConfig.RAGLLMModel);
    this.logger.log("👀 Vision: " + botConfig.VisionModel);
    this.logger.log("💻 Assistent: " + botConfig.AssistentModel);
    this.logger.log("")
    if (this.wss)
      this.wss.on('listening', () => {
        this.logger.log('✅ WS Server ready on port: ' + botConfig.WS_PORT);
        this.logger.log(`✅ Agent ${Cyan}${botConfig.BotName}${Reset} is up! ${Cyan}${botConfig.BotIcon}${Reset}`);
      });
  }

  // private async handleCommand(wss: WebSocket.Server, data: string) {
  private async handleCommand(wss: WebSocket.Server, ws: WebSocket & { id?: number }, data: string) {
    const { name, message } = JSON.parse(data);
    // const commandObj = { name, message }
    const commandObj = { name, message, clientId: ws.id };

    //await
    this.botAvatar.handleCommand(commandObj.message, commandObj);
  }

}

process.on('uncaughtException', (err) => {
  console.error('Crash Prevent! Uncaught Exception:', err);
});

new BotCustomServer();
