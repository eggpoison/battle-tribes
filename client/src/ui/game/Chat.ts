import { assert } from "../../../../shared/src";
import { sendChatMessagePacket } from "../../game/networking/packet-sending/packet-sending";

const enum Var {
   MAX_MESSAGES = 50,
   MAX_CHARS = 128,
   SPAM_FILTER_MESSAGE_DURATION_SECONDS = 5,
   SPAM_FILTER_MESSAGE_DURATION_MS = SPAM_FILTER_MESSAGE_DURATION_SECONDS * 1000,
   SPAM_FILTER_MAX_MESSAGES = 5
}

let rootElem: HTMLElement | null = null;
let historyElem: HTMLElement | null = null;
let inputElem: HTMLInputElement | null = null;

let numMessages = 0;

const spamFilterTimestamps: Array<number> = [0, 0, 0, 0, 0];
/** Points to the oldest message timestamp */
let spamFilterHead = 0;

export function addMessageToChat(username: string, message: string): void {
   const messageElem = document.createElement("div");
   messageElem.className = "msg";

   const text = document.createTextNode(username + ": " + message);

   messageElem.appendChild(text);
   historyElem!.appendChild(messageElem);

   // Remove a chat message if the number of messages has exceeded the maximum
   if (numMessages >= Var.MAX_MESSAGES) {
      historyElem!.removeChild(historyElem!.firstChild!);
   } else {
      numMessages++;
   }
}

export function createChat(): void {
   assert(rootElem === null);
   
   rootElem = document.createElement("div");
   rootElem.id = "chat";
   document.body.appendChild(rootElem);

   inputElem = document.createElement("input");
   inputElem.name = "chat-input";
   inputElem.type = "text";
   inputElem.onkeydown = onInputKeydown;
   rootElem.appendChild(inputElem);

   historyElem = document.createElement("div");
   historyElem.className = "message-history";
   rootElem.appendChild(historyElem);
}

export function destroyChat(): void {
   document.body.removeChild(rootElem!);

   rootElem = null;
   historyElem = null;
   inputElem = null;

   numMessages = 0;

   spamFilterTimestamps.fill(0);
}

export function openChatMessageInput(e: Event): void {
   if (inputElem !== null) {
      inputElem.focus();
      e.preventDefault();
      // clearPressedKeys();
      // @Incomplete
   }
}

function onInputKeydown(e: KeyboardEvent): void {
   const message = inputElem!.value;
   
   // Don't type characters past the max char count
   if (message.length >= Var.MAX_CHARS && e.key.length === 1) {
      e.preventDefault();
      return;
   }

   switch (e.key) {
      // Cancel the chat message
      case "Escape": {
         inputElem!.blur();
         break;
      }
      // Send the chat message
      case "Enter": {
         if (message !== "") {
            const currentTime = performance.now();

            // Make sure it passes the spam filter
            const oldest = spamFilterTimestamps[spamFilterHead];
            if (currentTime - oldest > Var.SPAM_FILTER_MESSAGE_DURATION_MS) {
               spamFilterTimestamps[spamFilterHead] = currentTime;
               spamFilterHead = (spamFilterHead + 1) % Var.SPAM_FILTER_MAX_MESSAGES;

               sendChatMessagePacket(message);
               inputElem!.value = "";
            }
         }

         inputElem!.blur();
         break;
      }
   }
}