import dotenv from "dotenv";
dotenv.config();

export const ENV = process.env.ENV || "production";

// configs 
export const BotName = "nounspacetom";
export const BotFID = 527313;
export const BotIcon = " ⌐◨-◨  ";
export const TIMEZONE = process.env.TIMEZONE || "America/Chicago";

export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || "1510572746cd80c0bb93e2115d44340f";
export const NOTION_PAGE_IDS = [
  "https://nounspace.notion.site/Tom-s-Background-1460572746cd804a8216f6a0a2f34e5c",
  "https://nounspace.notion.site/nounspace-app-info-1460572746cd802fb2dbf6a7ce99eecd",
  "https://nounspace.notion.site/nounspace-DAO-info-1460572746cd8049b9bcf3605c7a2dda",
  "https://nounspace.notion.site/SPACE-token-info-1460572746cd80dbbee1fa3125a5d9bd",
  "https://nounspace.notion.site/nOGs-info-1460572746cd80f2a3b7ef6e52034424",
  "https://nounspace.notion.site/nounspace-Fidgets-1480572746cd80eaae5ae86e630277ab"
]

// interval in minutes bot will cast new messages
export const NEW_CASTS_INTERVAL_MIN = parseInt(process.env.NEW_CASTS_INTERVAL_MIN) || 0;
export const PUBLISH_TO_FARCASTER = process.env.PUBLISH_TO_FARCASTER === 'true';

export const MIN_REPLY_WORD_COUNT = parseInt(process.env.MIN_REPLY_WORD_COUNT) || 10;
export const MIN_REPLY_CHAR_COUNT = parseInt(process.env.MIN_REPLY_CHAR_COUNT) || 10;

// filter last messages from a conversation FC chronological_parent_casts
export const LAST_CONVERSATION_LIMIT = parseInt(process.env.LAST_CONVERSATION_LIMIT) || 5;


// targets
// Maximum farcast fid/fname cache storage
// channel that bot will cast new messages
export const CAST_TO_CHANNEL = "nounspace";
export const MAX_USER_CACHE = 100;
export const TARGETS = [
  527313,            //  nounspacetom
  874542,            //  clanker
  // 862185,            //  aethernet
  // 382802,             //  askgina.eth
  // 364927,             //  paybot
  // 20596,              //  bountybot
];

export const IGNORE_TARGETS = [
  905725,         //pepeclankeragent
  883378,         //mecode
  12193,          //@atlas
  236578,         // pepenn212
];



// channels bot will listen to new messages
export const TARGET_CHANNELS = [
  "~/channel/nounspace",
  // "~/channel/skateboard",
  // "~/channel/farcaster"
]

// only log AI messages, do not publish
export const LOG_MESSAGES = true;
export const DISPLAY_MEM_USAGE = false;

export const USE_WS = process.env.USE_WS === 'true';
export const WS_PORT = process.env.WS_PORT!;

// in memory messages history size and expiration after X minutes with no interaction
export const MESSAGES_HISTORY_SIZE = parseInt(process.env.MEMORY_EXPIRATION_MIN) || 20;
export const MEMORY_EXPIRATION_MIN = parseInt(process.env.MEMORY_EXPIRATION_MIN) || 30;

// timer to check and clean up old memories
export const MEMORY_CLEANUP_MIN = parseInt(process.env.MEMORY_CLEANUP_MIN) || 60;
export const FARCASTER_TRENDING_MIN = parseInt(process.env.FARCASTER_TRENDING_MIN) || 1440;



// LLM Available Models 
const llama3_8b_8192 = "llama3-8b-8192";
const llama32_90b_textpreview = "llama-3.2-90b-text-preview";
const llama32_3b_preview = "llama-3.2-3b-preview";
const llama3_70b_8192 = "llama3-70b-8192";
const llama32_90b_vision = "llama-3.2-90b-vision-preview";
const llama_32_11b_vision = "llama-3.2-11b-vision-preview";
const gpt_4o = "gpt-4o";
const gpt_4_turbo = "gpt-4-turbo";


// export const BotLLMModel = llama3_70b_8192;
export const BotLLMModel = process.env.BOT_LLM_MODEL || gpt_4_turbo;//gpt_4o;//llama3_8b_8192;
export const BotLLMModel_TEMP = parseFloat(process.env.BOT_LLM_MODEL_TEMP) || 0.7;
export const ChatBackupLLMModel = llama3_8b_8192;
// export const ChatBackupLLMModel = llama3_70b_8192;
export const ChatClankersMModel = llama3_70b_8192;

export const RAGLLMModel = llama3_8b_8192;
export const JSONLLMModel = llama3_8b_8192;
export const AssistentModel = llama3_8b_8192;
export const VisionModel = llama32_90b_vision;

export const GROQ_API_KEY = process.env.GROQ_API_KEY!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "";

export const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID!;
export const NOTION_INTEGRATION_TOKEN = process.env.NOTION_INTEGRATION_TOKEN!;
//export const NOTION_PAGE_IDS = (process.env.NOTION_PAGE_IDS as string).split(",");

export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
export const HUB_RPC = process.env.HUB_RPC! || "nemes.farcaster.xyz:2283";
export const HUB_SSL = process.env.HUB_SSL! || "true";
export const SIGNER_UUID = process.env.SIGNER_UUID!;


export const DISCORD_ENABLED = process.env.DISCORD_ENABLED === 'true';
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
export const DISCORD_OWNER_ID = process.env.DISCORD_OWNER_ID || "";
export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
export const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || "";

export const PUBLISH_TO_DISCORD = process.env.PUBLISH_TO_DISCORD === 'true';


