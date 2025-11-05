import { ChatMessage } from "../game/chat";

let isFocused = $state(false);
let chatMessages = $state(new Array<ChatMessage>());

export const chatboxState = {
   get isFocused() {
      return isFocused;
   },
   setIsFocused(newIsFocused: boolean): void {
      isFocused = newIsFocused;
   },

   get chatMessages() {
      return chatMessages;
   },
   setChatMessages(newChatMessages: Array<ChatMessage>): void {
      chatMessages = newChatMessages;
   }
};