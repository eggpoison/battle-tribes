import { chatboxState } from "../ui-state/chatbox-state.svelte";
import { sendChatMessagePacket } from "./networking/packet-sending";

export interface ChatMessage {
   readonly username: string;
   readonly message: string;
}

interface SpamFilter {
   readonly testDuration: number;
   readonly maxMessages: number;
}

const ALLOWED_KEYS_PAST_MAXIMUM: ReadonlyArray<string> = ["Enter", "Backspace", "Escape", "ArrowRight", "ArrowLeft"];
const MAX_CHAT_MESSAGES = 50;
const MAX_CHAR_COUNT = 128;

const spamFilterHistory = new Array<[string, number]>();

const SPAM_FILTER: SpamFilter = {
   testDuration: 5,
   maxMessages: 5
};

const chatMessages = new Array<ChatMessage>();

export function updateSpamFilter(deltaTimeMS: number): void {
   for (let i = spamFilterHistory.length - 1; i >= 0; i--) {
      const spamFilterMessage = spamFilterHistory[i];
      spamFilterMessage[1] -= deltaTimeMS / 1000;
      if (spamFilterMessage[1] <= 0) {
         spamFilterHistory.splice(i, 1);
      }
   }
}

const messagePassesSpamFilter = (message: string): boolean => {
   if (spamFilterHistory.length >= SPAM_FILTER.maxMessages) {
      return false;
   }

   spamFilterHistory.push([message, SPAM_FILTER.testDuration]);

   return true;
}

export function onChatboxKeyPress(e: KeyboardEvent): void {
   // Don't type past the max char count
   // @HACK!!! @SQUEAM
   const chatMessage = "";
   // const chatMessage = inputBoxRef.current!.value;
   throw new Error();
   if (chatMessage.length >= MAX_CHAR_COUNT) {
      const isAllowed = e.shiftKey || e.metaKey || ALLOWED_KEYS_PAST_MAXIMUM.includes(e.key);

      if (!isAllowed) {
         e.preventDefault();
         return;
      }
   }

   const key = e.key;
   switch (key) {
      case "Escape": {
         // Cancel the chat message
         chatboxState.setIsFocused(false);

         break;
      }
      case "Enter": {
         // Send the chat message

         if (!messagePassesSpamFilter(chatMessage)) return;

         if (chatMessage !== "") {
            sendChatMessagePacket(chatMessage);
         }

         chatboxState.setIsFocused(false);

         break;
      }
   }
}

export function addChatMessage(username: string, message: string): void {
   chatMessages.push({
      username: username,
      message: message
   });

   // Remove a chat message if the number of messages has exceeded the maximum
   if (chatMessages.length > MAX_CHAT_MESSAGES) {
      chatMessages.splice(0, 1);
   }

   // @Garbage @Speed
   chatboxState.setChatMessages(chatMessages.slice());
}