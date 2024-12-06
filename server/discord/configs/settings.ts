// settings.ts
import * as botConfig from "../../config";
import { Settings } from "../interfaces"

const settings: Settings = {
    color: "#2B2D31",
    titulo: "TOM CEO ⌐◨-◨",
    footer: "Copyright © 2024, TOM CEO ⌐◨-◨.",
    
    cooldowns: {
        message: "Wait `<duration>` run command again!"
    },

    erromsg: {
        titulo: "🤔 Opps, Sorry, can you retry?!"
    },

    admins: botConfig.DISCORD_OWNER_ID.split(" "),
    GUILD_ID: botConfig.DISCORD_GUILD_ID,
    CLIENT_ID: botConfig.DISCORD_CLIENT_ID,
    CHANNEL_ID: botConfig.DISCORD_CHANNEL_ID,
    ENABLED: botConfig.DISCORD_ENABLED,
};

export default settings;