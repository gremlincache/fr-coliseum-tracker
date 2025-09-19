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

## Troubleshooting
- If I fuck up the formatting in itemIndex, the entire script will decide to nope out. If an update has been pushed that edites the itemIndex and you notice the script stopped working, make sure you refresh the "Externals" update interval once a fix has been implemented. To confirm if this is an issue that is causing the window to disappear, edit the code in Tampermonkey (this only edits your local copy) and remove the line that starts with @require. If removing this line makes the window re-appear, then you know the itemIndex is the culprit. Sorry!
- The script only appears on the coliseum battle pages, which is intended. (specifically any part of the site that starts with https://flightrising.com/main.php? as the URL)
- Yeah tbh idk how to troubleshoot this. pray? and let me know in the feedback form so I can poke at it ..b

## Feedback and issues
- Previously, the script had issues for Firefox users. The script should now work since it's been split so while it starts running and listening for WS messages on document-start, the UI doesn't render until the page is ready (which was previously making it not appear at all). If it still doesn't work, uhhh please report the error in the feedback form and I will do my best to fix it ..b
- If you have a GitHub account, feel free to open an issue if something isn't working.
- You can also leave feedback using this Google Form (no login required): [Feedback Form FR Coli Tracker](https://docs.google.com/forms/d/e/1FAIpQLScvcs1QRKmo9Q7C6kQ6nM3aZ3PV9bRNjTLSyEbLTifZdEdz8Q/viewform?usp=dialog)

## License

[MIT License](LICENSE)
