const paths:Record<string,string>={
 crest:'<path fill="currentColor" stroke="none" d="m2 13 10-10 10 10-3 1-7-7-7 7zm0 5 10-10 10 10-3 1-7-7-7 7zm6 1 4-4 4 4-4 3z"/>',
 infantry:'<path d="M4 14h16M5.5 13a6.5 7 0 0 1 13 0M11 6l1-2h2l1 3M7 15l2 3h4l3-3"/>',
 gun:'<path d="M3 10h12v3H8l-3 3H3l2-4m10-1h6m-8 2 3 7m-3-7-4 7M5 7h6v3"/>',
 engineer:'<path d="m5 20 12-14m-4-2c4 0 6 2 8 6M4 7l4-3 4 6-3 3zM11 13l6 7"/>',
 dig:'<path d="m4 20 12-14M9 4c4-1 8 1 12 7l-6-4-6-3Z"/>',
 advance:'<path d="m4 7 5 5-5 5m6-10 5 5-5 5m6-10 5 5-5 5"/>',
 retreat:'<path d="m13 7-5 5 5 5m6-10-5 5 5 5M5 6v12"/>',
 hold:'<path d="m4 6 8-3 8 3v6c-2 4-4 6-8 9-4-3-6-5-8-9zM8 12h8m-4-4v8"/>',
 abilities:'<path d="m14 2-9 12h6l-1 8 10-13h-7z"/>',
 mp:'<circle cx="12" cy="7.5" r="3"/><path d="M6 20v-3a6 6 0 0 1 12 0v3z"/>',
 sup:'<path d="m3 7 9-4 9 4v11l-9 4-9-4zm0 0 9 4 9-4m-9 4v11M8 5l9 4"/>',
 clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
 flag:'<path d="M5 21V3m0 1c5-3 8 3 14 0v9c-6 3-9-3-14 0"/>',
 pause:'<path stroke-width="3.5" d="M9 5v14m6-14v14"/>',play:'<path d="m8 5 11 7-11 7z"/>',
 book:'<path d="M3 5c4-1 6 0 9 2 3-2 5-3 9-2v13c-4-1-6 0-9 2-3-2-5-3-9-2zM12 7v12"/>',
 log:'<path d="M3 6h3m3 0h12M3 12h3m3 0h12M3 18h3m3 0h12"/>',
 target:'<circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>'
}
export const icon=(id:string)=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+paths[id]+'</svg>'
