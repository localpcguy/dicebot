## Dicebot

Bot for Slack to roll dice.

To use: 
- setup website on a server running Node
- add a config file with the API tokens from Slack
- add a Slash Command Slack integration, point at the dicebot server you setup

Once the integration is up, in Slack, use it by:
- typing `/roll #d#` where the first number is the number of dice and the second number is the number of sides
- syntax is very forgiving, allowing things like
  - modifiers - `/roll 2d6 +15`
  - multiple dice - `/roll 3d6 2d8`
  - it will try to "parse" weird rolls like `/roll +2 +5 2d6` where the parameters are out of order
  - `/roll` defaults to `1d20` if nothing is passed

initial credit to: http://www.sitepoint.com/getting-started-slack-bots/

### Todo:

- [x] Add functionality for a modifier
- [x] Add functionality for multiple die "sets"
- [x] Add unit testing to check various die scenarios
- [x] Allow negative modifiers
- [x] Fix multi-digit modifiers
- [ ] Add "roll reason" to API
