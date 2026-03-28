<script lang="ts">
   import { onChatboxKeyPress } from "../../game/chat";
   import { chatboxState } from "../../ui-state/chatbox-state";

   let chatMessage = $state("");

   let chatboxElem: HTMLInputElement | undefined;

   $effect(() => {
      if (chatboxElem === undefined) {
         return;
      }

      if (chatboxState.isFocused) {
         chatboxElem.focus();
      } else {
         chatboxElem.blur();
      }
   });
</script>

<div id="chat-box" class="{!chatboxState.isFocused ? "idle" : ""}">
   <div class="message-history">
      {#each chatboxState.chatMessages as message}
         <div class="chat-message">
            {message.username}: {message.message}
         </div>
      {/each}
   </div>

   <input bind:this={chatboxElem} name="chat-box-input" type="text" onfocus={() => chatboxState.isFocused = true} onblur={() => chatboxState.isFocused = false} onkeydown={e => onChatboxKeyPress(e, chatMessage)} class="message-preview{chatboxState.isFocused ? " active" : ""}" bind:value={chatMessage} />
</div>

<style>
   #chat-box {
      --message-height: 1.3rem;
      min-width: 15rem;
      max-width: 25rem;
      position: absolute;
      left: calc(1rem * var(--zoom));
      bottom: calc(9rem * var(--zoom));
      z-index: 1;
      transform: scale(var(--zoom));
      transform-origin: 0% 100%;
   }
   #chat-box.idle .message-history {
      animation: Disappear 5s forwards;
   }
   #chat-box :is(.chat-message, .message-preview) {
      width: 100%;
      color: #fff;
      text-shadow: 2px 2px #000;
      font-family: "Noto Sans";
      font-size: 1rem;
      min-height: var(--message-height);
      padding: 0 5px;
      margin: 5px;
      overflow: hidden;
      word-wrap: break-word;
   }
   #chat-box .chat-message {
      background-color: rgba(0, 0, 0, 0.6);
   }
   #chat-box .message-preview {
      border: none;
      outline: none;
      /* background-color: rgba(0, 0, 0, 0.4); */
      opacity: 0;
   }
   #chat-box .message-preview.active {
      background-color: rgba(0, 0, 0, 0.6);
      opacity: 1;
   }

   @keyframes Disappear {
      0% {
         opacity: 1;
         visibility: visible;
      }
      90% {
         opacity: 1;
         visibility: visible;
      }
      100% {
         opacity: 0;
         visibility: hidden;
      }
   }
</style>