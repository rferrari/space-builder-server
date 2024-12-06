import {
    EmbedBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ColorResolvable,
    ChatInputCommandInteraction
} from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../../bot.controller'

import { generateRandomImageName } from '../../utils'

module.exports = {
    name: "pixelart",
    description: "Artist Tom",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
    // default_member_permissions: 'ManageMessages',
    cooldown: 60, // in seconds

    options: [
        {
            name: 'message',
            description: "Descricao Imagem",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],

    run: async (client: any, interaction: ChatInputCommandInteraction, avatar: BotAvatar) => {
        let result = undefined
        try {
            // console.log(interaction)
            console.log("Artist Tom")
            // console.dir(interaction)

            const msg = interaction.options.getString("message");

            await interaction.deferReply({ ephemeral: false });
            // await wait(4_000);
            const response = await avatar.handleCommand(interaction.commandName,
                { name: interaction.user.username, message: msg })

            await interaction.editReply({ content: response.name, files: [{ attachment: response.message, name: generateRandomImageName() + ".png" }] });

            // interaction.reply()
            result = true
        } catch (err) {
            await interaction.editReply({ content: "Sorry, can you repeat please?" });
            console.error("error running " + interaction.commandName)
            result = false;
        }

        return result
    }
}
/*
ChatInputCommandInteraction {
    type: 2,
    id: '1312539813932699658',
    applicationId: '1312248747664867382',
    channelId: '1312445243244675205',
    guildId: '1312445242661933056',
    user: User {
      id: '471201072543825921',
      bot: false,
      system: false,
      flags: UserFlagsBitField { bitfield: 256 },
      username: 'jhonattanferri',
      globalName: 'Jhonattan Ferri (DevFerri)',
      discriminator: '0',
      avatar: '231dfa79a13bbe58b3be8fa3cbb9d644',
      banner: undefined,
      accentColor: undefined,
      avatarDecoration: null,
      avatarDecorationData: null
    },
    member: GuildMember {
      guild: Guild {
        id: '1312445242661933056',
        name: "vaipraonde's server",
        icon: null,
        features: [],
        commands: [GuildApplicationCommandManager],
        members: [GuildMemberManager],
        channels: [GuildChannelManager],
        bans: [GuildBanManager],
        roles: [RoleManager],
        presences: PresenceManager {},
        voiceStates: [VoiceStateManager],
        stageInstances: [StageInstanceManager],
        invites: [GuildInviteManager],
        scheduledEvents: [GuildScheduledEventManager],
        autoModerationRules: [AutoModerationRuleManager],
        available: true,
        shardId: 0,
        splash: null,
        banner: null,
        description: null,
        verificationLevel: 0,
        vanityURLCode: null,
        nsfwLevel: 0,
        premiumSubscriptionCount: 0,
        discoverySplash: null,
        memberCount: 4,
        large: false,
        premiumProgressBarEnabled: false,
        applicationId: null,
        afkTimeout: 300,
        afkChannelId: null,
        systemChannelId: '1312445243244675205',
        premiumTier: 0,
        widgetEnabled: null,
        widgetChannelId: null,
        explicitContentFilter: 0,
        mfaLevel: 0,
        joinedTimestamp: 1732994511860,
        defaultMessageNotifications: 0,
        systemChannelFlags: [SystemChannelFlagsBitField],
        maximumMembers: 500000,
        maximumPresences: null,
        maxVideoChannelUsers: 25,
        maxStageVideoChannelUsers: 50,
        approximateMemberCount: null,
        approximatePresenceCount: null,
        vanityURLUses: null,
        rulesChannelId: null,
        publicUpdatesChannelId: null,
        preferredLocale: 'en-US',
        safetyAlertsChannelId: null,
        ownerId: '814615935301320724',
        emojis: [GuildEmojiManager],
        stickers: [GuildStickerManager]
      },
      joinedTimestamp: 1732994703681,
      premiumSinceTimestamp: null,
      nickname: null,
      pending: false,
      communicationDisabledUntilTimestamp: null,
      user: User {
        id: '471201072543825921',
        bot: false,
        system: false,
        flags: [UserFlagsBitField],
        username: 'jhonattanferri',
        globalName: 'Jhonattan Ferri (DevFerri)',
        discriminator: '0',
        avatar: '231dfa79a13bbe58b3be8fa3cbb9d644',
        banner: undefined,
        accentColor: undefined,
        avatarDecoration: null,
        avatarDecorationData: null
      },
      avatar: null,
      flags: GuildMemberFlagsBitField { bitfield: 0 }
    },
    version: 1,
    appPermissions: PermissionsBitField { bitfield: 2251799813685247n },
    memberPermissions: PermissionsBitField { bitfield: 2248473465835073n },
    locale: 'pt-BR',
    guildLocale: 'en-US',
    entitlements: Collection(0) [Map] {},
    authorizingIntegrationOwners: { '0': '1312445242661933056' },
    context: 0,
    commandId: '1312486827948511304',
    commandName: 'talk',
    commandType: 1,
    commandGuildId: null,
    deferred: false,
    replied: false,
    ephemeral: null,
    webhook: InteractionWebhook { id: '1312248747664867382' },
    options: CommandInteractionOptionResolver {
      _group: null,
      _subcommand: null,
      _hoistedOptions: []
    }
  }
  */