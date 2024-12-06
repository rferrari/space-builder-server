import {
    EmbedBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ColorResolvable,
    ChatInputCommandInteraction
} from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../../bot.controller';

module.exports = {
    name: "stop",
    description: "Make Tom Stop Handling Events",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
    // default_member_permissions: 'ManageMessages',
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
                    name: `Yeah, i know what I am doing.`,
                    value: `true`,
                }
            ]
        }],

    run: async (client: any, interaction: ChatInputCommandInteraction, avatar: BotAvatar) => {
        let result = undefined;
        try {
            // console.log(interaction)
            const uId = interaction.user.id;
            const uNa = interaction.user.username
            const sure = interaction.options.getString('sure')

            if (!ss.admins.includes(uId)) {
                // not allowed user
                interaction.reply({
                    content: `Hi ${uNa}, you cant do that!`,
                    ephemeral: false
                })
                return;
            }

            if (sure == 'true') {
                if (avatar.getisRunning()) {
                    interaction.reply({ content: `Got it ${uNa}, stopping Tom`, ephemeral: false })
                    const response = await avatar.handleCommand(interaction.commandName, 
                        {name: interaction.user.username, message: ""})
                } else {
                    interaction.reply({ content: `Nothing done!`, ephemeral: false })
                }
            } else {
                interaction.reply({ content: `Nothing done!`, ephemeral: false })
            }
            result = true;
        } catch (err) {
            console.error("error running " + interaction.commandName)
            result = false;
        }
        // console.log(`Got it ${uNa}, startting Tom`)
        // console.dir(interaction)
        return result
    }
}


//https://discord.com/oauth2/authorize?client_id=1312248747664867382