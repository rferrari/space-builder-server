interface Cooldowns {
    message: string;
}

interface ErrorMessage {
    titulo: string;
}

export interface Settings {
    color: string;
    titulo: string;
    footer: string;
    cooldowns: Cooldowns;
    erromsg: ErrorMessage;
    admins: string[];
    GUILD_ID: string;
    ENABLED: boolean;
    // TOKEN: string;
    // OWNER_ID: string;
    CLIENT_ID: string;
    CHANNEL_ID: string;
}

export interface CoolWord {
    [key: string]: string;
}
