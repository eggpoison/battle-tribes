import { ChatMessage } from "../game/chat";

export const chatboxState = {
   isFocused: false,
   chatMessage: "",
   chatMessages: new Array<ChatMessage>()
};