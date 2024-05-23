import { TribeType } from "webgl-test-shared/dist/tribes";
import { useCallback, useRef } from "react";
import { setGameState } from "./App";
import { createAudioContext } from "../sound";

const MAX_USERNAME_CHARS = 21;

/** Checks whether a given username is valid or not */
const usernameIsValid = (username: string): [warning: string, isValid: false] | [warning: null, isValid: true] => {
   if (username.length > MAX_USERNAME_CHARS) return ["Name cannot be more than " + MAX_USERNAME_CHARS + " characters long!", false];
   if (username.length === 0) return ["Name cannot be empty!", false];

   return [null, true];
}

interface MainMenuProps {
   readonly existingUsername: string | null;
   passUsername: (username: string) => void;
   passTribeType: (tribeType: TribeType) => void;
}
const MainMenu = ({ existingUsername, passUsername, passTribeType }: MainMenuProps) => {
   const nameInputBoxRef = useRef<HTMLInputElement | null>(null);
   const plainspeopleInputRef = useRef<HTMLInputElement | null>(null);
   const barbariansInputRef = useRef<HTMLInputElement | null>(null);
   const frostlingsInputRef = useRef<HTMLInputElement | null>(null);
   const goblinsInputRef = useRef<HTMLInputElement | null>(null);
   
   const getSelectedTribeType = (): TribeType => {
      if (plainspeopleInputRef.current !== null && plainspeopleInputRef.current.checked) {
         return TribeType.plainspeople;
      } else if (barbariansInputRef.current !== null && barbariansInputRef.current.checked) {
         return TribeType.barbarians;
      } else if (frostlingsInputRef.current !== null && frostlingsInputRef.current.checked) {
         return TribeType.frostlings;
      } else if (goblinsInputRef.current !== null && goblinsInputRef.current.checked) {
         return TribeType.goblins;
      }
      throw new Error("Not selected");
   }

   const getUsername = (): string => {
      // Get the inputted name
      const nameInputBox = nameInputBoxRef.current!;
      const inputUsername = nameInputBox.value;

      // If valid, set it as the username
      const [warning, isValid] = usernameIsValid(inputUsername);
      if (isValid) {
         return inputUsername;
      }

      alert(warning);
      return "";
   }

   // Handles username input
   const enterName = useCallback((): void => {
      const username = getUsername();
      if (username === "") {
         return;
      }

      const tribeType = getSelectedTribeType();

      createAudioContext();
      passUsername(username!);
      passTribeType(tribeType);
      setGameState("loading");
   }, [passUsername, passTribeType]);

   // When the name is entered
   const pressEnter = (e: KeyboardEvent): void => {
      if (e.code === "Enter") {
         enterName();
         e.preventDefault();
      }
   }

   return <div id="main-menu">
      <div className="content">
         <input ref={nameInputBoxRef} name="name-input" onKeyDown={e => pressEnter(e.nativeEvent)} type="text" placeholder="Enter name here" autoFocus />
         <form>
            <input ref={plainspeopleInputRef} type="radio" id="tribe-selection-plainspeople" name="tribe-selection" defaultChecked />
            <label htmlFor="tribe-selection-plainspeople">Plainspeople</label>
            <input ref={barbariansInputRef} type="radio" id="tribe-selection-barbarians" name="tribe-selection" />
            <label htmlFor="tribe-selection-barbarians">Barbarians</label>
            <input ref={frostlingsInputRef} type="radio" id="tribe-selection-frostlings" name="tribe-selection" />
            <label htmlFor="tribe-selection-frostlings">Frostlings</label>
            <input ref={goblinsInputRef} type="radio" id="tribe-selection-goblins" name="tribe-selection"/>
            <label htmlFor="tribe-selection-goblins">Goblins</label>
         </form>
         <button onClick={enterName}>Play</button>
      </div>
   </div>;
}

export default MainMenu;