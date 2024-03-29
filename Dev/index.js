'use strict'
function a(){
	let _editor;
	(()=>{
		let acceptedDev;
		if(GitHubApi.getSessionStorage()?.acceptedDev){
			acceptedDev = true;
		}
		const defaultSetup = {
			active: false,
			comment: '',
			autoStart: false,
			rerunUntilError: false,
			arena: {
				url: '',
				name: '',
				replay: '',
				settings: {}
			},
			participants: []
		};
		_editor = new JSONEditor(document.getElementById('editor'), {
			'modes': ['tree', 'code'],
			'name': 'Test setups',
			'onChange': ()=>{
				_editor.validate().then(errors => {
					if(!errors.length){
						localStorage.setItem('LocalDevelopment.Setups', _editor.getText())
					}
				});
			},
			'onModeChange': (newMode, oldMode)=>{
				if(oldMode){
					localStorage.setItem('LocalDevelopment.Mode', newMode);
				}
			},
			'onValidate': array => {
				function isUrl(string){
					let url;
					try{
						url = new URL(string);
					}catch(e){
						return false;
					}
					return url.protocol === 'http:' || url.protocol === 'https:';
				}
				let errors = [];
				if(Array.isArray(array)){
					let activeSetups = array.filter(setup => setup.active).length;
					array.forEach((setup, index_0) => {
						if(1 < activeSetups && setup.active){
							errors.push({
								path: [index_0],
								message: 'Only one setup can be active at once.'
							});
						}
						if(setup.arena){
							if(!isUrl(setup.arena.url)){
								errors.push({
									path: [index_0, 'arena', 'url'],
									message: 'Property "url" is not a URL.'
								});
							}
						}else if(setup.settings){
							errors.push({
								path: [index_0, 'settings'],
								message: 'Property "settings" requires "arena".'
							});
						}
						if(Array.isArray(setup.participants)){
							setup.participants.forEach((participant, index_1) => {
								if(typeof participant === 'string'){
									let url = '';
									if(participant.length){
										url = participant.substring(participant[0] === '!' ? 1 : 0);
									}
									if(!isUrl(url)){
										errors.push({
											path: [index_0, 'participants', index_1],
											message: 'String is not a URL.'
										});
									}
								}else{
									let url = participant.url;
									if(typeof url === 'string'){
										if(url && (url[0] === '?' || url[0] === '!')){
											if(acceptedDev === undefined){
												const session = GitHubApi.getSessionStorage();
												const passphrase = 'I accept unsandboxed sources';
												acceptedDev = (prompt('By having exclamation (!) and question (?) marks first in the URL you side steps all security features and you do so at your own risk. Only do this to URLs for code that you trust.\n\nWrite "'+passphrase+'" to allow unsandboxed sources.')??'').toLowerCase() === passphrase.toLowerCase();
												session.acceptedDev = acceptedDev;
												GitHubApi.setSessionStorage(session);
											}
											if(!acceptedDev){
												errors.push({
													path: [index_0, 'participants', index_1, 'url'],
													message: 'You have not allowed unsandboxed sources. Remove preceding special characters from the URL. All sources are sandboxed by default for security reasons.'
												});
											}
											url = url.substring(1);
										}
										if(url && url[0] === '?'){
											url = url.substring(1);
										}
									}
									if(!isUrl(url)){
										errors.push({
											path: [index_0, 'participants', index_1, 'url'],
											message: 'Property "url" is not a URL.'
										});
									}
								}
							});
						}
					});
				}
				return errors;
			},
			templates: [
				{
					text: 'Test setup',
					title: 'Insert new setup',
					field: 'TestSetupTemplate',
					value: defaultSetup
				}
			]
		}, JSON.parse(localStorage.getItem('LocalDevelopment.Setups')) ?? [defaultSetup]);
	})();
	fetch('/schemaDefs.json').then(response => response.json()).then(schemaDefs => {
		_editor.setSchema({
			type: 'array',
			items: {
				type: 'object',
				required: ['active', 'arena', 'participants', 'autoStart'],
				properties: {
					active: {type: 'boolean'},
					autoStart: {type: 'boolean'},
					rerunUntilError: {type: 'boolean'},
					arena: {
						type: ['object', 'null'],
						required: ["url", "replay"],
						properties: {
							url: {type: 'string'},
							name: {type: 'string'},
							replay: {type: 'string'},
							settings: {type: 'object'},
						}
					},
					participants: {
						type: 'array',
						items: {$ref: 'participant'}
					}
				}
			}
		}, schemaDefs);
	});
	const mode = localStorage.getItem('LocalDevelopment.Mode');
	if(mode){
		_editor.setMode(mode);
	}
}
