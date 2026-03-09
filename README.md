# Flight Rising Coliseum Tracker

A Tampermonkey userscript to track Coliseum wins and loot in Flight Rising. **This script does not interact with, scrape, or manipulate the game server in any way**, nor does it provide any gameplay advantage. It only reads the data already sent to your browser and displays it in a more organized, readable format for personal tracking purposes. All item names, categories and IDs are manually entered in the file `itemIndex.js`, which simply connects the IDs in the WebSocket messages to readable names (with fallbacks for unknown items using `[gamedb item=id]` BBCode). Anything you can do with this tool, you could do with a spreadsheet by copying the WS messages the coliseum sends your browser, this just hopefully makes it easier!
## Features

- Track Coliseum wins and loot per venue
- Display loot as BBCode (`[item=name]`, `[skin=id]`, or `[gamedb item=id]` for unknown items)
- Sort by name, ID, amount, or category
- Filter by category: Food, Materials, Apparel, Familiars, Battle, Skins, Specialty, Other
- Overview tab with search and per-item counts
- Quest tracker with item, category, and win goals - including a small notification when a quest is completed.
- Highlight system with fully customizable presets (import/export supported)
- Festival item tracking with configurable display mode
- Theme editor with full color customization and saveable presets
- Multi-venue support: view and sort loot across all venues simultaneously
- Persistent panel size, position, and collapse states
- Draggable main panel and settings panel
- Configurable font, font size, column mode, header mode, icon mode, and toggle style

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open the raw [Flight Rising Coliseum Tracker.user.js](https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/beta/Flight%20Rising%20Coliseum%20Tracker.user.js) file, which will trigger a prompt to install the script from Tampermonkey. **This link currently links to the beta 2.0, and will need to be updated to use the main branch when merged**
3. Click **Install** in Tampermonkey.
4. Done!

## Usage

### Getting started

A toggle button labeled **Coliseum Tracker** will appear on all Coliseum battle pages. Clicking it opens the main tracking window. You can hide the main panel by clicking the small x button in the top right corner. Hiding the panel does **not** pause tracking. The toggle button has an invisible handle for positioning in the **top-right corner**, while the main panels have the handle in the top-left corner, indicated by an icon.

The script only tracks loot from battles - it does **not** automatically know which venue you are in. The WebSocket messages the tool reads to track loot only provides the item IDs, so automatically tracking the current venue in an accurate way is **not possible**. To keep your loot organized, use the venue selector in the panel header to switch to the correct venue before you start battling. Switching venue does not reset any data.

### Tabs

**BBCode**
Displays your tracked loot formatted as BBCode, ready to copy to the clipboard. You can choose between four layout formats: List (one item per line), Block (space-separated), Columns (uses the `[columns]` BBCode), and Plaintext. You can also choose whether to display loot from the current venue only or from all venues combined. Clicking anywhere on the BBCode will mark the entire text for easier copying, or you can hit the copy button to copy the BBCode.

**Overview**
Shows all tracked loot as a readable list with item counts. Supports live search by item name or ID. Like BBCode, you can filter by current venue or view all venues at once. When viewing all venues, you can choose between Grouped (loot separated by venue) or Mixed (all loot combined, with amounts summed across venues) in Settings.

**Quests**
Lets you set up personal goals and track progress toward them. Each quest can have one or more goals of three types:
- **Item goal** — track drops of a specific item by name or ID
- **Category goal** — track drops in a category (Food, Familiars, etc., including Highlights and Festival)
- **Battle goal** — track battles won in a specific venue or across all venues

Completed quests move to the Completed section automatically, with an optional notification. Quests can be imported and exported as JSON. 

### Sorting and filtering

The footer contains a sort selector and a category filter that apply across both the BBCode and Overview tabs. Sort options include name, amount, ID, and all three with category grouping. The category filter limits displayed items to the selected category.

### Settings

Access settings via the **gear icon** in the panel header. Settings are split into two tabs:

**Visual**
- Font and font size
    - Note that the padding used in the panels is relative to the font-size, so by increasing or decreasing the font-size, the padding will be adjusted accordingly. 
- Venue group mode (Grouped or Mixed for multi-venue views)
- Column mode (Auto-width or Single column)
- Header mode (Always show category headers, only in All category, or never)
- Icon mode (show icons in headers, entries, or both)
- Toggle position and style (text label or icon)
    - The toggle position refers to where the toggle is positioned relative to the main panel.
- Quest completion notification toggle
- Full theme color editor with named, saveable presets

**Highlights**
- Festival drop display mode (Duplicate, Exclusive, or Off)
- Which festival item sets to include (Elemental, Micro-Holidays, NotN)
- Highlight drop display mode (Duplicate, Exclusive, or Off)
- Highlight preset editor - add items by name or ID, save/rename/delete presets, import and export as JSON

The default highlight preset includes eggs, boss familiars, and Eliminate drops. The "Duplicate, Exclusive or Off" options refer to if items are displayed in their original category and the festival/highlight category (duplicated), if they are only displayed in the festival/highlight category (exclusive) or if they are only displayed in the original category (off). The festival item sets specify which items will be sorted as Festival items, and each category includes all items from those festivals. 

### Resetting data

The footer contains **Reset Venue** (clears loot and win count for the current venue) and **Reset All Venues** (clears all venues). Both ask for confirmation before doing anything. A **Delete All Data** button is also available at the bottom of the **Settings panel**, and will clear all data stored.

## Updating items

The `itemIndex.js` file is loaded automatically via jsDelivr and updates independently from the main script. Make sure the **Externals** update interval in your Tampermonkey settings is set to anything other than **Never** to receive item index updates. The main script updates via the standard Tampermonkey auto-update mechanism. jsDelivr is used to ensure compatibility with Greasy Fork.

## Troubleshooting

**The window doesn't appear at all**
The script only runs on `https://flightrising.com/main.php?p=battle*`, so it will not appear on any other page. If you are on a battle page and it still doesn't appear, try disabling and re-enabling the script in Tampermonkey, or check the browser console for errors.

**Items are showing with IDs instead of names**
This means I haven't added the item to the itemIndex yet. It will still appear in the All category using `[gamedb item=id]` BBCode, which Flight Rising can render. If you see this for an item that should already be indexed, the itemIndex may not have updated yet - check your Externals update interval in Tampermonkey settings. Since the itemIndex is loaded via jsDelivr, there might be up to a 24h delay before itemIndex updates show up m(..')m

**Items are showing up in the wrong category, or only in All**
This means I accidentally put the item in the wrong category, or typo'd the category when I entered it into itemIndex m(..')m Please let me know and I will correct it

**The script stopped working after an update**
If a recent push edited `itemIndex.js` and introduced a formatting error, the entire external file may fail to load and the script window will disappear. To confirm this is the cause, open the script in Tampermonkey's editor (this only edits your local copy) and temporarily remove the `@require` line. If the window reappears, the itemIndex is the culprit - keep an eye on the repo for a fix and refresh your Externals once it's pushed.

**Firefox users**
The script should work on Firefox. The UI is intentionally deferred until the page is ready (`DOMContentLoaded`) even though the WebSocket listener starts at `document-start`, which was the cause of a previous Firefox-specific issue. If you still have trouble, please report it using the feedback options below.

## Feedback and issues

- Open an [issue on GitHub](https://github.com/gremlincache/fr-coliseum-tracker/issues) if you have a GitHub account
- Leave feedback (no login required) using the [Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLScvcs1QRKmo9Q7C6kQ6nM3aZ3PV9bRNjTLSyEbLTifZdEdz8Q/viewform?usp=dialog)
- Poke me on [tumblr](https://gremlincache.tumblr.com)

I am not an experienced developer, so if something breaks I will do my best but no promises on turnaround time ..b

## License

[MIT License](LICENSE)
