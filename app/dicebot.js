'use strict';

var request = require('request');
var config = require('./config');

var Die = {
	init: function(die, isWeighted, isCheat) {
		this.numdie = die[0] * 1;
		this.sides = die[1] * 1;
		this.dieNotation = die[0] + 'd' + die[1];
		this.isWeighted = isWeighted;
		this.isCheat = isCheat;

		return this;
	},
	isDie: function() {
		return !!this.numdie && !!this.sides;
	},
	roll: function() {
		var min = 1;
		var max = this.sides;

		if (!this.isWeighted && this.isCheat) {
			min = max;
		} else if (this.isWeighted) {
			min = Math.ceil(max * 0.75);
		}

		return Math.floor(Math.random() * (max - min + 1) + min);
	}
};

var _path = config.INCOMING_WEBHOOK_PATH;
var _uri = config.API_URI + _path;
var _isMock = false;

module.exports = {
	mockAPIPath: function(path, uri) {
		_path = path;
		_uri = uri + path;
		_isMock = true;
	},
	handlePost: function (req, res, next) {
		// default roll is 1d20
		var i, j;
		var reqtext = req.body.text;
		var loopdie, currentRoll;
		var dies = [];
		var rolls = [];
		var dierolls = '';
		var modTotal = 0;
		var total = 0;
		var weighted = false;
		var cheater = false;
		var botPayload = {
				username: 'dicebot',
				channel: req.body.channel_id,
				icon_emoji: ':game_die:'
			};

		//console.log(req.body.user_name, ' - ', req.body.text);

		if (!!req.body.text) {
			// Check token, reject if wrong
			if (req.body.token !== config.TOKEN) {
				res.status(401).send('Invalid authorization to access this bot');
				return false;
			}

			// Check for weighted die flag
			weighted = reqtext.indexOf('--weighted') > -1;
			cheater = reqtext.indexOf('--cheat') > -1;

			// extract all dice
			while (loopdie = /\d{1,2}d\d{1,2}/i.exec(reqtext)) {
				reqtext = reqtext.replace(loopdie[0], '');
				loopdie = Object.create(Die).init(loopdie[0].split('d'), weighted, cheater);
				if (loopdie.isDie()) {
	 				dies.push(loopdie);
	 			}
			}

			// extract all modifiers, map to a single value
			
			modTotal = (function getMods(curValue, modtext){
				//var rgx = /([+-]\s*[\d]+)/;
				var mod = modtext && modtext.match(/([+-]\s*[\d]+)/);
				
				modtext = modtext.replace(/([+-]\s*[\d]+)/, '');
				mod = !!mod && mod.replace(/\s*/, '') * 1;

				console.log(mod, !!mod && mod !== 0 && !isNaN(mod));
				if (!!mod && mod !== 0 && !isNaN(mod)) {
					curValue = curValue + mod;
					return getMods(curValue, modtext);
				}

				return curValue;
			})(0, reqtext);

		} else {
			dies.push(Object.create(Die).init(['1', '20'], cheater)); // default to a 1d20 die
		}

		if (!req.body.text || (req.body.text && dies.length)) {
			for (i = 0; i < dies.length; i++) {
				// roll dice and sum (using default if no text, otherwise using provided matches)
				for (j = 0; j < dies[i].numdie; j++) {
					currentRoll = dies[i].roll();
					rolls.push(currentRoll);
					total += currentRoll;
				}
				dierolls += ' +' + dies[i].dieNotation;
			}
			dierolls = dierolls.substring(2, dierolls.length);

			// Add in the modifiers
			total += modTotal;

			// write response message and add to payload
			botPayload.text = req.body.user_name + ' rolled ' + dierolls + (modTotal ? ' +' + modTotal : '') + ':\n' +
							  rolls.join(' + ') + (modTotal ? ' +' + modTotal : '') + ' = *' + total + '*';

			// send dice roll
			send(botPayload, sendError);

		} else {
			// send error message back to user if input is bad
			if (req.body.text) {
				botPayload.text = 'I don\'t know how to roll "' + req.body.text + '". ';
			}
			botPayload.text += 'Format die rolls as <number>d<sides>';
			send(botPayload, sendError);

			// Use the following if slackbot should say there was an error as well
			//return res.status(200).send('Format die rolls as <number>d<sides>');
		}

		function sendError(error, status, body) {
			if (error) {
				return next(error);
			} else if (status !== 200) {
				// inform user that our Incoming WebHook failed
				return next(new Error('Incoming WebHook: ' + status + ' ' + body));
			} else {
				return res.status(200).end();
			}
		}
	}
};

function send (payload, callback) {
	request({
		uri: _uri,
		method: 'POST',
		json: _isMock,
		body: _isMock ? payload : JSON.stringify(payload)
	}, function (error, response, body) {
		if (error) {
			return callback(error);
		}

		callback(null, response.statusCode, body);
	});
}
