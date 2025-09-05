# Flight Rising Coliseum Tracker

A Tampermonkey userscript to track Coliseum wins and loot in Flight Rising. **This script does not interact with, scrape, or manipulate the game server in any way**, nor does it provide any gameplay advantage. It only reads the data already sent to your browser and displays it in a more organized, readable format for personal tracking purposes. All item names, categories and IDs are manually entered in the file itemIndex, and simply connects the IDs displayed in the messages sent to your browser to the listed names (with fallbacks for new items using the gamedb bbcode).

## Features

- Track Coliseum wins per venue (you have to manually swap venue to track in a new venue - the script has no idea which venue you're in, only what loot you get)
- Display loot as BBCode (`[item=name]`, `[skin=id]`, or `[gamedb item=id]`)
- Sort by item name or ID
- Filter by categories: Food, Materials, Apparel, Familiars, Battle, Skins, Specialty, Other
- Overview grid with item name and count, toggle to hide
- Export all data as CSV or JSON
- Storage using `localStorage`
- Font size options (from 8px to 24px)
- Dark and Light Theme

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open the [Flight Rising Coliseum Tracker v1.0.user](https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker%20v1.0.user.js) file in your browser.
3. Click **Install** in Tampermonkey.
4. The tracker will automatically load the external `itemIndex.js`.

## Updating Items

- Users will automatically get the updated item list the next time Tampermonkey refreshes the script from GitHub. Make sure that "Externals" update interval in your Tampermonkey settings is set to anything other than "Never" to actually get these updates! Hopefully I get around to actually keeping it updaded lmao.

## Feedback and issues

- If you have a GitHub account, feel free to open an issue if something isn't working.
- You can also leave feedback using this Google Form (no login required): [Feedback Form FR Coli Tracker](https://docs.google.com/forms/d/e/1FAIpQLScvcs1QRKmo9Q7C6kQ6nM3aZ3PV9bRNjTLSyEbLTifZdEdz8Q/viewform?usp=dialog)

## License

[MIT License](LICENSE)
