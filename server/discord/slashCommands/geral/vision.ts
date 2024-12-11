import {
    EmbedBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ColorResolvable,
    ChatInputCommandInteraction,
    MessageManager
} from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../../bot.controller'
import { BotChatMessage } from '../../../bot.types'

module.exports = {
    name: "vision",
    description: "Check Tom's Vision",
    type: ApplicationCommandType.ChatInput,
    // default_member_permissions: 'ManageMessages',
    cooldown: 1, // in seconds

    options: [
        {
            name: 'image',
            description: "Image URL",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'message',
            description: "Type your message",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],

    run: async (client: any, interaction: ChatInputCommandInteraction, avatar: BotAvatar) => {
        let result = undefined
        try {
            // console.log(interaction)
            console.log("Checking Tom' Vision")
            // console.dir(interaction)

            const imageUrl = interaction.options.getString("image");
            const message = interaction.options.getString("message");

            const chatmsg: BotChatMessage = {
                name: interaction.user.username,
                message,
                imageUrl
            }

            await interaction.deferReply({ ephemeral: false });
            // await wait(4_000);
            const response = await avatar.handleCommand(interaction.commandName, chatmsg);
            // {name: interaction.user.username, chatmsg })

            await interaction.editReply({ content: response.message });

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
