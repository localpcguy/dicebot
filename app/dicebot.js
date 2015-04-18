'use strict';

var request = require('request');
var config = require('./config');

var Die = {
	init: function(die) {
		this.numdie = die[0] * 1;
		this.sides = die[1] * 1;
		this.dieNotation = die[0] + 'd' + die[1];

		return this;
	},
	isDie: function() {
		return !!this.numdie && !!this.sides;
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
		var botPayload = {
				username: 'dicebot',
				channel: req.body.channel_id,
				icon_emoji: ':game_die:'
			};

		console.log(req.body.command, req.body.user_name, req.body.text);

		if (!!req.body.text) {
			// Check token, reject if wrong
			if (req.body.token !== config.token) {
				return next(new Error('Invalid authorization to access this bot'));
			}
			// extract all dice
			while (loopdie = /\d{1,2}d\d{1,2}/i.exec(reqtext)) {
				reqtext = reqtext.replace(loopdie[0], '');
				loopdie = Object.create(Die).init(loopdie[0].split('d'));
				if (loopdie.isDie()) {
	 				dies.push(loopdie);
	 			}
			}

			// extract all modifiers, map to a single value
			modTotal = reqtext
						.replace(/[^\d]*/g,'')
						.split('')
						.reduce(function(pv, cv) { return pv + (cv*1); }, 0);

		} else {
			dies.push(Object.create(Die).init(['1', '20'])); // default to a 1d20 die
		}

		if (!req.body.text || (req.body.text && dies.length)) {
			for (i = 0; i < dies.length; i++) {
				// roll dice and sum (using default if no text, otherwise using provided matches)
				for (j = 0; j < dies[i].numdie; j++) {
					currentRoll = roll(1, dies[i].sides);
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



function roll (min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

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