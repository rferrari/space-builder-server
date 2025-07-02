import dotenv from "dotenv";
dotenv.config();

export const ENVIRONMENT = process.env.ENV || "production";
export const BOT_NAME = "space-builder";
export const BOT_ICON = " ⌐◨-◨  ";
export const DEFAULT_TIMEZONE = process.env.TIMEZONE || "America/Chicago";
export const MAX_LAST_CONVERSATION_LIMIT = parseInt(process.env.LAST_CONVERSATION_LIMIT) || 5;
export const ENABLE_LOGGING = true;
export const ENABLE_WEBSOCKETS = process.env.USE_WS === 'true';
export const WEBSOCKET_PORT = process.env.WS_PORT || "3040";
export const MAX_MESSAGE_HISTORY_SIZE = parseInt(process.env.MEMORY_EXPIRATION_MIN) || 20;
export const MEMORY_EXPIRATION_DURATION = parseInt(process.env.MEMORY_EXPIRATION_MIN) || 30;
export const MEMORY_CLEANUP_INTERVAL_MINUTES = parseInt(process.env.MEMORY_CLEANUP_MIN) || 60;
export const DEFAULT_CHAT_BOT_MODEL = "gpt-4o-mini"; // or whatever the default is
export const DEFAULT_WORKERS_MODEL = "gpt-4.1-2025-04-14"; // or whatever the default is
// export const DEFAULT_VENICE_JSON_MODEL = process.env.VENICE_JSON_MODEL || "qwen-2.5-qwq-32b";
export const DEFAULT_VENICE_JSON_MODEL = process.env.VENICE_JSON_MODEL 
|| "deepseek-coder-v2-lite"
|| "dolphin-2.9.2-qwen2-72b" 
// || "qwen-2.5-coder-32b" 
|| "mistral-31-24b" 
|| "qwen-2.5-qwq-32b";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "";
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
export const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1/";
export const VENICE_API_KEY = process.env.VENICE_API_KEY! || "";
export const VENICE_BASE_URL = process.env.VENICE_BASE_URL || "https://api.venice.ai/v1";
export const CHAT_BOT_TEMP = 0.2; // or whatever the default is
export const WORKERS_TEMP = 0.1; // or whatever the default is
export const JSON_TEMP = 0; // or whatever the default is
export const JSON_MODEL = "claude-sonnet-4-20250514"; // or whatever the default is
