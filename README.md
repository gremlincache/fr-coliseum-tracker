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
2. Open the [Flight Rising Coliseum Tracker.user](https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js) file in your browser.
3. Click **Install** in Tampermonkey.
4. Done! The script is now installed

## Useage

1. A toggle button saying 'Coliseum Tracker' will now appear on the coliseum pages on Flight Rising **in the top right corner**. Clicking this toggle button should open the tracking window. Toggling the visibility does not affect the tracking (it will continue to track)
2. Once the toggle button is appearing on your page, you can technically start any coliseum battle and it will track loot. The tool does **not** automatically know what venue you're in, and will simply track any and all loot regardless of where the loot drops from. To ensure your loot is tracked in the correct venue in the tool, click on the 'Switch Venue' and switch to whichever venue you want to track. Switching venues does not reset the battles won counter or the tracked loot.
3. You can sort the tracked loot by ID or by name (A-Z) by toggling the Sort by ID/Sort A-Z button underneath the text area in the tool.
4. Similarly, you can filter the tracked loot by category by using the category drop down located next to the sorting drop down. Note that any items that aren't added in the itemIndex yet will **only** show in the category 'All'.
5. By clicking 'Reset Venue' you will be prompted by a window to confirm if you wish to reset. Resetting the venue will clear the currently selected venue of any loot tracked and wins. Clicking 'Reset All' will reset all venues, regardless of which one is currently selected.
6. 'Show Overview' will show you the tracked items without the bbcode formatting in two columns.
7. Settings can be found by clicking the cog symbol in the top right corner of the main window. Settings currently include an option to edit the font size (between 8-24px), as well as a 'Toggle Theme' button to swap between the Light and Dark theme.
8. In the Settings popup, you will also find export options, which when clicked on will download a file that contains all the currently tracked loot in the chosen format. Currently this only displays the items tracked with IDs and not names. The default file name is 'FR_Coliseum_Data'.
9. The tracker will automatically load the external `itemIndex.js` which connects the IDs that are shown in the WebSocket message with the item names. **This index was created and is maintained manually by me to ensure no scraping occurs**, but this also means sometimes items might be missing from the index.

## Updating Items

- Users will automatically get the updated item list the next time Tampermonkey refreshes the script from GitHub. Make sure that "Externals" update interval in your Tampermonkey settings is set to anything other than "Never" to actually get these updates! Hopefully I get around to actually keeping it updaded lmao.

## Troubleshooting
- If I fuck up the formatting in itemIndex, the entire script will decide to nope out. If an update has been pushed that edites the itemIndex and you notice the script stopped working, make sure you refresh the "Externals" update interval once a fix has been implemented. To confirm if this is an issue that is causing the window to disappear, edit the code in Tampermonkey (this only edits your local copy) and remove the line that starts with @require. If removing this line makes the window re-appear, then you know the itemIndex is the culprit. Sorry!
- The script only appears on the coliseum battle pages, which is intended. (specifically any part of the site that starts with https://flightrising.com/main.php? as the URL)
- Yeah tbh idk how to troubleshoot this. pray? and let me know in the feedback form so I can poke at it ..b I am not an experienced developer

## Feedback and issues
- Previously, the script had issues for Firefox users. The script should now work since it's been split so while it starts running and listening for WS messages on document-start, the UI doesn't render until the page is ready (which was previously making it not appear at all). If it still doesn't work, uhhh please report the error in the feedback form and I will do my best to fix it ..b
- If you have a GitHub account, feel free to open an issue if something isn't working.
- You can also leave feedback using this Google Form (no login required): [Feedback Form FR Coli Tracker](https://docs.google.com/forms/d/e/1FAIpQLScvcs1QRKmo9Q7C6kQ6nM3aZ3PV9bRNjTLSyEbLTifZdEdz8Q/viewform?usp=dialog)

## License

[MIT License](LICENSE)
