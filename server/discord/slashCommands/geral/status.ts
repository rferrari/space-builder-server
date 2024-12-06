import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ColorResolvable, ChatInputCommandInteraction } from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../..//bot.controller';

module.exports = {
    name: "status",
    description: "Get Tom Server Status",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
    cooldown: 10, // in seconds

    ServerSample: null,
    // options: [
    //     {
    //     },
    // ],

    run: async (client: any, interaction: ChatInputCommandInteraction, avatar: BotAvatar) => {
        let result = undefined;
        try {
            // console.log(interaction)
            const uId = interaction.user.id;
            const uNa = interaction.user.username

            if (!ss.admins.includes(uId)) {
                interaction.reply({
                    content: `Hi ${uNa}, you cant do that!`,
                    ephemeral: false
                })
                return
            }

            const msg = interaction.options.getString("message");
            await interaction.deferReply({ ephemeral: false });
            const response = await avatar.handleCommand(interaction.commandName, 
                {name: interaction.user.username, 
                    message: msg})
            await interaction.editReply({ content: response.message});
      

            // if(ss.serverStatus){
            //     interaction.reply({ content: `Tom is already awake ${uNa}.`, ephemeral: false })
            // } else {
            // interaction.reply({ content: `${uNa} Tom is ${serverSample.state ? `awake` : `sleeping`}`, ephemeral: false })

            // console.dir();

            //     ss.serverStatus = true;
            // }
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