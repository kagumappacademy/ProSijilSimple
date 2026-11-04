import { useEffect, useRef } from 'react';

export function useModalFocus(contentRef,onClose) {
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  useEffect(()=>{
    const dialog=contentRef.current?.closest('[role="dialog"]');
    const previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    contentRef.current?.querySelector('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, button')?.focus();
    function keydown(event){
      if(event.key==='Escape'){event.preventDefault();closeRef.current();}
      if(event.key!=='Tab'||!dialog)return;
      const controls=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')]
        .filter(element=>!element.matches(':disabled')&&element.tabIndex>=0&&element.getClientRects().length&&!element.closest('[aria-hidden="true"]'));
      const first=controls[0],last=controls[controls.length-1];
      if(!first){event.preventDefault();dialog.focus();}
      else if(!dialog.contains(document.activeElement)){event.preventDefault();first.focus();}
      else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);if(previous?.isConnected)previous.focus();};
  },[contentRef]);
}
