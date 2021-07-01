'use strict'
class ReplayHelper{
	static #initiated = false;
	static #postHeight = null;
	static init = null;
	static preInit(){
		if(ReplayHelper.#initiated){
			console.error('ReplayHelper is already initiated.');
		}
		ReplayHelper.#initiated = true;
		let resolve = null;
		let promise = new Promise(r=>resolve=r);
		ReplayHelper.init = (callback=matchLog=>{})=>{
			promise.then(callback);
		}
		window.addEventListener('message', messageEvent => {
			switch(messageEvent.data.type){
				case 'Init-Fetch-Replay-Height':
					if(ReplayHelper.#postHeight === null){
						ReplayHelper.#postHeight = ()=>{
							messageEvent.source.postMessage({type: 'Replay-Height', value: document.documentElement.scrollHeight}, messageEvent.origin);
							document.documentElement.style.padding = 0;
							document.documentElement.style.margin = 0;
						};
					}
					window.addEventListener('resize', ReplayHelper.#postHeight);
					ReplayHelper.#postHeight();
					break;
				case 'Match-Log':
					class MatchLog{
						constructor(settings={}){
							for(const key in settings){
								if(Object.hasOwnProperty.call(settings, key)){
									this[key] = settings[key];
								}
							}
						}
					}
					resolve(new MatchLog(messageEvent.data.matchLog));
					break;
			}
		});
	}
}
ReplayHelper.preInit();
