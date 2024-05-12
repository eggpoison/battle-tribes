import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { useCallback, useEffect, useRef, useState } from "react";
import Client from "../../client/Client";
import Player from "../../entities/Player";

interface SpamFilter {
   readonly testDuration: number;
   readonly maxMessages: number;
}

const spamFilterHistory = new Array<[string, number]>();

const SPAM_FILTER: SpamFilter = {
   testDuration: 5,
   maxMessages: 5
};

export function updateSpamFilter(): void {
   for (let idx = spamFilterHistory.length - 1; idx >= 0; idx--) {
      const spamFilterMessage = spamFilterHistory[idx];
      spamFilterMessage[1] -= 1 / Settings.TPS;
      if (spamFilterMessage[1] <= 0) {
         spamFilterHistory.splice(idx, 1);
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

const ALLOWED_KEYS_PAST_MAXIMUM: ReadonlyArray<string> = ["Enter", "Backspace", "Escape", "ArrowRight", "ArrowLeft"];

const MAX_CHAT_MESSAGES = 50;

const MAX_CHAR_COUNT = 128;

type ChatMessage = {
   readonly senderName: string;
   readonly message: string;
}

let addChatMessageReference: (senderName: string, message: string) => void;
export function addChatMessage(senderName: string, message: string): void {
   addChatMessageReference(senderName, message);
}

export let focusChatbox: () => void = () => {};
export let chatboxIsFocused = false;

const ChatBox = () => {
   const chatboxRef = useRef<HTMLDivElement | null>(null);
   const inputBoxRef = useRef<HTMLInputElement | null>(null);
   const [chatMessages, setChatMessages] = useState<Array<ChatMessage>>([]);
   const [isFocused, setIsFocused] = useState<boolean>(false);

   const addChatMessage = useCallback((senderName: string, message: string): void => {
      const newChatMessages = chatMessages.slice();

      newChatMessages.push({
         senderName: senderName,
         message: message
      });

      // Remove a chat message if the number of messages has exceeded the maximum
      if (newChatMessages.length > MAX_CHAT_MESSAGES) {
         newChatMessages.splice(0, 1);
      }

      if (!isFocused) {
         chatboxRef.current!.classList.remove("idle");
         if (chatboxRef.current!.offsetHeight) {} // Refresh the element
         chatboxRef.current!.classList.add("idle");
      }

      setChatMessages(newChatMessages);
   }, [chatMessages, isFocused]);

   const closeChatbox = useCallback(() => {
      setIsFocused(false);

      // Reset the chat preview
      inputBoxRef.current!.blur();
   }, []);

   const keyPress = (e: KeyboardEvent): void => {
      // Don't type past the max char count
      const chatMessage = inputBoxRef.current!.value;
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
            closeChatbox();

            break;
         }
         case "Enter": {
            // Send the chat message
            const chatMessage = inputBoxRef.current!.value;

            if (!messagePassesSpamFilter(chatMessage)) return;

            if (chatMessage !== "") {
               Client.sendChatMessage(chatMessage);

               const playerComponent = Player.instance!.getServerComponent(ServerComponentType.player);
               addChatMessage(playerComponent.username, chatMessage);
            }

            closeChatbox();

            break;
         }
      }
   }

   useEffect(() => {
      chatboxIsFocused = isFocused;

      if (!isFocused) {
         inputBoxRef.current!.value = "";
      }
   }, [isFocused]);

   useEffect(() => {
      addChatMessageReference = addChatMessage;
   }, [addChatMessage]);

   useEffect(() => {
      focusChatbox = (): void => {
         inputBoxRef.current!.focus();
         setIsFocused(true);
      };
   }, []);

   return (
      <div id="chat-box" className={`${!isFocused ? "idle" : ""}`} ref={chatboxRef}>
         <div className="message-history">
            {chatMessages.map((message, i) => {
               return <div key={i} className="chat-message">
                  {message.senderName} &gt; {message.message}
               </div>;
            })}
         </div>

         <input ref={inputBoxRef} name="chat-box-input" type="text" onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onKeyDown={e => keyPress(e.nativeEvent as KeyboardEvent)} className={`message-preview${isFocused ? " active" : ""}`} />
      </div>
   );
}

export default ChatBox;