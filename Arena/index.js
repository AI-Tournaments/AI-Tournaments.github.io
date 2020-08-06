'use strict'
let arenaList = undefined;
let participantList = undefined;
let settings = undefined;
let arenaProperties = undefined;
let btnAddTeam = undefined;
let btnTransfer = undefined;
let contentWindows = [];
function getOption(element, event){
	for(const option of element.getElementsByTagName('option')){
		if(option.value === event.target.value){
			return option;
		}
	}
}
function sortOptions(selectElement){
	let options = [...selectElement.options];
	options.sort(function(a, b){
		if(a.value < b.value){return -1;}
		if(b.value < a.value){return 1;}
		return 0;
	});
	for(let option of options){
		selectElement.add(option);
	}
}
function transferToTeam(event){
	let selectElement_moveTo = document.getElementById(event.target.dataset.select);
	for(const selectElement of document.getElementsByClassName('participants')){
		for(let option of [...selectElement.selectedOptions]){
			selectElement_moveTo.add(option);
			option.selected = false;
		}
	}
	// TODO: Validate .participants.min/.max, .participantsPerTeam.min/.max
	sortOptions(selectElement_moveTo);
}
function onload(){
	arenaList = document.getElementById('arena-datalist');
	participantList = document.getElementById('participants-selectable');
	settings = document.getElementById('settings');
	btnAddTeam = document.getElementById('add-team');
	btnTransfer = document.getElementById('transfer');
	btnTransfer.onclick = transferToTeam;
	document.getElementById('arena').onchange = event => {
		let option = getOption(arenaList, event);
		if(option !== undefined){
			btnAddTeam.disabled = true;
			for(const element of document.getElementsByClassName('participant-team')){
				element.parentNode.removeChild(element);
			}
			document.title = event.target.value + ' Arena';
			getProperties(event.target.value);
			getParticipants(option.value, option.dataset.full_name);
		}
	}
	fetch('https://api.github.com/orgs/AI-Tournaments/repos').then(response => response.json()).then(repos => {
		repos.forEach(repo => {
			if(repo.full_name.endsWith('-Arena')){
				let option = document.createElement('option');
				option.value = repo.full_name.replace(/.*\/|-Arena/g, '');
				option.dataset.full_name = repo.full_name;
				arenaList.appendChild(option);
			}
		});
	});
}
function getParticipants(arena='', full_name){
	for(const selectElement of document.getElementsByClassName('participants')){
		while(0 < selectElement.length){
			selectElement.remove(0);
		}
	}
	let promises = [];
	fetch('https://api.github.com/repos/AI-Tournaments/'+arena+'-AI-Tournament-Participant/forks').then(response => response.json()).then(forks => {
		forks.forEach(fork => {
			promises.push(fetch('https://api.github.com/repos/' + fork.full_name + '/git/trees/master')
			.then(response => response.json())
			.then(data => {
				data.tree.forEach(file =>{
					if(!file.path.startsWith('.') && file.type === 'blob' && file.path.endsWith('.js')){
						let option = document.createElement('option');
						option.dataset.name = fork.full_name + '/' + file.path;
						option.dataset.url = 'https://raw.githubusercontent.com/' + fork.full_name + '/' + fork.default_branch + '/' + file.path;
						option.innerHTML = option.dataset.name;
						participantList.appendChild(option);
					}
				});
			})
			.catch(error => {
				console.error(error);
			}));
		});
		Promise.all(promises).then(() => {
			sortOptions(participantList);
		})
	});
}
function getProperties(arena=''){
	arenaProperties = undefined;
	fetch('https://raw.githubusercontent.com/AI-Tournaments/GAME-Arena/master/properties.json'.replace('GAME', arena))
	.then(response => response.json())
	.then(json => {
		function addInput(fieldset, name, value){
			let label = document.createElement('label');
			label.innerHTML = name;
			label.htmlFor = fieldset.name+'.'+name;
			fieldset.appendChild(label);
			let input = document.createElement('input');
			input.id = label.htmlFor;
			input.name = label.htmlFor;
			switch(typeof value){
				default: input.type = 'text'; break;
				case 'boolean': input.type = 'checkbox'; break;
				case 'number': input.type = 'number'; break;
			}
			if(typeof value === 'boolean'){
				input.checked = value;
			}else{
				input.value = value;
			}
			fieldset.appendChild(input);
		}
		arenaProperties = json;
		for(let index = 0; index < Math.max(1, json.limits.teams.min); index++){
			createTeam();
		}
		while(0 < settings.length){
			settings.remove(0);
		}
		for(const key in arenaProperties.settings){
			if(arenaProperties.settings.hasOwnProperty(key)){
				const setting = arenaProperties.settings[key];
				let fieldset = document.createElement('fieldset');
				fieldset.name = key;
				settings.appendChild(fieldset);
				let legend = document.createElement('legend');
				legend.innerHTML = key;
				fieldset.appendChild(legend);
				for(const subKey in setting){
					if(setting.hasOwnProperty(subKey)){
						addInput(fieldset, subKey, setting[subKey]);
					}
				}
			}
		}
	});
}
function createTeam(){
	let teamIndex = document.getElementsByClassName('participant-team').length + 1;
	btnAddTeam.disabled = arenaProperties.limits.teams.max <= teamIndex;
	let teamID = 'participant-team-' + teamIndex;
	let participantTeam = document.createElement('div');
	participantTeam.classList.add('participant-team');
	let input = document.createElement('input');
	participantTeam.appendChild(input);
	let label = document.createElement('label');
	participantTeam.appendChild(label);
	let select = document.createElement('select');
	participantTeam.appendChild(select);
	input.type = 'button';
	input.dataset.select = teamID;
	input.value = btnTransfer.value;
	input.onclick = transferToTeam;
	label.htmlFor = teamID;
	label.innerHTML = 'Team ' + teamIndex;
	select.id = teamID;
	select.classList.add('participants');
	select.multiple = true;
	document.getElementById('participant-groups').appendChild(participantTeam);
}
function start(){
	// TODO: Validate!
	let json = {
		arena: document.title.split(' ')[0],
		participants: [],
		settings: {}
	};
	for(const select of document.getElementsByClassName('participants')){
		if(select.id !== 'participants-selectable'){
			let team = [];
			json.participants.push(team);
			for(const option of select.options){
				team.push({
					name: option.dataset.name,
					url: option.dataset.url
				});
			}
		}
	}
	for(const input of settings.getElementsByTagName('input')){
		let info = input.name.split('.');
		if(json.settings[info[0]] === undefined){
			json.settings[info[0]] = {};
		}
		switch(input.type){
			default: json.settings[info[0]][info[1]] = input.value; break;
			case 'checkbox': json.settings[info[0]][info[1]] = input.checked; break;
			case 'number': json.settings[info[0]][info[1]] = input.valueAsNumber; break;
		}
	}
	let iframe = document.createElement('iframe');
	iframe.src = 'iframe.html#' + JSON.stringify(json);
	iframe.sandbox = 'allow-scripts';
	iframe.style.display = 'none';
	document.getElementById('iframeContainer').appendChild(iframe);
	let output = document.createElement('div');
	output.style.display = 'none';
	output.classList.add('log');
	document.getElementById('outputContainer').appendChild(output);
	setTimeout(()=>{getIFrameLog(iframe, output)}, 1000);
}
function getIFrameLog(iframe, output){
	if(window.onmessage === null){
		window.onmessage = messageEvent => {
			if(messageEvent.origin === "null" && contentWindows.includes(messageEvent.source)){
				while(0 < output.childElementCount){
					output.removeChild(output.firstChild);
				}
				let outputSum = document.getElementById('outputSum');
				let isDone = true;
				let aborted = []; // TODO: Use.
				let log = undefined;
				messageEvent.data.data.forEach(posts => {
					let container = document.createElement('div');
					output.appendChild(container);
					let isDone_local = false;
					let score = undefined;
					posts.forEach(post => {
						isDone_local |= post.type === 'FinalScore' || post.type === 'Aborted';
						if(post.type === 'FinalScore'){
							score = post.value.score;
							log = post.value.history;
						}else if(post.type === 'Aborted'){
							score = null;
							aborted.push(post.value);
						}
						let label = document.createElement('label');
						label.htmlFor = iframe.src + ':' + post.id;
						label.classList.add(post.type);
						label.innerHTML = post.type;
						container.appendChild(label);
						let pre = document.createElement('pre');
						pre.id = iframe.src + ':' + post.id;
						pre.classList.add(post.type);
						pre.innerHTML = JSON.stringify(post.value,null,'\t');
						container.appendChild(pre);
					});
					isDone &= isDone_local;
					if(isDone_local){
						if(score === null){
							outputSum.dataset.aborted = JSON.stringify(aborted);
						}else{
							let array = outputSum.dataset.array === undefined ? [] : JSON.parse(outputSum.dataset.array);
							score.forEach(s => {
								let entry = array.find(entry => entry.name === s.name);
								if(entry === undefined){
									entry = {type: 'score', name: s.name, score: 0, scores: []};
									array.push(entry);
								}
								entry.scores.push(s.score);
								entry.score = entry.scores.reduce(function(a,b){return a+b;})/entry.scores.length;
							});
							outputSum.dataset.array = JSON.stringify(array);
							outputSum.innerHTML = JSON.stringify(array,null,'\t');
						}
					}
				});
				if(isDone){
						let array = outputSum.dataset.array === undefined ? [] : JSON.parse(outputSum.dataset.array);
						array.push({type: 'log', log: log})
						if(outputSum.dataset.aborted !== undefined){
							array.push({type: 'aborted', aborted: aborted})
						}
						outputSum.dataset.array = JSON.stringify(array);
						outputSum.innerHTML = JSON.stringify(array,null,'\t');
					contentWindows.splice(contentWindows.indexOf(messageEvent.source), 1);
				}else{
					getIFrameLog(iframe, output);
				}
			}
		};
	}
	contentWindows.push(iframe.contentWindow);
	iframe.contentWindow.postMessage(undefined, '*');
}
