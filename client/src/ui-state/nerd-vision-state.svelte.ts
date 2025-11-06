let isVisible = $state(false);
let terminalIsVisible = $state(false);

export const nerdVisionState = {
   get isVisible() {
      return isVisible;
   },
   setIsVisible(newIsVisible: boolean): void {
      isVisible =  newIsVisible;
   },

   get terminalIsVisible() {
      return terminalIsVisible;
   },
   setTerminalIsVisible(newTerminalIsVisible: boolean): void {
      terminalIsVisible =  newTerminalIsVisible;
   }
};