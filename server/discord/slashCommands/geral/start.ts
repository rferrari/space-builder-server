import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ColorResolvable, ChatInputCommandInteraction } from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../../bot.controller';

module.exports = {
    name: "start",
    description: "Make Tom Start Handling Events",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
    cooldown: 10, // in seconds

    options: [
        {
            name: 'sure',
            description: `Are you Sure?`,
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: `Forget it!`,
                    value: `cancel`,
                },
                {
                    name: `Yeah, From last savevd event`,
                    value: `saved`,
                },
                {
                    name: `Yeah, From HEAD`,
                    value: `head`,
                }
            ]
        }],

    run: async (client: any, interaction: ChatInputCommandInteraction, avatar: BotAvatar) => {
        let result = undefined;
        try {
            // console.log(interaction)
            const uId = interaction.user.id;
            const uName = interaction.user.username
            const sure = interaction.options.getString('sure')

            if (!ss.admins.includes(uId)) {
                interaction.reply({
                    content: `Hi ${uName}, you cant do that!`,
                    ephemeral: false
                })
                return
            }

            if (sure !== "cancel") {
                if (avatar.getisRunning()) {
                    interaction.reply({ content: `Tom is already awake ${uName}.`, ephemeral: false })
                } else {
                    interaction.reply({ content: `Got it ${uName}, waking up Tom`, ephemeral: false })
                    const response = await avatar.handleCommand(interaction.commandName,
                        { name: interaction.user.username, message: sure })
                }
            } else {
                interaction.reply({ content: `Nothing done!`, ephemeral: false })
            }
        } catch (err) {
            console.error("error running " + interaction.commandName)
            result = false;
        }
        return result
    }
}