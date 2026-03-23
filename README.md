# Flight Rising Coliseum Tracker

A Tampermonkey userscript to track Coliseum wins and loot in Flight Rising. **This script does not scrape, or manipulate the game server in any way**, nor does it provide any gameplay automation. The tool tracks loot by listening for WebSocket messages - for a more in-depth explanation, see this [Tumblr post](https://www.tumblr.com/gremlincache/811729736306982912/how-the-coliseum-tracker-works?source=share). While this script isn't doing anything that can be detected by the site/server, there is always a risk with using any type of script or add-on that does anything on Flight Rising. Please use it at your own discretion.

## Features

- Track Coliseum wins and loot per venue.
- Format loot as BBCode for easy sharing to the forums - choose between different formatting options for the loot and headers.
- Overview tab with search and per-item counts.
- Sort by name, ID, amount, or category.
- Filter by category: Food, Materials, Apparel, Familiars, Battle, Skins, Specialty, Other.
- Quest tracker with item, category, and win goals - including a small notification when a quest is completed. Import and export of quests supported.
- Track valid encounters for quest goals to see how many encounters it took to complete.
- Highlight system with fully customizable presets. Import and export of highlight sets supported.
- Festival item tracking with configurable display mode - choose what type of festivals, if any, to track as festival items.
- Theme editor with full color customization and saveable presets.
- Multi-venue support: view and sort loot across all venues simultaneously, a specific venue, or the current venue.
- Persistent panel size, position, and collapse states.
- Draggable main panel and settings panel.
- Configurable font, font size, column mode, header mode, icon mode, and toggle style for in-depth customization. 

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open the raw [Flight Rising Coliseum Tracker.user.js](https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js) file, which will trigger a prompt to install the script from Tampermonkey.
3. Click **Install** in Tampermonkey.
4. Done!

## Usage

### Getting started

A toggle button labeled **Coliseum Tracker** will appear on all Coliseum battle pages. Clicking it opens the main tracking window. You can hide the main panel by clicking the small x button in the top right corner. Hiding the panel does **not** pause tracking. The toggle button has an invisible handle for positioning in the **top-right corner**, while the main panels have the handle in the top-left corner, indicated by an icon. Certain sections can be collapsed by hitting the corresponding arrow icon to save space, including the **footer** (which contains the sort, category filter and reset options) and **quest sub-menus**

The tool will automatically detect which venue you're battling in and update the header with the information. Switching which venue is being displayed in the tabs does not reset any data! 

### Tabs

**BBCode**
Displays your tracked loot formatted as BBCode, ready to copy to the clipboard. You can choose between four layout formats: List (one item per line), Block (space-separated), Columns (uses the `[columns]` BBCode), and Plaintext. You can also choose whether to display loot from a specific venue, the current venue or from all venues combined. Clicking anywhere on the BBCode will mark the entire text for easier copying, or you can hit the copy button to copy the BBCode.

**Overview**
Shows all tracked loot as a readable list with item counts. Supports live search by item name or ID. Like BBCode, you can filter by a specific venue, the current venue (which auto updates if you switch venue) or view all venues at once. When viewing all venues, you can choose between Grouped (loot separated by venue) or Mixed (all loot combined, with amounts summed across venues) in **Settings**.

**Quests**
Lets you set up personal goals and track progress toward them. Each quest can have one or more goals of three types:
- **Item goal** — track drops of a specific item by name or ID
- **Category goal** — track drops in a category (Food, Familiars, etc., including Highlights and Festival)
- **Battle goal** — track battles won in a specific venue or across all venues

Completed quests move to the Completed section automatically, with an optional notification. Note that you have to manually delete completed quests to clear them from storage. Quests can be imported and exported as JSON.

Quests also track valid encounters, letting you know how many times you fought an enemy that could've dropped the tracked item. **This can be toggled in the settings.** You can also choose if the tool should track encounters (individual enemies in a battle) or battles. **If you turn encounter tracking off, it will not record any valid encounters until you turn it back on. If you have it set to encounters, it will not track battles, and vice versa**

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
- BBCode header formatting (bold + centered, using hidden tags, or plain)
- Icon mode (show icons in headers, entries, or both)
- Toggle position and style (text label or icon)
    - The toggle position refers to where the toggle is positioned relative to the main panel.
- Quest battle/encounter tracking and cound mode (battles or encounters)
- Quest completion notification toggle
- Full theme color editor with named, saveable presets

**Highlights**
- Festival drop display mode (Duplicate, Exclusive, or Off)
- Which festival item sets to include (Elemental, Micro-Holidays, NotN)
- Highlight drop display mode (Duplicate, Exclusive, or Off)
- Highlight preset editor - add items by name or ID, save/rename/delete presets, import and export as JSON

The default highlight preset includes eggs, boss familiars, and Eliminate drops. The "Duplicate, Exclusive or Off" options refer to if items are displayed in their original category and the festival/highlight category (duplicated), if they are only displayed in the festival/highlight category (exclusive) or if they are only displayed in the original category (off). The festival item sets specify which items will be sorted as Festival items, and each category includes all items from those festivals. 

### Resetting data

The footer contains **Reset Venue**, a drop down that lets you select which venue to clear data for. There is also an option for all venues. Any reset will ask for confirmation before doing anything. 

A **Delete All Data** button is also available at the bottom of the **Settings panel**, and will clear all data stored in localStorage, including themes, highlight presets, and any user settings.

You can reset the highlight and theme presets back to default by hitting the **Reset all Presets to Defaults** button in the corresponding visual and highlight settings tab. 

## Updating items

The `itemIndex.js` file is loaded automatically and updates independently from the main script. Make sure the **Externals** update interval in your Tampermonkey settings is set to anything other than **Never** to receive item index updates.

## Troubleshooting

### The window doesn't appear at all
The script only runs on `https://flightrising.com/main.php?p=battle*`, so it will not appear on any other page. If you are on a battle page and it still doesn't appear, try disabling and re-enabling the script in Tampermonkey, or check the browser console for errors.

### Items are showing with IDs instead of names
This means I haven't added the item to the itemIndex yet. It will still appear in the All category using `[gamedb item=id]` BBCode, which Flight Rising can render. If you see this for an item that should already be indexed, the itemIndex may not have updated yet - check your Externals update interval in Tampermonkey settings. If an item is missing, report it in the [Missing Items issue](https://github.com/gremlincache/fr-coliseum-tracker/issues/7).

### Items are showing up in the wrong category, or only in All
This means I accidentally put the item in the wrong category, or typo'd the category when I entered it into itemIndex m(..')m Please let me know in the [Missing Items issue](https://github.com/gremlincache/fr-coliseum-tracker/issues/7)  and I will correct it

### The script stopped working after an update
If a recent push edited `itemIndex.js` and introduced a formatting error, the entire external file may fail to load and the script window will disappear. To confirm this is the cause, open the script in Tampermonkey's editor (this only edits your local copy) and temporarily remove the `@require` line. If the window reappears, the itemIndex is the culprit - keep an eye on the repo for a fix and refresh your Externals once it's pushed.

### The tool is slow and/or laggy
When a large amount of loot is being displayed, the tool will be slower to respond. Limit the amount of loot shown by viewing a specific venue and/or category. Setting column mode to **single** can greatly improve performance if you have a large amount of loot. Turning off **Quest Battle Count** will improve performance if you have many active quests.

### The tool is not behaving as it should
_Theoretically_ the tool could use all available localStorage alloted to the site by the browser, which may cause unexpected behaviours. It is recommended to clear any presets (highlight and theme), quests (especially completed) or venue data that you don't need in order to avoid this. You can see if this is the cause of the issue by checking the console for `QuotaExceededError`.

### The tool window is stuck off screen/I lost the toggle button
The position of the tool can be reset by deleting or editing the fr_coli_toggleTop, fr_coli_toggleRight, fr_coli_posTop and fr_coli_posRight key/values in local storage. Local storage can be accessed by opening the DevTools > Application > Local storage.

### I want to go back to the previous version!
This can be done by using the script in the v.1.3.2 branch ..b

## Feedback and issues

- Open an [issue on GitHub](https://github.com/gremlincache/fr-coliseum-tracker/issues) if you have a GitHub account
- Leave feedback (no login required) using the [Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLScvcs1QRKmo9Q7C6kQ6nM3aZ3PV9bRNjTLSyEbLTifZdEdz8Q/viewform?usp=dialog)
- Poke me on [tumblr](https://gremlincache.tumblr.com)

I am not an experienced developer, so if something breaks I will do my best but no promises on turnaround time ..b

## License

[MIT License](LICENSE)
