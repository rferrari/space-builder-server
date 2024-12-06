import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ColorResolvable, ChatInputCommandInteraction } from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../../bot.controller';

module.exports = {
    name: "reload",
    description: "Help Tom Refresh",
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
                    name: `Reload Documents`,
                    value: `reloadDocs`,
                },
                {
                    name: `Reload Vars`,
                    value: `reloadVars`,
                }
            ]
        }],

    run: async (client: any, interaction: ChatInputCommandInteraction, avatar: BotAvatar) => {
        let result = undefined
        try {
            // console.log(interaction)
            // console.dir(interaction)
            console.log("Reloading Docs")

            // Get inputs
            const uId = interaction.user.id;
            const uName = interaction.user.username
            const sure = interaction.options.getString('sure')
            // const msg = interaction.options.getString("message");

            // check admins permissions
            if (!ss.admins.includes(uId)) {
                interaction.reply({
                    content: `Hi ${uName}, you cant do that!`,
                    ephemeral: false
                })
                return
            }

            // check inputs and execute commands
            if (sure !== "cancel") {
                // if (avatar.getisRunning()) {

                    // send app is thinking....
                    await interaction.deferReply({ ephemeral: false });

                    // execute command
                    const response = await avatar.handleCommand(interaction.commandName,
                        { name: interaction.user.username, message: sure })

                    //return reply
                    await interaction.editReply({ content: response.message });

                    result = true
                // } else {
                    // interaction.reply({ content: `Got it ${uName}, reloading...`, ephemeral: false })
                // }
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