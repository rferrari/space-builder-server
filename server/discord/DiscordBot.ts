import {
  Client,
  ActivityType,
  GatewayIntentBits,
  Partials, EmbedBuilder, Collection,
  PermissionsBitField, GuildMember,
  ColorResolvable, Events
} from "discord.js";

import {
  type RESTPostAPIApplicationCommandsJSONBody,
  type RESTPostAPIApplicationGuildCommandsJSONBody,
  type RESTPutAPIApplicationCommandsJSONBody,
  type RESTPutAPIApplicationGuildCommandsJSONBody,
} from 'discord.js';

import { Routes } from 'discord-api-types/v10'
import { REST } from '@discordjs/rest'
import * as path from 'path';
import * as fs from 'fs';
import { BotAvatar } from '../bot.controller';
import { parseMs } from './events/client/parsems';
import { Settings } from "./interfaces"
import settings from './configs/settings';
import { generateRandomImageName } from './utils'
// import { ChatMessage } from "@langchain/core/messages";

class DiscordBot {
  public MEM_USED: NodeJS.MemoryUsage;

  private client: any;
  private token: string
  private cooldown: any;
  private allEvents: string[];
  private rest: REST;
  private settings: Settings;
  private botAvatar: any;
  private loadedCommands: any;
  private loadedEvents: any;

  constructor(token: string, botAvatar: BotAvatar) {
    this.MEM_USED = process.memoryUsage();

    this.token = token;
    this.cooldown = new Collection<string, number>();
    this.allEvents = [];
    this.rest = new REST({ version: '10' }).setToken(this.token)
    this.settings = settings;
    this.botAvatar = botAvatar;

    this.loadedCommands = []
    this.loadedEvents = []

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        // GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent],
      shards: "auto",
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.User,
        Partials.ThreadMember]
    });

    // Set up your bot's configurations
    this.client.slashCommands = new Collection();
    this.client.categories = fs.readdirSync(path.join(__dirname, 'slashCommands'));

    // Set a maximum number of listeners for the client
    this.client.setMaxListeners(0);

    if (settings.ENABLED)
      this.init();
  }

  private async loadEvents(): Promise<void> {
    try {
      let quantityEvents: number = 0;

      const loadDir = (dir: string): void => {
        const eventsDir = path.join(__dirname, ".", 'events', dir);

        if (!fs.existsSync(eventsDir)) return;

        const filesAndDirs = fs.readdirSync(eventsDir);
        const jsFiles = filesAndDirs.filter(file => file.endsWith('.js'));
        const subDirs = filesAndDirs.filter(file => fs.statSync(path.join(eventsDir, file)).isDirectory());

        for (const file of jsFiles) {
          try {
            require(`${eventsDir}/${file}`);
            let eventName = file.split(".")[0];
            this.allEvents.push(eventName);
            this.loadedEvents.push("Discord event: " + eventName + ' ✅')
            quantityEvents++;
          } catch (error) {
            this.loadedEvents.push("Discord event load fail.")
          }
        }

        for (const subDir of subDirs) {
          loadDir(path.join(dir, subDir));
        }
      };

      ["database",
        "modalManager",
        "compra",
        "client",
        "guild",
        "ticket",
        "utils"].forEach(dir => {
          loadDir(dir);
        });

      console.log(`Was loaded ${quantityEvents} Discord Events`);
      for (let i = 0; i < this.loadedEvents.length; i++)
        console.log(this.loadedEvents[i]);
      this.loadedEvents = []
    } catch (error) {
      console.error(error);
    }
  }

  private async loadSlashCommands(): Promise<void> {
    const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] | RESTPostAPIApplicationGuildCommandsJSONBody[] = [];

    let quantityLoaded: number = 0

    const slashCommandsDir = path.join(__dirname, '.', 'slashCommands');

    fs.readdirSync(slashCommandsDir).forEach(async dir => {
      const dirPath = path.join(slashCommandsDir, dir);
      const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const slashCommand = require(filePath);

        slashCommands.push({
          name: slashCommand.name,
          description: slashCommand.description,
          type: slashCommand.type,
          options: slashCommand.options ? slashCommand.options : null,
          default_permission: slashCommand.default_permission ? slashCommand.default_permission : null,
          default_member_permissions: slashCommand.default_member_permissions ? PermissionsBitField.resolve(slashCommand.default_member_permissions).toString() : null
        })

        quantityLoaded++

        if (slashCommand.name) {
          this.client.slashCommands.set(slashCommand.name, slashCommand)
          this.loadedCommands.push("Discord command: " + file.split(".js")[0] + ' ✅')
        } else {
          this.loadedCommands.push("Discord command: " + file.split(".js")[0] + ' ❌')
        }
      }
    });

    (async () => {

      let data: RESTPutAPIApplicationCommandsJSONBody[]
        | RESTPutAPIApplicationGuildCommandsJSONBody[] = [];

      try {
        await this.removeSlashCommand();
      } catch (err) {
        console.log("Error deleting commands");
      }

      try {
        // if env set GUILD_ID, deploy commands on GUILD_ID
        if (this.settings.GUILD_ID) {
          data = await this.rest.put(
            Routes.applicationGuildCommands(
              this.settings.CLIENT_ID, this.settings.GUILD_ID),
            { body: slashCommands }) as RESTPutAPIApplicationGuildCommandsJSONBody[];
        } else {
          // not GUILD_ID, deploy commands globaly
          data = await this.rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: slashCommands }) as RESTPutAPIApplicationCommandsJSONBody[];
        }

        console.log(`Was loaded ${data.length} Slash Commands ${this.settings.GUILD_ID
          ? `on the server ${this.settings.GUILD_ID}`
          : `globaly`}`);

        for (let i = 0; i < this.loadedCommands.length; i++)
          console.log(this.loadedCommands[i]);

        this.loadedCommands = []
      } catch (error) {
        console.log(`${error}`);
      }
    })();
  }

  private async init() {
    await this.loadEvents();
    await this.loadSlashCommands();

    // Set up the client's event listeners
    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        const slashCommand = this.client.slashCommands.get(interaction.commandName);

        if (interaction.type === 4 && slashCommand?.autocomplete) {
          const choices: any[] = [];
          await slashCommand.autocomplete(interaction, choices);
        }

        if (!interaction.isCommand()) return;

        if (slashCommand.cooldown) {
          if (this.cooldown.has(`slash-${slashCommand.name}${interaction.user.id}`)) {
            let cooldownTime = this.cooldown.get(`slash-${slashCommand.name}${interaction.user.id}`)! - Date.now()
            return interaction.reply({
              content: settings.cooldowns.message.replace('<duration>', parseMs(cooldownTime)),
              ephemeral: true,
            });
          }

          if (slashCommand.userRoles && !this.checkPermissions(interaction.member as GuildMember, slashCommand.userRoles)) {
            const userRolesError = new EmbedBuilder()
              .setTitle(settings.erromsg.titulo)
              .setDescription(`${interaction.user} Você não possui o cargo necessário para executar este comando!`)
              .setColor(settings.color as ColorResolvable)
              .setFooter({ text: settings.footer })
              .setTimestamp();
            return interaction.reply({ embeds: [userRolesError], ephemeral: true });
          }

          if (slashCommand.userPerms || slashCommand.botPerms) {
            if (!(interaction.memberPermissions?.has(PermissionsBitField.resolve(slashCommand.userPerms || [])))) {
              const userPerms = new EmbedBuilder()
                .setTitle(settings.erromsg.titulo)
                .setDescription(`${interaction.user} Você não possui a permissão de **__${slashCommand.userPerms}__** para executar este comando!`)
                .setColor(settings.color as ColorResolvable)
                .setFooter({ text: settings.footer })
                .setTimestamp();
              return interaction.reply({ embeds: [userPerms], ephemeral: true });
            }

            if (!(interaction.guild?.members.cache.get(this.client.user.id)?.permissions.has(PermissionsBitField.resolve(slashCommand.botPerms || [])))) {
              const botPerms = new EmbedBuilder()
                .setTitle(settings.erromsg.titulo)
                .setDescription(`${interaction.user} Eu não possuo a permissão de **__${slashCommand.botPerms}__** para executar este comando!`)
                .setColor(settings.color as ColorResolvable)
                .setFooter({ text: settings.footer })
                .setTimestamp();
              return interaction.reply({ embeds: [botPerms], ephemeral: true });
            }
          }

          await slashCommand.run(this.client, interaction, this.botAvatar);

          this.cooldown.set(`slash-${slashCommand.name}${interaction.user.id}`, Date.now() + (slashCommand.cooldown * 1000));
          setTimeout(() => {
            this.cooldown.delete(`slash-${slashCommand.name}${interaction.user.id}`);
          }, slashCommand.cooldown * 1000);

        } else {

          if (slashCommand.userRoles && !this.checkPermissions(interaction.member as GuildMember, slashCommand.userRoles)) {
            const userRolesError = new EmbedBuilder()
              .setTitle(settings.erromsg.titulo)
              .setDescription(`${interaction.user} Você não possui o cargo necessário para executar este comando!`)
              .setColor(settings.color as ColorResolvable)
              .setFooter({ text: settings.footer })
              .setTimestamp();
            return interaction.reply({ embeds: [userRolesError], ephemeral: true });
          }

          if (slashCommand.userPerms || slashCommand.botPerms) {

            if (!(interaction.memberPermissions?.has(PermissionsBitField.resolve(slashCommand.userPerms || [])))) {
              const userPerms = new EmbedBuilder()
                .setTitle(settings.erromsg.titulo)
                .setDescription(`${interaction.user} Você não possui a permissão de **__${slashCommand.userPerms}__** para executar este comando!`)
                .setColor(settings.color as ColorResolvable)
                .setFooter({ text: settings.footer })
                .setTimestamp();
              return interaction.reply({ embeds: [userPerms], ephemeral: true });
            }

            if (!(interaction.guild?.members.cache.get(this.client.user.id)?.permissions.has(PermissionsBitField.resolve(slashCommand.botPerms || [])))) {
              const botPerms = new EmbedBuilder()
                .setTitle(settings.erromsg.titulo)
                .setDescription(`${interaction.user} Eu não possuo a permissão de **__${slashCommand.botPerms}__** para executar este comando!`)
                .setColor(settings.color as ColorResolvable)
                .setFooter({ text: settings.footer })
                .setTimestamp();
              return interaction.reply({ embeds: [botPerms], ephemeral: true });
            }
          }

          try {
            await slashCommand.run(this.client, interaction, this.botAvatar);
          } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ content: `⚠️ Ocorreu um erro ao tentar executar este comando. \nMais informações no console.`, ephemeral: true });
            } else {
              await interaction.reply({ content: `⚠️ Ocorreu um erro ao tentar executar este comando. \nMais informações no console.`, ephemeral: true });
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    })

    // this.client.on(Events.MessageCreate, async (message) => {
    //   // Add your code execution here
    // });

    this.client.on(Events.ClientReady, async () => {
      const activities: { name: string, type: ActivityType }[] = [
        { name: `Reading nounspace ⌐◨-◨`, type: ActivityType.Custom },
        { name: `nounspace ⌐◨-◨`, type: ActivityType.Watching },
        { name: `Writing nounspace ⌐◨-◨`, type: ActivityType.Custom },
        { name: `nounspace ⌐◨-◨`, type: ActivityType.Playing },
      ]

      let timer = 10;
      let i: number = 0
      setInterval(() => {
        if (i >= activities.length) i = 0;
        this.client.user.setPresence({ activities: [activities[i]] })
        i++
      }, timer * 1000)

      // const status: string[] = [
      //   'online',
      //   'dnd',
      //   'idle'
      // ]
      // let s: number = 0
      // setInterval(() => {
      //   if (s >= status.length) s = 0
      //   this.client.user.setPresence({status: [status[i]]})
      //   s++
      // }, timer * 1000)

    })

    // const currentTime = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    // logger.info(`${client.user.tag} ONLINE!`);
    // logger.info(`Iniciado em ${currentTime}`);
    console.log("Discord Bot initialized...");
    // Login to Discord with your bot token
    this.client.login(this.token);
    // this.sendMessageToChannel(`I'm awake fam! ⌐◨-◨`);
  }

  public async sendMessageToChannel(message: string, imageUrl?: string) {
    // const channel = this.client.channels.cache.get("1312959664496836688");
    const guildChannel = this.client.guilds.cache.get(settings.GUILD_ID)
      .channels.cache.get(settings.CHANNEL_ID)
    //("1312959316902281348")
    // .channels.cache.get("1312959664496836688")


    try {
      if (imageUrl)
        guildChannel.send({
          content: message,
          files: [{
            attachment: imageUrl,
            name: generateRandomImageName() + ".png"
          }]
        });
      else {
        guildChannel.send(message);
      }
      // channel.send(message)
      return true;
    } catch (error) {
      return false
    }
  }

  private checkPermissions(member: GuildMember, requiredRoles: string[]): boolean {
    return member.roles.cache.some(role => requiredRoles.includes(role.id));
  }

  public start() {
    console.log('Bot Started');
    // You can add some initialization code here, if needed
  }

  public stop() {
    console.log('Bot Stopped');
    // You can add some shutdown code here, if needed
  }


  private async removeSlashCommand() {
    //define here the command to delete
    let commandsToDelete = [
      // "1312486827948511306",
      // "1312486827948511305",
      // "1312486827948511304",
      // "1312961354881040388",
      // "1312961354881040387",
      // "1312961354881040386",
      // "1312961354881040385",
      // "1312443577879629951",
    ]

    if (commandsToDelete.length > 0) {
      for (let i = 0; i < commandsToDelete.length; i++) {
        // for guild-based commands
        await this.rest.delete(Routes.applicationGuildCommand(this.settings.CLIENT_ID, this.settings.GUILD_ID, commandsToDelete[i]))
          .then(() => console.log('Successfully deleted guild command ' + commandsToDelete[i]))
          .catch(() => console.log('Error deleting guild command ' + commandsToDelete[i]));

        // for global commands
        await this.rest.delete(Routes.applicationCommand(this.settings.CLIENT_ID, commandsToDelete[i]))
          .then(() => console.log('Successfully deleted application command ' + commandsToDelete[i]))
          .catch(() => console.log('Error deleting application command ' + commandsToDelete[i]));
      }
    }
  }

}

export default DiscordBot;
