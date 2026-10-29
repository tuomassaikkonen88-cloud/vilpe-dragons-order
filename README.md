# The Dragon's Order

A live D&D-style party game for 10-20 players. Players join on their phones (no accounts); the Dungeon Master runs the big screen.

- Players: open `/` (or scan the QR code on the big screen)
- Dungeon Master / big screen: open `/host?key=<HOST_KEY>`

Run locally: `HOST_KEY=secret node server.js` then open http://localhost:3000/host?key=secret

No dependencies. Game state lives in memory; restarting the server starts a new game.
