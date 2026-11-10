import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { DATA_DIR, DataError } from "./store";

// Buyer and seller messages, and saved AI chats, in one JSON file next to the catalog.
// There are no accounts yet, so this is one shared workspace like the rest of the data layer.

const FILE = join(DATA_DIR, "conversations.json");

export const MAX_TEXT = 4000;
const MAX_THREADS = 500;
const MAX_PER_THREAD = 1000;
const MAX_CHATS = 50;
const MAX_CHAT_MESSAGES = 200;
const MAX_CHAT_BYTES = 400_000;

const Id = z.string().min(1).max(120).regex(/^[\w.:-]+$/, "Invalid id");

export const MessageSchema = z.object({
  id: Id,
  from: z.enum(["buyer", "seller"]),
  text: z.string().min(1).max(MAX_TEXT),
  at: z.string().min(1).max(40),
});
export type StoredMessage = z.infer<typeof MessageSchema>;

export const PostMessageSchema = z.object({
  threadId: Id,
  from: z.enum(["buyer", "seller"]),
  text: z.string().trim().min(1, "Message is empty").max(MAX_TEXT, "Message is too long"),
  /** Lets a retried post land once. The server keeps this id when it is unused. */
  clientId: Id.optional(),
});

const Text = z.string().max(MAX_TEXT);
const ChatMessageSchema = z.discriminatedUnion("role", [
  z.object({ id: Id, role: z.literal("user"), text: Text }),
  z.object({
    id: Id,
    role: z.literal("agent"),
    text: Text,
    cards: z.array(z.record(z.string(), z.unknown())).max(30),
    steps: z.array(z.string().max(500)).max(40),
  }),
  z.object({ id: Id, role: z.literal("error"), text: Text, retryText: Text }),
]);

export const ChatSchema = z.object({
  id: Id,
  title: z.string().max(200),
  messages: z.array(ChatMessageSchema).max(MAX_CHAT_MESSAGES),
  updatedAt: z.number().finite(),
});
export type StoredChat = z.infer<typeof ChatSchema>;

const FileSchema = z.object({
  threads: z.record(z.string(), z.array(MessageSchema)).default({}),
  chats: z.array(ChatSchema).default([]),
});
type ConversationsFile = z.infer<typeof FileSchema>;

function read(): ConversationsFile {
  try {
    return FileSchema.parse(JSON.parse(readFileSync(FILE, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { threads: {}, chats: [] };
    throw error;
  }
}

/** Synchronous read, change, atomic rename, so writes are serialized in the local Node server. */
function update<T>(change: (file: ConversationsFile) => T): T {
  const file = read();
  const result = change(file);
  mkdirSync(DATA_DIR, { recursive: true });
  const temp = join(DATA_DIR, `conversations-${process.pid}.tmp`);
  writeFileSync(temp, JSON.stringify(FileSchema.parse(file)), { mode: 0o600 });
  renameSync(temp, FILE);
  return result;
}

let counter = 0;
const serverId = () => `msg-${Date.now().toString(36)}-${(++counter).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function readThreads(): Record<string, StoredMessage[]> {
  return read().threads;
}

export function appendMessage(input: z.infer<typeof PostMessageSchema>): StoredMessage {
  return update((file) => {
    const thread = file.threads[input.threadId] ?? [];
    const duplicate = input.clientId ? thread.find((m) => m.id === input.clientId) : undefined;
    if (duplicate) return duplicate;
    if (!file.threads[input.threadId] && Object.keys(file.threads).length >= MAX_THREADS) {
      throw new DataError("Too many conversations in this workspace", 429);
    }
    const taken = input.clientId && Object.values(file.threads).some((t) => t.some((m) => m.id === input.clientId));
    const message: StoredMessage = {
      id: input.clientId && !taken ? input.clientId : serverId(),
      from: input.from,
      text: input.text,
      at: new Date().toISOString(),
    };
    file.threads[input.threadId] = [...thread, message].slice(-MAX_PER_THREAD);
    return message;
  });
}

export function readChats(): StoredChat[] {
  return [...read().chats].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function upsertChat(chat: StoredChat): StoredChat {
  if (JSON.stringify(chat).length > MAX_CHAT_BYTES) throw new DataError("This chat is too large to save", 413);
  return update((file) => {
    const rest = file.chats.filter((c) => c.id !== chat.id);
    file.chats = [chat, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
    return chat;
  });
}
