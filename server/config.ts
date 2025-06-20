import dotenv from "dotenv";
dotenv.config();

export const ENV = process.env.ENV || "production";

export const BotName = "space-builder";
export const BotFID = 527313;
export const BotIcon = " ⌐◨-◨  ";
export const TIMEZONE = process.env.TIMEZONE || "America/Chicago";

// interval in minutes bot will cast new messages
// export const NEW_CASTS_INTERVAL_MIN = parseInt(process.env.NEW_CASTS_INTERVAL_MIN) || 0;
// export const PUBLISH_TO_FARCASTER = process.env.PUBLISH_TO_FARCASTER === 'true';

// export const MIN_REPLY_WORD_COUNT = parseInt(process.env.MIN_REPLY_WORD_COUNT) || 10;
// export const MIN_REPLY_CHAR_COUNT = parseInt(process.env.MIN_REPLY_CHAR_COUNT) || 10;

// filter last messages from a conversation FC chronological_parent_casts
export const LAST_CONVERSATION_LIMIT = parseInt(process.env.LAST_CONVERSATION_LIMIT) || 5;


// targets
// Maximum farcast fid/fname cache storage
// channel that bot will cast new messages
// export const CAST_TO_CHANNEL = "nounspace";
// export const MAX_USER_CACHE = 100;
// export const TARGETS = [
//   527313,            //  nounspacetom
//   874542,            //  clanker
// ];

// export const IGNORE_TARGETS = [
//   905725,         //pepeclankeragent
//   883378,         //mecode
//   12193,          //atlas
//   957325,         //TokuAniBot
// ];

// export const KNOW_BOT_LIST = process.env.KNOW_BOT_LIST
//   ? process.env.KNOW_BOT_LIST.split(",")
//   : [];


// only log AI messages, do not publish
export const LOG_MESSAGES = true;
export const DISPLAY_MEM_USAGE = false;

export const USE_WS = process.env.USE_WS === 'true';
export const WS_PORT = process.env.WS_PORT || "3040";

// in memory messages history size and expiration after X minutes with no interaction
export const maxMessageHistorySize = parseInt(process.env.MEMORY_EXPIRATION_MIN) || 20;
export const memoryExpirationDuration = parseInt(process.env.MEMORY_EXPIRATION_MIN) || 30;

// timer to check and clean up old memories
export const MEMORY_CLEANUP_MIN = parseInt(process.env.MEMORY_CLEANUP_MIN) || 60;
// export const FARCASTER_TRENDING_MIN = parseInt(process.env.FARCASTER_TRENDING_MIN) || 1440;



// LLM Available Models 
// const llama3_8b_8192 = "llama3-8b-8192";
// const llama32_90b_textpreview = "llama-3.2-90b-text-preview";
// const llama32_3b_preview = "llama-3.2-3b-preview";
// const llama3_70b_8192 = "llama3-70b-8192";
// const llama32_90b_vision = "llama-3.2-90b-vision-preview";
// const llama_32_11b_vision = "llama-3.2-11b-vision-preview";
// const gpt_4o = "gpt-4o";
// const gpt_4_turbo = "gpt-4-turbo";

const gpt_4o_mini = "gpt-4o-mini";       // Smaller, cheaper, faster version of GPT-4o
const gpt_41 = "gpt-4-1";                // Full GPT-4.1 model (API only, not in ChatGPT UI)


// export const BotLLMModel = llama3_70b_8192;
export const BotLLMModel = process.env.BOT_LLM_MODEL || gpt_4o_mini;//gpt_4_turbo;//gpt_4o;//llama3_8b_8192;
export const BotLLMModel_TEMP = parseFloat(process.env.BOT_LLM_MODEL_TEMP) || 0.7;
export const ChatBackupLLMModel = gpt_4o_mini;
export const ChatClankersMModel = gpt_4o_mini;

export const RAGLLMModel = gpt_4o_mini;
export const JSONLLMModel = gpt_4o_mini;
export const AssistentModel = gpt_4o_mini;
export const VisionModel = gpt_4o_mini;

// export const GROQ_API_KEY = process.env.GROQ_API_KEY!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "";

// export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
// export const HUB_RPC = process.env.HUB_RPC! || "nemes.farcaster.xyz:2283";
// export const HUB_SSL = process.env.HUB_SSL! || "true";
// export const SIGNER_UUID = process.env.SIGNER_UUID!;

// export const PUBLISH_TO_DISCORD = process.env.PUBLISH_TO_DISCORD === 'true';
