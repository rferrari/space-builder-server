import {
  EmbedBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ColorResolvable,
  ChatInputCommandInteraction
} from 'discord.js'

import ss from '../../configs/settings'
import { BotAvatar } from '../../../bot.controller'

module.exports = {
  name: "talk",
  description: "Talk to tom",
  type: ApplicationCommandType.ChatInput,
  // default_member_permissions: 'ManageMessages',
  cooldown: 0, // in seconds

  options: [
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
      console.log("Talking Tom")
      // console.dir(interaction)

      const msg = interaction.options.getString("message");

      await interaction.deferReply({ ephemeral: false });
      // await wait(4_000);
      const response = await avatar.handleCommand(interaction.commandName, 
        {name: interaction.user.username, message: msg})

      await interaction.editReply({ content: response.message});

      // interaction.reply()
      result = true
    } catch (err) {
      await interaction.editReply({ content: "Sorry, can you repeat please?"});
      console.error("error running " + interaction.commandName)
      result = false;
    }
    
    return result
  }
}
