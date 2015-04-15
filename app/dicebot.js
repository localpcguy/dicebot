'use strict';

var request = require('request');
var config = require('./config');

module.exports = function (req, res, next) {
	// default roll is 1d20
	var matches;
	var times = 1;
	var die = 20;
	var rolls = [];
	var total = 0;
	var botPayload = {
		username: 'dicebot',
		channel: req.body.channel_id,
		icon_emoji: ':game_die:'
	};

	if (req.body.text) {
		// parse roll type if specified
		matches = req.body.text.match(/^(\d{1,2})d(\d{1,2})$/);

		if (matches && matches[1] && matches[2]) {
			times = matches[1];
			die = matches[2];
		}
	}
	if (!req.body.text || (req.body.text && matches && matches[1] && matches[2])) {
		// roll dice and sum (using default if no text, otherwise using provided matches)
		for (var i = 0; i < times; i++) {
			var currentRoll = roll(1, die);
			rolls.push(currentRoll);
			total += currentRoll;
		}

		// write response message and add to payload
		botPayload.text = req.body.user_name + ' rolled ' + times + 'd' + die + ':\n' +
						  rolls.join(' + ') + ' = *' + total + '*';

		// send dice roll
		send(botPayload, sendError);

	} else {
		// send error message back to user if input is bad
		if (req.body.text) {
			botPayload.text = 'I don\'t know how to roll "' + req.body.text + '". ';
		}
		botPayload.text += 'Format die rolls as <number>d<sides>';
		send(botPayload, sendError);

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
};



function roll (min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function send (payload, callback) {
	var path = config.INCOMING_WEBHOOK_PATH;
	var uri = 'https://hooks.slack.com/services' + path;

	request({
		uri: uri,
		method: 'POST',
		body: JSON.stringify(payload)
	}, function (error, response, body) {
		if (error) {
			return callback(error);
		}

		callback(null, response.statusCode, body);
	});
}