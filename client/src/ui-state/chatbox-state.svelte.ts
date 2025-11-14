import { ChatMessage } from "../game/chat";

export const chatboxState = $state({
   isFocused: false,
   chatMessage: "",
   chatMessages: new Array<ChatMessage>()
});