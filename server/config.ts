import dotenv from "dotenv";
dotenv.config();

export const ENV = process.env.ENV || "production";

export const BotName = "space-builder";
export const BotIcon = " ⌐◨-◨  ";
export const TIMEZONE = process.env.TIMEZONE || "America/Chicago";

// filter last messages from a conversation FC chronological_parent_casts
export const LAST_CONVERSATION_LIMIT = parseInt(process.env.LAST_CONVERSATION_LIMIT) || 5;

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

const gpt_4o_mini = "gpt-4o-mini";       // Smaller, cheaper, faster version of GPT-4o
const gpt_41 = "gpt-4.1-2025-04-14";                // Full GPT-4.1 model (API only, not in ChatGPT UI)

const claude_37 = "claude-3-7-sonnet-20250219"
const claude_4 = "claude-sonnet-4-20250514"


export const CHAT_BOT_MODEL = gpt_4o_mini;
export const CHAT_BOT_TEMP = 0.2

export const WORKERS_MODEL = gpt_41;
export const WORKERS_TEMP = 0.1

export const VENICE_JSON_MODEL = process.env.VENICE_JSON_MODEL || "deepseek-coder-v2-lite";
export const JSON_MODEL = claude_4;
export const JSON_TEMP = 0;

// export const GROQ_API_KEY = process.env.GROQ_API_KEY!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
export const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1/";

export const VENICE_API_KEY = process.env.VENICE_API_KEY! || "";
export const VENICE_BASE_URL = process.env.VENICE_BASE_URL || "https://api.venice.ai/v1";
