const menuCloseFunctionStack = new Array<() => void>();

export function addMenuCloseFunction(closeFunction: () => void): void {
   menuCloseFunctionStack.push(closeFunction);
}

export function closeCurrentMenu(): boolean {
   if (menuCloseFunctionStack.length > 0) {
      const closeFunction = menuCloseFunctionStack[menuCloseFunctionStack.length - 1];
      closeFunction();

      menuCloseFunctionStack.splice(menuCloseFunctionStack.length - 1, 1);
      return true;
   }
   
   return false;
}