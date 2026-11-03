/**
 * CursorWeb Chrome Extension Content Script
 * Auto-injects CursorWeb client and connects to local MCP WebSocket bridge.
 */
(() => {
  if (window.__cursorweb_active) return;
  window.__cursorweb_active = true;

"use strict";var CursorWeb=(()=>{var $=Object.defineProperty;var xe=Object.getOwnPropertyDescriptor;var ke=Object.getOwnPropertyNames;var be=Object.prototype.hasOwnProperty;var ve=(e,n)=>{for(var t in n)$(e,t,{get:n[t],enumerable:!0})},Te=(e,n,t,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of ke(n))!be.call(e,r)&&r!==t&&$(e,r,{get:()=>n[r],enumerable:!(o=xe(n,r))||o.enumerable});return e};var Ee=e=>Te($({},"__esModule",{value:!0}),e);var We={};ve(We,{connect:()=>Fe,init:()=>Fe});var T=null,c=null,Ce=`
  .cw-highlight {
    position: absolute;
    pointer-events: none;
    z-index: 2147483646;
    outline: 2px solid var(--cw-color, #4f8ef7);
    outline-offset: 2px;
    border-radius: 3px;
    transition: opacity 0.15s;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--cw-color, #4f8ef7) 20%, transparent);
  }
  .cw-status {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: rgba(20,20,28,0.92);
    color: #e8e8f0;
    font: 12px/1.5 system-ui, sans-serif;
    padding: 6px 12px;
    border-radius: 8px;
    z-index: 2147483647;
    pointer-events: none;
    backdrop-filter: blur(6px);
    max-width: 280px;
    transition: opacity 0.2s;
  }
  .cw-status .agent-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .cw-pick-hint {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20,20,28,0.9);
    color: #e8e8f0;
    font: 13px/1.6 system-ui, sans-serif;
    padding: 6px 18px;
    border-radius: 20px;
    z-index: 2147483647;
    pointer-events: none;
  }
`;function Y(){T=document.createElement("div"),T.style.cssText="all: initial; position: absolute; top: 0; left: 0; width: 100%; min-height: 100%; pointer-events: none; z-index: 2147483640;",document.documentElement.appendChild(T),c=T.attachShadow({mode:"open"});let e=document.createElement("style");return e.textContent=Ce,c.appendChild(e),c}function j(){if(!c)throw new Error("Overlay not initialized");return c}var u=null,f=null,H=new Map,E=new Map,P={connected:!1,text:"Connecting\u2026"};function A(e){P=e?{connected:!0,text:"Connected"}:{connected:!1,text:"Reconnecting\u2026"},C()}function w(e,n="#4f8ef7",t="default"){if(!c)return;if(!e){a(t);return}let o=H.get(t);o||(o=document.createElement("div"),o.className="cw-highlight",c.appendChild(o),H.set(t,o));let r=e.left+window.scrollX,i=e.top+window.scrollY;o.style.setProperty("--cw-color",n),o.style.cssText+=`
    left: ${r}px; top: ${i}px;
    width: ${e.width}px; height: ${e.height}px;
    opacity: 1;
  `}function a(e="default"){let n=H.get(e);n&&(n.style.opacity="0")}function l(e,n="#a0a0b8",t="default"){c&&(u||(u=document.createElement("div"),u.className="cw-status",c.appendChild(u)),E.set(t,{text:e,color:n}),C())}function O(e){e?(E.delete(e),C()):(E.clear(),C())}function C(){if(!c)return;u||(u=document.createElement("div"),u.className="cw-status",c.appendChild(u));let e=Array.from(E.entries()).filter(([o,r])=>r.text),n=P.connected?"#10b981":"#f59e0b",t=`<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${n};">
    <span class="agent-dot" style="background:${n};margin:0;"></span>
    <span>${P.text}</span>
  </div>`;e.length>0&&(t+='<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">'+e.slice(-4).map(([o,{text:r,color:i}])=>`<div style="margin: 2px 0; font-size: 11px; color: #cbd5e1;"><span class="agent-dot" style="background:${i};"></span><strong>${o}</strong>: ${r}</div>`).join("")+"</div>"),u.innerHTML=t,u.style.opacity="1"}function _(e){c&&(f||(f=document.createElement("div"),f.className="cw-pick-hint",f.textContent="Click an element to select it as target  \xB7  Esc to cancel",c.appendChild(f)),f.style.display=e?"block":"none")}function q(e){return e<.5?2*e*e:-1+(4-2*e)*e}function B(e,n,t){return e+(n-e)*t}function m(e){return new Promise(n=>setTimeout(n,e))}function D(){return new Promise(e=>requestAnimationFrame(e))}function G(e,n,t,o){let r=t-e,i=o-n;return Math.sqrt(r*r+i*i)}function p(e){if(e.id)return`#${CSS.escape(e.id)}`;let n=[],t=e;for(;t&&t!==document.documentElement;){let o=t.tagName.toLowerCase();if(t.id){o=`#${CSS.escape(t.id)}`,n.unshift(o);break}let r=t.parentElement;if(r){let i=Array.from(r.children).filter(s=>s.tagName===t.tagName);i.length>1&&(o+=`:nth-of-type(${i.indexOf(t)+1})`)}n.unshift(o),t=t.parentElement}return n.join(" > ")}function N(e){let n=e.getBoundingClientRect();return{x:n.left+window.scrollX+n.width/2,y:n.top+window.scrollY+n.height/2}}var Le=`
<svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 2L16.5 10.5L10 11.5L13 20L10 21L7 12L2 14L4 2Z" fill="COLOR" stroke="white" stroke-width="1.5"/>
</svg>`.trim();function K(e,n){let t=document.createElement("div");t.style.cssText=`
    position: absolute;
    pointer-events: none;
    z-index: 2147483647;
    transform: translate(-2px, -2px);
    transition: opacity 0.2s;
    opacity: 0;
    display: none;
    top: 0; left: 0;
    will-change: transform;
  `,t.innerHTML=Le.replace("COLOR",e.color);let o=document.createElement("div");o.style.cssText=`
    position: absolute;
    top: 22px;
    left: 8px;
    background: ${e.color};
    color: white;
    font: bold 11px/1.4 system-ui, sans-serif;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  `,o.textContent=e.name,t.appendChild(o),n.appendChild(t),e.node=t,e.labelNode=o}function z(e,n,t){e.x=n,e.y=t,e.node&&(e.node.style.transform=`translate(${n}px, ${t}px)`,e.node.style.opacity=e.visible?"1":"0")}async function I(e,n,t,o=1){if(!e.node)return;e.dismissTimer&&(clearTimeout(e.dismissTimer),e.dismissTimer=null),e.node.style.display="block",e.node.style.transition="opacity 0.2s",e.node.style.opacity="1",e.visible=!0,e.state="moving";let r=e.x,i=e.y,s=G(r,i,n,t),v=J(s/(1.8*o),100,320),ye=performance.now();for(;;){let he=await D(),R=q(J((he-ye)/v,0,1)),ge=B(r,n,R),we=B(i,t,R);if(z(e,ge,we),R>=1)break}e.state="idle"}function U(e){e.node&&(e.visible=!1,e.node.style.transition="opacity 0.4s ease-out",e.node.style.opacity="0",setTimeout(()=>{!e.visible&&e.node&&(e.node.style.display="none")},450))}function J(e,n,t){return Math.max(n,Math.min(t,e))}var L=[],Me=50;function x(e){L.push(e),L.length>Me&&L.shift()}function y(e){try{return document.querySelector(e)}catch{return null}}function V(e,n){let t=y(e);return t?(x({selector:e,tool:"edit_text",before:t.outerHTML}),t.textContent=n,{ok:!0,after:k(t)}):{ok:!1,error:`Element not found: ${e}`}}function Z(e,n){let t=y(e);if(!t||!(t instanceof HTMLElement))return{ok:!1,error:`Element not found: ${e}`};x({selector:e,tool:"set_style",before:t.outerHTML});for(let[o,r]of Object.entries(n))t.style[o]=r;return{ok:!0,after:k(t)}}function Q(e,n){let t=y(e);if(!t)return{ok:!1,error:`Element not found: ${e}`};x({selector:e,tool:"replace_element",before:t.outerHTML});let o=document.createElement("template");o.innerHTML=n.trim();let r=o.content.firstElementChild;return r?(t.replaceWith(r),{ok:!0,after:k(r)}):{ok:!1,error:"html produced no element"}}function ee(e,n,t){let o=y(e);if(!o)return{ok:!1,error:`Parent not found: ${e}`};let r=document.createElement("template");r.innerHTML=n.trim();let i=r.content.firstElementChild;return i?(x({selector:e,tool:"insert_element",before:o.outerHTML}),t==="before"?o.before(i):t==="after"?o.after(i):t==="prepend"?o.prepend(i):o.append(i),{ok:!0,after:k(i)}):{ok:!1,error:"html produced no element"}}function te(e){let n=y(e);return n?(x({selector:e,tool:"remove_element",before:n.outerHTML}),n.remove(),{ok:!0}):{ok:!1,error:`Element not found: ${e}`}}function ne(){let e=L.pop();if(!e)return{ok:!1,error:"Nothing to undo."};let n=y(e.selector);if(!n)return{ok:!1,error:`Undo target not found: ${e.selector}`};let t=document.createElement("template");t.innerHTML=e.before.trim();let o=t.content.firstElementChild;return o?(n.replaceWith(o),{ok:!0,entry:e,after:k(o)}):{ok:!1,error:"Undo: could not parse saved HTML."}}function k(e){let n=e.getBoundingClientRect();return{selector:p(e),rect:{x:n.left+window.scrollX,y:n.top+window.scrollY,w:n.width,h:n.height},outerHTML:e.outerHTML.slice(0,500)}}var oe=["#7c3aed","#06b6d4","#f59e0b","#10b981","#ec4899","#3b82f6","#8b5cf6","#ef4444","#14b8a6","#eab308","#6366f1","#d946ef"],h=new Map,re=0;function Re(e,n){let t=j();if(e&&h.has(e))return h.get(e);if(!e){for(let v of h.values())if(v.state==="idle")return v;re++,e=`Agent ${re}`}let o=n??oe[h.size%oe.length],r=Math.floor(Math.random()*Math.max(window.innerWidth-300,200)+50)+window.scrollX,i=Math.floor(Math.random()*Math.max(window.innerHeight-300,200)+50)+window.scrollY,s={x:r,y:i,targetX:0,targetY:0,name:e,color:o,label:e,visible:!1,state:"idle",node:null,labelNode:null,caretNode:null};return K(s,t),z(s,r,i),h.set(e,s),s}function ie(e,n=1e3){e.dismissTimer&&clearTimeout(e.dismissTimer),e.dismissTimer=setTimeout(()=>{e.state==="idle"&&(U(e),O(e.name))},n)}function se(){for(let e of h.values())e.dismissTimer&&clearTimeout(e.dismissTimer),U(e);O()}async function le(e){let n=e.args?.agent_name||e.agentName,t=e.args?.agent_color||e.agentColor,o=Re(n,t);o.dismissTimer&&(clearTimeout(o.dismissTimer),o.dismissTimer=null);try{let r;switch(e.tool){case"await_pick":r=await $e(e);break;case"get_element":r=await He(o,e);break;case"edit_text":r=await Pe(o,e);break;case"set_style":r=await Ae(o,e);break;case"replace_element":r=await Oe(o,e);break;case"insert_element":r=await _e(o,e);break;case"remove_element":r=await Be(o,e);break;case"undo":r=await Ne(o,e);break;default:r={id:e.id,ok:!1,error:`Unknown tool: ${e.tool}`};break}return ie(o,1e3),r}catch(r){return ie(o,1e3),{id:e.id,ok:!1,error:String(r)}}}async function $e(e){return{id:e.id,ok:!0}}async function g(e,n){let t=document.querySelector(n);if(!t)return null;let o=N(t);return await I(e,o.x,o.y),w(t.getBoundingClientRect(),e.color,e.name),l(`${e.name} \u2014 editing\u2026`,e.color,e.name),t}async function He(e,n){let{selector:t}=n.args,o=await g(e,t);if(!o)return{id:n.id,ok:!1,error:`Element not found: ${t}`};l(`${e.name} \u2014 reading element`,e.color,e.name),await m(250);let r=o.getBoundingClientRect(),i=window.getComputedStyle(o),s={selector:p(o),rect:{x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height},outerHTML:o.outerHTML.slice(0,500),computedStyle:{fontSize:i.fontSize,color:i.color,fontFamily:i.fontFamily,fontWeight:i.fontWeight,display:i.display}};return a(e.name),l(`${e.name} \u2014 idle`,e.color,e.name),{id:n.id,ok:!0,data:{ok:!0,summary:`Read element: ${t}`,after:s}}}async function Pe(e,n){let{selector:t,text:o}=n.args,r=await g(e,t);if(!r)return{id:n.id,ok:!1,error:`Element not found: ${t}`};e.state="working";let i=r.textContent??"";await ze(r,i),await Ie(e,r,o);let s=V(t,o);return a(e.name),e.state="idle",l(`${e.name} \u2014 idle`,e.color,e.name),s.ok?{id:n.id,ok:!0,data:{ok:!0,summary:`Edited text of ${t}`,after:s.after}}:{id:n.id,ok:!1,error:s.error}}async function Ae(e,n){let{selector:t,styles:o}=n.args;if(!await g(e,t))return{id:n.id,ok:!1,error:`Element not found: ${t}`};e.state="working",l(`${e.name} \u2014 applying styles\u2026`,e.color,e.name),await m(60);let i=Z(t,o);return a(e.name),e.state="idle",l(`${e.name} \u2014 idle`,e.color,e.name),i.ok?{id:n.id,ok:!0,data:{ok:!0,summary:`Styled ${t}`,after:i.after}}:{id:n.id,ok:!1,error:i.error}}async function Oe(e,n){let{selector:t,html:o}=n.args,r=await g(e,t);if(!r)return{id:n.id,ok:!1,error:`Element not found: ${t}`};e.state="working",l(`${e.name} \u2014 replacing element\u2026`,e.color,e.name),r instanceof HTMLElement&&(r.style.transition="opacity 0.2s",r.style.opacity="0",await m(60));let i=Q(t,o);return a(e.name),e.state="idle",l(`${e.name} \u2014 idle`,e.color,e.name),i.ok?{id:n.id,ok:!0,data:{ok:!0,summary:`Replaced ${t}`,after:i.after}}:{id:n.id,ok:!1,error:i.error}}async function _e(e,n){let{parent:t,html:o,position:r}=n.args;if(!await g(e,t))return{id:n.id,ok:!1,error:`Parent not found: ${t}`};e.state="working",l(`${e.name} \u2014 inserting element\u2026`,e.color,e.name),await m(60);let s=ee(t,o,r);return a(e.name),e.state="idle",l(`${e.name} \u2014 idle`,e.color,e.name),s.ok?{id:n.id,ok:!0,data:{ok:!0,summary:`Inserted element into ${t}`,after:s.after}}:{id:n.id,ok:!1,error:s.error}}async function Be(e,n){let{selector:t}=n.args,o=await g(e,t);if(!o)return{id:n.id,ok:!1,error:`Element not found: ${t}`};e.state="working",l(`${e.name} \u2014 removing element\u2026`,e.color,e.name),o instanceof HTMLElement&&(o.style.transition="opacity 0.2s, transform 0.2s",o.style.opacity="0",o.style.transform="scale(0.9)",await m(60));let r=te(t);return a(e.name),e.state="idle",l(`${e.name} \u2014 idle`,e.color,e.name),r.ok?{id:n.id,ok:!0,data:{ok:!0,summary:`Removed ${t}`}}:{id:n.id,ok:!1,error:r.error}}async function Ne(e,n){e.state="working",l(`${e.name} \u2014 undoing\u2026`,e.color,e.name);let t=ne();if(!t.ok)return{id:n.id,ok:!1,error:t.error};if(t.after){let o=document.querySelector(t.after.selector);if(o){let r=N(o);await I(e,r.x,r.y),w(o.getBoundingClientRect(),"#22c55e",e.name),await m(150),a(e.name)}}return e.state="idle",l(`${e.name} \u2014 idle`,e.color,e.name),{id:n.id,ok:!0,data:{ok:!0,summary:"Undone.",entry:t.entry,after:t.after}}}async function ze(e,n){let t=[...n];for(let o=t.length;o>=0;o--)e.textContent=t.slice(0,o).join(""),await m(4)}async function Ie(e,n,t){let o=[...t],r=document.createElement("span");r.style.cssText=`display:inline-block;width:2px;height:1.1em;background:${e.color};vertical-align:text-bottom;animation:cw-blink 0.7s step-end infinite;margin-left:1px;`,n.appendChild(r);for(let i=0;i<=o.length;i++)n.textContent=o.slice(0,i).join(""),r.parentElement!==n&&n.appendChild(r),await m(8+Math.random()*8);r.remove()}var M=!1,X=null,F=null;function ce(e){let n=document.elementFromPoint(e.clientX,e.clientY);!n||n===document.documentElement||n===document.body||w(n.getBoundingClientRect(),"#4f8ef7")}function ae(e){e.preventDefault(),e.stopPropagation();let n=document.elementFromPoint(e.clientX,e.clientY);if(!n||n===document.documentElement||n===document.body)return;let t=n.getBoundingClientRect(),o=window.getComputedStyle(n),r={selector:p(n),rect:{x:t.left+window.scrollX,y:t.top+window.scrollY,w:t.width,h:t.height},outerHTML:n.outerHTML.slice(0,1e3),computedStyle:{fontSize:o.fontSize,color:o.color,fontFamily:o.fontFamily,fontWeight:o.fontWeight,display:o.display,background:o.background}};W(),X?.(r)}function de(e){e.key==="Escape"&&(W(),F?.(new Error("Pick cancelled by user")))}function ue(){return M&&W(),M=!0,_(!0),document.addEventListener("mousemove",ce,!0),document.addEventListener("click",ae,!0),document.addEventListener("keydown",de,!0),new Promise((e,n)=>{X=e,F=n})}function W(){M&&(M=!1,_(!1),a(),document.removeEventListener("mousemove",ce,!0),document.removeEventListener("click",ae,!0),document.removeEventListener("keydown",de,!0),X=null,F=null)}var d=null,Ue=null,S=null;function me(e){S=e,fe()}function fe(){d&&(d.onclose=null,d.close(),d=null);let e=S.wsPort??3847,t=`ws://${S.host??"127.0.0.1"}:${e}?token=${S.token}`;d=new WebSocket(t),d.onopen=()=>{console.log("[cursorweb] connected to MCP server"),b({type:"hello",url:location.href,title:document.title}),A(!0)},d.onmessage=async o=>{let r;try{r=JSON.parse(o.data)}catch{return}await Xe(r)},d.onerror=()=>{console.warn("[cursorweb] WebSocket error")},d.onclose=()=>{console.warn("[cursorweb] disconnected, retrying in 3s\u2026"),A(!1),Ue=setTimeout(fe,3e3)}}async function Xe(e){if(e.type==="cancel_all"){se();return}if(e.type==="task"){if(e.tool==="await_pick"){try{let t=await ue();b({type:"picked",requestId:e.args.requestId??e.id,selector:t.selector,rect:t.rect,outerHTML:t.outerHTML,computedStyle:t.computedStyle})}catch(t){b({type:"result",id:e.id,ok:!1,error:String(t)})}return}let n={id:e.id,tool:e.tool,args:e.args};le(n).then(t=>{b({type:"result",id:t.id,ok:t.ok,data:t.data,error:t.error})}).catch(t=>{b({type:"result",id:e.id,ok:!1,error:String(t)})})}}function b(e){d?.readyState===WebSocket.OPEN&&d.send(JSON.stringify(e))}var pe=document.createElement("style");pe.textContent="@keyframes cw-blink { 0%,100%{opacity:1} 50%{opacity:0} }";document.head.appendChild(pe);function Fe(e){Y(),me(e)}return Ee(We);})();


  if (typeof CursorWeb !== "undefined" && CursorWeb.connect) {
    CursorWeb.connect({ token: "default", wsPort: 3847 });
    console.log("[cursorweb-extension] Connected to local MCP bridge.");
  }
})();
