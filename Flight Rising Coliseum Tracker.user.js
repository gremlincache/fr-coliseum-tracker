// ==UserScript==
// @name         Flight Rising Coliseum Tracker
// @namespace    https://tampermonkey.net/
// @version      2.0.1
// @description  Tool that tracks loot and battles fought in the Coliseum, with BBCode formatter, quests tracking, categories and highlights.
// @match        https://flightrising.com/main.php?p=battle*
// @grant        none
// @run-at       document-start
// @require      https://raw.githubusercontent.com/gremlincache/fr-coliseum-tracker/refs/heads/main/itemIndex.js
// @updateURL    https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js
// @downloadURL  https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js
// ==/UserScript==

(function () {
    'use strict';
    // --- Prevent double execution
    if (window.hasRunColiTracker) return;
    window.hasRunColiTracker = true;

    // --- External itemIndex
    const itemIndex = window.itemIndex;

    // --- Highlight default preset array
    const defaultHighlightPreset = ["577", "578", "579", "580", "581", "582", "583", "584", "585", "586", "587",
        "498",
        "1222", "7594", "7600", "7882", "7883", "10231", "10233", "11522", "11525", "13428", "13430", "16481", "16487", "16911", "16912", "17507", "17508", "20145", "20157", "21430", "21431", "23842", "23844", "25776", "25777", "28235", "28236", "34765", "34766", "36300", "36301", "51945", "51946"];

    // --- Festival item ID sets
    const festivalItemIds = {
        elemental: ["882", "887", "888", "889", "890", "891", "892", "893", "894", "895", "896"],
        micro: ["27664", "27665", "28572", "28573", "28574", "28575", "29247", "29248", "29326", "29407", "29408", "29409", "30385", "30386", "30387", "30388", "31625", "31626", "35959", "38285", "38286", "38287", "38288", "38289", "38290", "39895", "41418", "42541", "42988", "42989", "42990", "42991", "43685", "46518", "46519", "46520", "46886", "47012", "48025", "49374", "50884", "52126", "52127", "53051", "53052", "55280", "55281", "57528", "57529"],
        notn: ["7685", "7686", "7687", "7688", "15290", "15291", "15292", "15293", "7690", "7693", "7694", "7695", "7696", "15294", "15295", "15296", "15297", "7689"]
    };

    const elementMap = {
        0: "neutral", 1: "earth", 2: "plague", 3: "wind", 4: "water", 5: "lightning", 6: "ice", 7: "shadow", 8: "light", 9: "arcane", 10: "nature", 11: "fire"
    };

    let questBattleCountEnabled = localStorage.getItem("fr_coli_questBattleCount") !== "false";
    let questBattleCountMode = localStorage.getItem("fr_coli_questBattleCountMode") ?? "battles";
    let highlightPreset = [...defaultHighlightPreset];

    let savedHighlightPresets = JSON.parse(localStorage.getItem("fr_coli_highlightPresets") ?? "{}");
    let activeHighlightPresetName = localStorage.getItem("fr_coli_activeHighlightPreset") ?? "Default";
    const defaultHighlightPresets = { "Default": [...defaultHighlightPreset] };
    let workingHighlightPreset = [...highlightPreset];

    // --- Venues & Categories
    const venueDisplayMap = {
        "training_fields": "Training Fields",
        "woodland_border": "Woodland Path",
        "scorched_forest": "Scorched Forest",
        "boneyard": "Boneyard",
        "sandswept_delta": "Sandswept Delta",
        "silk-strewn_wreckage": "Silk-Strewn Wreckage",
        "blooming_grove": "Blooming Grove",
        "forgotten_cave": "Forgotten Cave",
        "bamboo_waterfall": "Bamboo Falls",
        "thunderhead_savanna": "Thunderhead Savanna",
        "redrock": "Redrock Cove",
        "waterway": "Waterway",
        "arena": "Arena",
        "volcanic_vents": "Volcanic Vents",
        "rainsong_jungle": "Rainsong Jungle",
        "boreal_wood": "Boreal Wood",
        "crystalspine_pools": "Crystal Pools",
        "harpys_roost": "Harpy's Roost",
        "ghostlight_ruins": "Ghostlight Ruins",
        "mire": "Mire",
        "kelp_beds": "Kelp Beds",
        "golem_workshop": "Construct Workshop",
        "forbidden_portal": "Forbidden Portal",
    };

    const categories = ["All", "Highlights", "Festival", "Food", "Materials", "Apparel", "Familiars", "Battle", "Skins", "Specialty", "Other", "Wins"];
    const categoryOrderMap = Object.create(null);
    categories.forEach((cat, i) => { categoryOrderMap[cat] = i; });

    // --- State & defaults
    let currentVenue = localStorage.getItem("fr_coli_currentVenue") ?? "training_fields";
    let currentEnemies = [];
    let activeCategory = localStorage.getItem("fr_coli_category") ?? "All";
    let sortMode = localStorage.getItem("fr_coli_sortMode") ?? "name";
    let fontSize = parseInt(localStorage.getItem("fr_coli_fontSize")) || 12;
    let headerMode = localStorage.getItem("fr_coli_headerMode") ?? "all";
    let bbcodeLayout = localStorage.getItem("fr_coli_bbcodeLayout") ?? "lines";
    let highlightMode = localStorage.getItem("fr_coli_highlightMode") ?? "duplicate";
    let festivalMode = localStorage.getItem("fr_coli_festivalMode") ?? "duplicate";
    let panelHidden = localStorage.getItem("fr_coli_panelHidden") !== "false";
    let venueGroupMode = localStorage.getItem("fr_coli_groupMode") ?? "grouped";
    let bbcodeVenue = localStorage.getItem("fr_coli_bbcodeVenue") ?? "All";
    let overviewVenue = localStorage.getItem("fr_coli_overviewVenue") ?? "All";
    let activeTabName = localStorage.getItem("fr_coli_activeTab") ?? "Overview";
    let activeSetTabName = localStorage.getItem("fr_coli_activeSetTab") ?? "Visual";
    const festivalTypes = [["elemental", "Elemental"], ["micro", "Micro-Holidays"], ["notn", "NotN"]];
    let activeFestivals = new Set(JSON.parse(localStorage.getItem("fr_coli_festivals") ?? "[]"));
    let columnMode = localStorage.getItem("fr_coli_columnMode") ?? "auto";
    let iconMode = localStorage.getItem("fr_coli_iconMode") ?? "both";
    let toggleCorner = localStorage.getItem("fr_coli_toggleCorner") ?? "top-right";
    let toggleStyle = localStorage.getItem("fr_coli_toggleStyle") ?? "text";
    let bbcodeHeaderStyle = localStorage.getItem("fr_coli_bbcodeHeaderStyle") ?? "bold-center";
    let activeQuests = JSON.parse(localStorage.getItem("fr_coli_activeQuests") ?? "[]");
    let completedQuests = JSON.parse(localStorage.getItem("fr_coli_completedQuests") ?? "[]");
    let savedFont = localStorage.getItem("fr_coli_fontFamily") ?? "Verdana, Geneva, sans-serif";
    let questNotifEnabled = localStorage.getItem("fr_coli_questNotif") !== "false";

    // --- Theme definitions
    const defaultThemes = {
        Dark: {
            "--gc-frame": "#121212", "--gc-icons": "#e0e0e0",
            "--gc-header-text": "#e0e0e0", "--gc-main": "#2e2e2e", "--gc-main-accent": "#212121",
            "--gc-main-text": "#e0e0e0", "--gc-border": "#000000", "--gc-button": "#e0e0e0",
            "--gc-button-text": "#212121", "--gc-deleteColor": "#b80000", "--gc-deleteColor-accent": "#e0e0e0",
            "--gc-highlightColor": "#d99b45", "--gc-contentDivider": "#121212",
            "--gc-overviewHeader": "#dedede", "--gc-overviewHeader-accent": "#121212",
            "--gc-venueHeader": "#ffffff", "--gc-venueHeader-accent": "#292929", "--gc-entryIcons": "#c2c2c2",
        },
        Light: {
            "--gc-frame": "#fafafa", "--gc-icons": "#454545",
            "--gc-header-text": "#454545", "--gc-main": "#f2f2f2", "--gc-main-accent": "#e3e3e3",
            "--gc-main-text": "#454545", "--gc-border": "#f7f7f7", "--gc-button": "#454545",
            "--gc-button-text": "#f7f7f7", "--gc-deleteColor": "#d93636", "--gc-deleteColor-accent": "#f2f2f2",
            "--gc-highlightColor": "#ffaf24", "--gc-contentDivider": "#c7c7c7",
            "--gc-overviewHeader": "#f2f2f2", "--gc-overviewHeader-accent": "#454545",
            "--gc-venueHeader": "#454545", "--gc-venueHeader-accent": "#f2f2f2", "--gc-entryIcons": "#949494",
        }
    };

    // Each entry: [label, css variable name]
    const colorVars = [
        ["Frame", "--gc-frame"], ["Icons", "--gc-icons"],
        ["Header Text", "--gc-header-text"], ["Main", "--gc-main"], ["Main Accent", "--gc-main-accent"],
        ["Main Text", "--gc-main-text"], ["Border", "--gc-border"], ["Button", "--gc-button"],
        ["Button Text", "--gc-button-text"], ["Delete", "--gc-deleteColor"], ["Delete Text", "--gc-deleteColor-accent"],
        ["Highlight", "--gc-highlightColor"], ["Content Divider", "--gc-contentDivider"],
        ["Overview Header", "--gc-overviewHeader"], ["Overview Header Accent", "--gc-overviewHeader-accent"],
        ["Venue Header", "--gc-venueHeader"], ["Venue Header Accent", "--gc-venueHeader-accent"],
        ["Entry Icons", "--gc-entryIcons"]
    ];

    let savedThemes = JSON.parse(localStorage.getItem("fr_coli_themes") ?? "{}");
    let activeThemeName = localStorage.getItem("fr_coli_activeTheme") ?? "Dark";

    const collapseStates = JSON.parse(localStorage.getItem("fr_coli_collapseStates") ?? "{}");
    function saveCollapseStates() { localStorage.setItem("fr_coli_collapseStates", JSON.stringify(collapseStates)); }

    function showHeader() {
        return headerMode === "always" || (headerMode === "all" && activeCategory === "All");
    }

    const venueDataCache = {};
    function getVenueData(v) {
        if (!venueDataCache[v]) {
            venueDataCache[v] = JSON.parse(localStorage.getItem(`fr_coli_data_${v}`) || '{"battleCount":0,"loot":{}}')
        };
        return venueDataCache[v];
    }
    function saveVenueData(v, d) {
        venueDataCache[v] = d;
        localStorage.setItem(`fr_coli_data_${v}`, JSON.stringify(d));
    }

    const overviewAmountEls = new Map(); // itemId -> amount DOM element
    let overviewWinsEl = null; // reference to wins display in overview
    const highlightSet = new Set((highlightPreset || []).map(String));

    const itemsByCategory = Object.create(null);
    for (const [id, item] of Object.entries(itemIndex)) {
        const cat = item.category || "Other";
        if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
        itemsByCategory[cat].push(item);
    }

    const itemNameMap = Object.create(null);
    for (const [id, item] of Object.entries(itemIndex)) {
        itemNameMap[item.name.toLowerCase()] = id;
    }

    const festivalSet = new Set();
    function rebuildFestivalSet() {
        festivalSet.clear();
        activeFestivals.forEach(key => {
            (festivalItemIds[key] || []).forEach(id => festivalSet.add(String(id)));
            Object.entries(itemIndex).forEach(([id, item]) => {
                if (item.festival === key) festivalSet.add(id);
            });
        });
    }
    rebuildFestivalSet();

    // --- DATA / MODEL HELPERS ---

    function normalizeData(venue) {
        const data = getVenueData(venue);
        const entries = [];
        for (const [id, info] of Object.entries(data.loot)) {
            const item = itemIndex[id];
            entries.push({
                venue: String(venue), id: String(id), amount: info,
                name: item?.name || id, category: item?.category || "Other",
                isHighlight: highlightSet.has(String(id)), isFestival: festivalSet.has(String(id))
            });
        }
        return entries;
    }

    function allVenueEntries() {
        const map = new Map();
        for (const key of Object.keys(venueDisplayMap)) {
            for (const e of normalizeData(key)) {
                if (map.has(e.id)) map.get(e.id).amount += e.amount;
                else map.set(e.id, { ...e });
            }
        }
        return [...map.values()];
    }

    function getVenueEntries(venue) {
        if (venue === "All") return allVenueEntries();
        return normalizeData(venue);
    }

    function sortEntries(entries, sortBy) {
        function categoryOrder(cat) { return categoryOrderMap[cat] ?? categories.length; }
        const baseComparators = {
            name: (a, b) => a.name.localeCompare(b.name),
            id: (a, b) => Number(a.id) - Number(b.id),
            amount: (a, b) => b.amount - a.amount || a.name.localeCompare(b.name),
        };
        const categoryComparator = (a, b) => categoryOrder(a.category) - categoryOrder(b.category);
        const comparators = {
            name: baseComparators.name, id: baseComparators.id, amount: baseComparators.amount,
            "category-name": (a, b) => categoryComparator(a, b) || baseComparators.name(a, b),
            "category-id": (a, b) => categoryComparator(a, b) || baseComparators.id(a, b),
            "category-amount": (a, b) => categoryComparator(a, b) || baseComparators.amount(a, b),
        };
        if (comparators[sortBy]) entries.sort(comparators[sortBy]);
        return entries;
    }

    function filterEntries(entries, highlightMode, festivalMode, activeCategory) {
        const highlights = [], festivals = [], filtered = [];
        if (activeCategory === "Wins") return { filtered: [], highlights: [], festivals: [] };
        entries.forEach(e => {
            if (e.isHighlight) highlights.push(e);
            if (e.isFestival) festivals.push(e);
            const inHighlights = e.isHighlight && highlightMode !== "off";
            const inFestivals = e.isFestival && festivalMode !== "off";
            const excludedByHighlight = e.isHighlight && highlightMode === "exclusive";
            const excludedByFestival = e.isFestival && festivalMode === "exclusive";
            if (excludedByHighlight || excludedByFestival) return;
            if (activeCategory === "All") filtered.push(e);
            else if (activeCategory === "Highlights" && inHighlights) filtered.push(e);
            else if (activeCategory === "Festival" && inFestivals) filtered.push(e);
            else if (e.category === activeCategory) filtered.push(e);
        });
        return { filtered, highlights, festivals };
    }

    function groupEntries(entries, sortBy) {
        if (sortBy !== "category-name" && sortBy !== "category-id" && sortBy !== "category-amount") {
            return [{ key: null, entries }];
        }
        const groups = [];
        let currentKey = null, currentGroup = null;
        for (const e of entries) {
            if (e.category !== currentKey) {
                currentKey = e.category;
                currentGroup = { key: currentKey, entries: [] };
                groups.push(currentGroup);
            }
            currentGroup.entries.push(e);
        }
        return groups;
    }

    function buildLootModel(venue, sortMode, activeCategory, highlightMode, festivalMode) {
        const entries = getVenueEntries(venue);
        const sorted = sortEntries(entries, sortMode);
        const { filtered, highlights, festivals } = filterEntries(sorted, highlightMode, festivalMode, activeCategory);
        const groups = groupEntries(filtered, sortMode);
        return { highlights, festivals, groups };
    }

    function buildVenueGroupedModel(sortMode, activeCategory, highlightMode, festivalMode) {
        return Object.entries(venueDisplayMap).map(([key, name]) => ({
            venue: name,
            battleCount: getVenueData(key).battleCount,
            ...buildLootModel(key, sortMode, activeCategory, highlightMode, festivalMode)
        })).filter(vg =>
            vg.groups.some(g => g.entries.length > 0) ||
            (highlightMode !== "off" && vg.highlights.length > 0) ||
            (festivalMode !== "off" && vg.festivals.length > 0) ||
            (activeCategory === "Wins" && vg.battleCount > 0)
        );
    }

    function formatBBCode() {
        let result = "";
        const resolvedVenue = bbcodeVenue === "current" ? currentVenue : bbcodeVenue;
        const isAllVenues = resolvedVenue === "All";
        const isGrouped = venueGroupMode === "grouped";

        function formatEntry(e) {
            if (bbcodeLayout === "plain") return `${e.name} x${e.amount}`;
            if (e.category === "Skins") return `[skin=${e.id}] x${e.amount}`;
            return `[item=${e.name}] x${e.amount}`;
        }

        function formatEntryList(e) {
            const joiners = { plain: ", ", lines: "\n", block: " " };
            const formatted = e.map(formatEntry);
            if (joiners[bbcodeLayout]) return formatted.join(joiners[bbcodeLayout]);
            if (bbcodeLayout === "columns") {
                let block = "[columns]";
                formatted.forEach((item, i) => {
                    const [base, amount] = item.split(" x");
                    block += `[center]${base}\n x${amount}`;
                    if (i < formatted.length - 1) {
                        if ((i + 1) % 6 === 0) block += "[/columns]\n[columns]";
                        else block += "[nextcol]";
                    }
                });
                if (!block.endsWith("[/columns]")) block += "[/columns]";
                return block;
            }
            return formatted.join(", ");
        }

        function formatHeader(cat) {
            if (bbcodeHeaderStyle === "plain" || bbcodeLayout === "plain") return `${cat}\n`;
            return `[center][b]${cat}[/b][/center]\n`;
        }

        // Wraps loot content with a styled header, or just the content if no header applies.
        function formatSection(title, lootStr, useHidden) {
            if (!title || !showHeader()) return lootStr + "\n\n";
            if (bbcodeHeaderStyle === "plain" || bbcodeLayout === "plain") return `${title}\n${lootStr}\n\n`;
            if (useHidden) return `[hidden title=${title}]\n${lootStr}\n[/hidden]\n\n`;
            return `[center][b]${title}[/b][/center]\n${lootStr}\n\n`;
        }

        const isCategorySort = sortMode.startsWith("category-");
        const useCatHidden = bbcodeHeaderStyle === "hidden";

        function formatLootModel(highlights, festivals, groups) {
            let block = "";
            if ((activeCategory === "All" && highlightMode !== "off" && highlights.length) || activeCategory === "Highlights") {
                block += formatSection("Highlights", formatEntryList(highlights), useCatHidden);
            }
            if ((activeCategory === "All" && festivalMode !== "off" && festivals.length) || activeCategory === "Festival") {
                block += formatSection("Festival", formatEntryList(festivals), useCatHidden);
            }
            for (const group of groups) {
                block += formatSection(group.key, formatEntryList(group.entries), useCatHidden);
            }
            return block;
        }

        if (isAllVenues && isGrouped) {
            const venueGroups = buildVenueGroupedModel(sortMode, activeCategory, highlightMode, festivalMode);
            const useVenueHidden = useCatHidden && !isCategorySort;
            for (const vg of venueGroups) {
                const battlesLine = (activeCategory === "All" || activeCategory === "Wins")
                    ? `Battles: ${vg.battleCount}\n` : "";
                const loot = formatLootModel(vg.highlights, vg.festivals, vg.groups);
                if (useVenueHidden) {
                    result += `[hidden title=${vg.venue}]\n${battlesLine}${loot.trimEnd()}\n[/hidden]\n\n`;
                } else {
                    result += formatHeader(vg.venue);
                    result += battlesLine;
                    result += loot;
                }
            }
        } else {
            const battleCount = resolvedVenue === "All"
                ? Object.keys(venueDisplayMap).reduce((sum, k) => sum + getVenueData(k).battleCount, 0)
                : getVenueData(resolvedVenue).battleCount;
            if (activeCategory === "All" || activeCategory === "Wins") {
                result += `Battles: ${battleCount}\n\n`;
            }
            const { highlights, festivals, groups } = buildLootModel(resolvedVenue, sortMode, activeCategory, highlightMode, festivalMode);
            result += formatLootModel(highlights, festivals, groups);
        }
        return result.trim();
    }

    // --- WebSocket Patch
    if (!window.coliTrackerWSHooked) {
        window.coliTrackerWSHooked = true;
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function (url, ...rest) {
            const ws = new OriginalWebSocket(url, ...rest);
            if (url.includes("/battle")) {
                ws.addEventListener("message", event => {
                    try {
                        const jsonData = JSON.parse(event.data.slice(event.data.indexOf("[")));
                        if (!Array.isArray(jsonData) || !jsonData[1]) return;

                        // Battle-load message: venue key is a string, enemies array follows
                        if (typeof jsonData[1][0] === "string" && Array.isArray(jsonData[1][1])) {
                            currentVenue = jsonData[1][0];
                            localStorage.setItem("fr_coli_currentVenue", currentVenue);
                            currentEnemies = jsonData[1][1].map(e => ({
                                name: e[3].trim(),
                                element: e[6]
                            }));
                            return;
                        }

                        // Win message
                        if (jsonData[1][0] === "P1_WIN") {
                            const venueData = getVenueData(currentVenue);
                            const drops = jsonData[1][2];
                            venueData.battleCount++;
                            drops.forEach(([id, , amount]) => { venueData.loot[id] = (venueData.loot[id] || 0) + amount; });
                            saveVenueData(currentVenue, venueData);
                            updateQuestProgress(drops);
                            updateUI(drops);

                        }
                    } catch (err) { console.warn("Coliseum Tracker parse error:", err); }
                });
            }
            return ws;
        };
    }

    function enemyMatchesItem(enemy, item) {
        const enemyElementName = elementMap[enemy.element];
        if (!item.enemies && !item.element && !item.venues && !item.allVenues) return true;
        if (item.enemies) return item.enemies.includes(enemy.name);
        if (item.additionalEnemies?.includes(enemy.name)) return true;
        if (item.excludeEnemies?.includes(enemy.name)) return false;
        if (item.element && !item.element.includes(enemyElementName)) return false;
        if (item.allVenues) return !item.excludeVenues?.includes(currentVenue);
        if (item.venues) return item.venues.includes(currentVenue);
        return false;
    }

    function isValidEncounter(item) {
        if (!currentEnemies.length) return false;
        return currentEnemies.some(enemy => enemyMatchesItem(enemy, item));
    }

    function countValidEnemies(item) {
        if (!currentEnemies.length) return 0;
        return currentEnemies.filter(enemy => enemyMatchesItem(enemy, item)).length;
    }

    function countValidEnemiesForCategory(category) {
        if (!currentEnemies.length) return 0;
        const items = itemsByCategory[category] ?? [];
        return currentEnemies.filter(enemy =>
            items.some(item => enemyMatchesItem(enemy, item))
        ).length;
    }


    function ready(fn) {
        if (document.readyState !== "loading") fn();
        else document.addEventListener("DOMContentLoaded", fn);
    }

    // --- UI BUILDING ---

    const svgSprites = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgSprites.setAttribute("style", "display: none");
    svgSprites.innerHTML = `<symbol id="gc-svgHandle" viewBox="0 0 50 80"><path d="M8.986 62.011a9 9 0 1 1-9 9 9 9 0 0 1 9-9m32 0a9 9 0 1 1-9 9 9 9 0 0 1 9-9m-32-31a9 9 0 1 1-9 9 9 9 0 0 1 9-9m32 0a9 9 0 1 1-9 9 9 9 0 0 1 9-9m-32-31a9 9 0 1 1-9 9 9 9 0 0 1 9-9m32 0a9 9 0 1 1-9 9 9 9 0 0 1 9-9"/></symbol>
        <symbol id="gc-svgGear" viewBox="0 0 50 50"><path d="M49.822 27.92a4.95 4.95 0 0 1-4.329 4.8c-3.907.614-4 .153-4.731 1.426s-.288 1.123 1.138 4.824a4.954 4.954 0 0 1-1.975 6.158l-5.094 2.963a4.93 4.93 0 0 1-6.31-1.359c-2.483-3.087-2.131-3.4-3.6-3.4s-1.113.31-3.6 3.4a4.92 4.92 0 0 1-6.3 1.363l-5.133-2.947a4.954 4.954 0 0 1-1.975-6.158c1.423-3.7 1.867-3.55 1.135-4.823s-.824-.812-4.731-1.426a4.945 4.945 0 0 1-4.329-4.794L0 22.04a4.95 4.95 0 0 1 4.329-4.8c3.907-.614 4-.153 4.731-1.426s.289-1.122-1.135-4.823A4.954 4.954 0 0 1 9.9 4.832l5.111-2.987a4.92 4.92 0 0 1 6.3 1.363c2.484 3.087 2.131 3.4 3.6 3.4s1.113-.31 3.6-3.4a4.92 4.92 0 0 1 6.3-1.363l5.123 2.967a4.954 4.954 0 0 1 1.975 6.158c-1.423 3.7-1.867 3.55-1.135 4.823s.826.807 4.731 1.426a4.945 4.945 0 0 1 4.329 4.795ZM24.911 16.885a8.085 8.085 0 1 0 8.059 8.085 8.07 8.07 0 0 0-8.059-8.085"/></symbol>
        <symbol id="gc-svgCopy" viewBox="0 0 70 70"><path d="M60.013,70.000 L10.013,70.000 C4.490,70.000 0.013,65.523 0.013,60.000 L0.013,10.000 C0.013,4.477 4.490,-0.000 10.013,-0.000 L60.013,-0.000 C65.536,-0.000 70.013,4.477 70.013,10.000 L70.013,60.000 C70.013,65.523 65.536,70.000 60.013,70.000 ZM11.830,31.162 L11.830,53.801 C11.830,56.206 13.779,58.155 16.183,58.155 L38.822,58.155 C41.227,58.155 43.176,56.206 43.176,53.801 L43.176,31.162 C43.176,28.758 41.227,26.809 38.822,26.809 L16.183,26.809 C13.779,26.809 11.830,28.758 11.830,31.162 ZM58.144,16.194 C58.144,13.789 56.194,11.840 53.790,11.840 L31.151,11.840 C28.746,11.840 26.797,13.789 26.797,16.194 L26.797,21.418 L44.212,21.418 C46.616,21.418 48.565,23.367 48.565,25.772 L48.565,43.187 L53.790,43.187 C56.194,43.187 58.144,41.237 58.144,38.833 L58.144,16.194 Z"/></symbol>
        <symbol id="gc-svgCollapseExpand" viewBox="0 0 50 50"><path d="M22.909 12.837a3 3 0 0 1 4.285 0L47.841 33.9A3 3 0 0 1 45.7 39H4.4a3 3 0 0 1-2.142-5.1Z"/></symbol>
        <symbol id="gc-svgEdit" viewBox="0 0 50 50"><path d="M26.155 1.95c2.779-2.788 6.982-3.093 9.386-.681l4.354 4.367c2.4 2.412 2.1 6.627-.679 9.416l-3.523 3.534c-1.558 1.563-4.77.875-7.175-1.537l-4.354-4.367c-2.4-2.412-3.091-5.634-1.533-7.2Zm5.008 21.179c.9-.907.252-1.595-.8-1.828a7.2 7.2 0 0 1-3.863-2.233L22.151 14.7a7.25 7.25 0 0 1-2.227-3.87c-.232-1.055-.918-1.709-1.822-.8L2 26.182C-.015 28.2-.762 38.558.98 40.305s12.066 1 14.079-1.022ZM1.9 44.8h45.93a2 2 0 0 1 2 2v1.191a2 2 0 0 1-2 2H1.9a2 2 0 0 1-2-2V46.8a2 2 0 0 1 2-2"/></symbol>
        <symbol id="gc-svgSearch" viewBox="0 0 50 50"><path d="M48.856 24.185a24.28 24.28 0 0 1-4.993 14.755c.021.02.045.032.067.053l4.67 4.686c3.51 3.521-1.109 8.154-4.619 4.633l-4.671-4.688c-.022-.022-.033-.045-.054-.067A24.244 24.244 0 0 1 .275 24.185a24.29 24.29 0 1 1 48.581 0M24.569 6A18.184 18.184 0 1 0 42.7 24.187 18.155 18.155 0 0 0 24.569 6"/></symbol>
        <symbol id="gc-svgHighlights" viewBox="0 0 50 50"><path d="M20.845 4.527a4.561 4.561 0 0 1 8.158 0l5.222 10.437 11.54 1.213a4.561 4.561 0 0 1 2.455 8.03l-8.246 6.917 2.333 10.535a4.561 4.561 0 0 1-6.543 5.04l-10.84-5.588-10.84 5.589a4.561 4.561 0 0 1-6.543-5.04l2.334-10.536-8.246-6.918a4.561 4.561 0 0 1 2.455-8.03l11.54-1.213Z"/></symbol>
        <symbol id="gc-svgSmallX" viewBox="0 0 50 50"><path d="m39.744 16.22-8.732 8.76 8.715 8.743a4.325 4.325 0 0 1-6.107 6.126l-8.716-8.743-8.7 8.725a4.325 4.325 0 0 1-6.104-6.125l8.7-8.725-8.714-8.742a4.325 4.325 0 0 1 6.107-6.126l8.714 8.742 8.732-8.76a4.325 4.325 0 1 1 6.105 6.125"/></symbol>
        <symbol id="gc-svgFood" viewBox="0 0 50 50"><path d="M23.234 2.384c-17.2 2.3-16.5 19.36-12.019 23.9 7.345 7.439 11.857 1.829 16.832 9.882C35.6 48.4 48.66 41.372 46.24 27.2 43.458 10.916 35.373.761 23.234 2.384M5.614 18.918c.065 4.631.835 7.291 3.2 9.686 7.345 7.439 11.627 1.251 16.6 9.3 4.547 7.361 8.613 8.519 13.327 7.307-2.3 3.086-9.688 6.311-15.659-3.356-4.975-8.053-9.612-2.516-16.957-9.956C3 28.733 2.508 21.8 5.614 18.918M26.389 8.276c3.325 1.218 5.182 4.508 4.148 7.349s-4.567 4.158-7.892 2.94-5.182-4.508-4.148-7.349 4.567-4.157 7.892-2.94m-.889 2.447a3.153 3.153 0 0 1 2.175 3.854 3.14 3.14 0 0 1-4.139 1.542 3.153 3.153 0 0 1-2.175-3.854 3.14 3.14 0 0 1 4.139-1.542"/></symbol>
        <symbol id="gc-svgApparel" viewBox="0 0 50 50"><path d="M31.085 14.872a3.07 3.07 0 0 0 .517 2.56A3.36 3.36 0 0 1 37 16.238c-3.1 1.038-5.23 3.295-5.216 3.7-.013-.357-.678 1.178-.086 3.026.119.372 4.131 1.474 5.65 2.19-2.447 2.491-5.4.238-5.649.427a1.55 1.55 0 0 0-.344 1.676s2.281 6.313 10.977 5.509c8.962-.829 9.725-20.8 4.07-24.95-6.746-4.945-15.317 7.056-15.317 7.056m-5.95-.307a3.7 3.7 0 0 1 3.7 3.7v7.4a3.7 3.7 0 0 1-7.406 0v-7.4a3.7 3.7 0 0 1 3.706-3.7m-6.094.157a3.07 3.07 0 0 1-.517 2.56 3.36 3.36 0 0 0-5.394-1.193c3.1 1.038 5.23 3.295 5.216 3.7.013-.357.678 1.178.086 3.026-.119.372-4.131 1.474-5.65 2.19 2.447 2.491 5.4.238 5.649.427a1.55 1.55 0 0 1 .344 1.676s-2.282 6.31-10.975 5.505c-8.963-.829-9.725-20.8-4.07-24.95 6.739-4.941 15.31 7.06 15.31 7.06Zm1.435 16.194a8.9 8.9 0 0 1-4.7 3.184c-2.037.549-8.25 8.292-8.356 9.253s5.42.427 5.42.427 1.258 5.247 1.973 4.68c6.717-5.337 9.167-15.955 9.167-15.955Zm9.361 0a8.9 8.9 0 0 0 4.7 3.184c2.038.549 8.25 8.292 8.356 9.253s-5.42.427-5.42.427-1.258 5.247-1.972 4.68c-6.717-5.337-9.167-15.955-9.167-15.955Z"/></symbol>
        <symbol id="gc-svgBattle" viewBox="0 0 50 50"><path d="M1.864 28.233c1.017.884 8.258-9.8 12.3-13.129 3.763-3.1 14.708-10.891 14.407-12.2S11.112 5.1 6.722 9.813C2.758 14.065.36 26.925 1.864 28.233M3.11 47.339c-1.7-1.408.68-14.924 9.685-23.441C22.519 14.7 47.454 1.505 48.557 3.315s-15.32 14.967-29.531 29.992C14.188 38.422 4.815 48.747 3.11 47.339m14.676-1c-.638-1.144 6.815-4.688 13.6-11.7C36.838 29 43.239 17.514 44.806 18.207S41.375 36.7 34.646 42.4s-16.221 5.086-16.86 3.942Z"/></symbol>
        <symbol id="gc-svgMaterials" viewBox="0 0 50 50"><path d="M1.556,40.771l3.1-23.712,9.687-4.124L19.164,4.5l4.879-1.914L37.8,7.995l1.077,14.054L32.784,23.43l-5.705,4.918L22.546,44.491l-14.661.548Zm24.315,4.495L29.6,30.751l5.317-4.511,9.16-1.349L48,33.8,47.4,44.57,34.238,48.463Z"/></symbol>
        <symbol id="gc-svgFamiliars" viewBox="0 0 50 50"><path d="M24.916 44.007c-1.6 0-33.219-19.664-18.438-34.491 9.353-9.382 18.548 2.619 18.548 2.619S34.084.1 43.474 9.516c14.772 14.818-16.933 34.491-18.558 34.491"/></symbol>
        <symbol id="gc-svgSkins" viewBox="0 0 50 50"><path d="M30.274 25.046c-4.182 0-5.412-1.239-5.359-5.554 0 0-.017-9.405-.017-17.487 4.693 0 23.013 19.188 23.013 23.04H30.274ZM47.9 28.691V43.4a4.6 4.6 0 0 1-4.587 4.6H6.582a4.6 4.6 0 0 1-4.591-4.6V6.6A4.6 4.6 0 0 1 6.582 2h14.7v21.17a5.93 5.93 0 0 0 5.51 5.519H47.9Z"/></symbol>
        <symbol id="gc-svgSpecialty" viewBox="0 0 50 50"><path d="M25.655 18.012c-.522-6.351-7.512-13.367-7.512-13.367C15.69 2.183 19.37-1.509 21.824.953c0 0 7.479 7.506 8.843 15.6a14.5 14.5 0 0 0-5.012 1.459M15.094 8.935l-6.17 6.188a1.707 1.707 0 0 1-2.419 0l-.035-.035a1.72 1.72 0 0 1 0-2.427l6.17-6.188a1.707 1.707 0 0 1 2.419 0l.035.035a1.72 1.72 0 0 1 0 2.427m.287 10.8a1.56 1.56 0 0 1-2.212 0l-.243-.235a1.57 1.57 0 0 1 0-2.218l4.329-4.342a1.56 1.56 0 0 1 2.212 0l.242.243a1.57 1.57 0 0 1 0 2.218Zm8.284 3.983c10.428-10.461 25.151 4.308 25.151 4.308 2.454 2.461-1.227 6.154-3.681 3.692 0 0-11.042-11.076-17.79-4.308C16.917 37.874.967 21.875.967 21.875c-2.454-2.461 1.227-6.154 3.681-3.692 0 0 12.269 12.307 19.016 5.538Zm-3.591 10.7a14.2 14.2 0 0 0 5.1-1.277c.315 5.944 6.463 12.115 6.463 12.115 2.454 2.461-1.227 6.154-3.681 3.692.002.002-6.823-6.848-7.883-14.528Zm16.783-1.794-4.329 4.342a1.56 1.56 0 0 1-2.211 0l-.242-.243a1.57 1.57 0 0 1 0-2.218l4.325-4.34a1.56 1.56 0 0 1 2.212 0l.242.243a1.57 1.57 0 0 1 .002 2.218Zm-2.167 8.342 6.169-6.188a1.707 1.707 0 0 1 2.419 0l.035.035a1.72 1.72 0 0 1 0 2.427l-6.17 6.19a1.707 1.707 0 0 1-2.419 0l-.035-.035a1.72 1.72 0 0 1 0-2.427ZM6.612 31.044a1 1 0 0 1 1.826 0l1.668 3.813 3.8 1.673a1 1 0 0 1 0 1.831l-3.8 1.673-1.668 3.814a1 1 0 0 1-1.826 0l-1.668-3.813-3.8-1.673a1 1 0 0 1 0-1.831l3.8-1.673Zm8.819 11a.852.852 0 0 1 1.562 0l.781 1.786 1.78.783a.857.857 0 0 1 0 1.567l-1.78.784-.781 1.785a.852.852 0 0 1-1.562 0l-.781-1.784-1.78-.784a.857.857 0 0 1 0-1.567l1.78-.783ZM40.549.686a1 1 0 0 1 1.826 0L44.482 5.5l4.8 2.114a1 1 0 0 1 0 1.831l-4.8 2.114-2.107 4.817a1 1 0 0 1-1.826 0l-2.107-4.817-4.8-2.114a1 1 0 0 1 0-1.831l4.8-2.114Z"/></symbol>
        <symbol id="gc-svgOther" viewBox="0 0 50 50"><path d="M25.066 17.073c8.809 0 20.463 10.549 20.463 21.888S33.875 48.968 25.066 48.968 4.6 50.3 4.6 38.96s11.657-21.887 20.466-21.887M18.4 14.247s7.337-3.128 12.729.819c5.406-3.612 8.468-7.98 8.116-9.742S33.289-.821 31.55 2.567c-.8 3.036-6.329 3.046-5.626.11S13.633-1 14.755 3.059c.615 3.012-3.069 1.05-4.005 2.46s1.662 9.859 7.65 8.728"/></symbol>
        <symbol id="gc-svgAdd" viewBox="0 0 50 50"><path d="M37.604,25.257 L25.236,25.277 L25.216,37.622 C25.206,43.467 16.557,43.481 16.566,37.636 L16.586,25.290 L4.266,25.310 C-1.424,25.319 -1.410,16.669 4.280,16.660 L16.599,16.641 L16.619,4.297 C16.628,-1.429 25.278,-1.443 25.269,4.284 L25.249,16.627 L37.618,16.607 C43.463,16.598 43.449,25.248 37.604,25.257 Z"/></symbol>
        <symbol id="gc-svgCheck" viewBox="0 0 70 50"><path d="M26.259,45.956 C32.519,36.721 48.966,6.639 48.966,6.639 C51.794,1.723 44.361,-2.704 41.533,2.212 L22.274,35.562 L8.114,22.529 C4.097,18.525 -2.103,24.559 1.913,28.563 C1.913,28.563 19.019,45.675 19.306,45.962 C21.943,48.600 24.667,48.304 26.259,45.956 Z"/></symbol>
        <symbol id="gc-svgBigIcon" viewBox="0 0 50 50"><path d="M48.917 44.243s-2.592.07-3.496.131c-2.744-1.386-4.058-.498-4.058-.498s-1.618-1.882-4.295-1.863c-1.412.009-3.743 2.067-3.743 2.067s-.512 1.119-.637 1.736c-4.494 1.46-6.284 2.29-6.625 2.116-.575-.291 6.354-13.132 20.013-12.822 1.256-.086 2.895.226 3.028 2.103.027.394-3.135.02-3.708 1.613 3.246.278 4.551.877 4.548 1.281-.021 2.792-1.027 4.136-1.027 4.136m-4.512-24.389c-.84-.408-.523-.824-.012-.726 1.466.28 2.878.273 3.648-3.199.469-2.112.453-3.263-.82-3.798-.982-.412-2.941-.059-3.781 2.858-.751 3.254-2.396 18.602-5.645 19.175-3.169.559-2.819-3.701-2.819-3.701s-7.642-3.914-8.7-4.451c1.388-4.732 2.484-15.701 3.094-18.086.838-3.275 3.222-5.148 5.337-4.17 2.131.985 11.284 5.242 13.381 6.212 2.113.977 1.88 3.412 1.035 6.612-.843 3.194-2.625 4.29-4.718 3.274m-3.488-3.34-2.608-1.273-.29 1.937 2.609 1.274zm-.639 4.876-3.261-1.592-.289 1.937 3.261 1.592zm-.929 6.812.29-1.937-7.827-3.82-.289 1.937zm-3.636-9.04-1.305-.637-.289 1.937 1.304.637zm-6.51 2.01-.289 1.937 1.304.637.29-1.937zm.35-2.938 3.261 1.591.29-1.937-3.261-1.591zm.929-6.813-.29 1.938 6.523 3.183.289-1.937zm1.392-4.829-.289 1.937 3.913 1.91.29-1.938zm5.218 2.546-.289 1.937 5.217 2.547.29-1.937zM19.511 22.44c-3.013 2.919.05 6.803.05 6.803s-2.319.234-3.992-.017c-.52-.078-2.908-2.531-2.908-2.531s.306-1.497.168-1.797c-.072-.247-2.701-3.95-3.832-3.39-.848-1.12-1.543-1.873-1.962-2.159-.179-.719.646-.679 1.615-.504 3.111.16 8.781.736 13.383-4.416 1.122-1.256 4.072-1.049 5.014 1.518-.461 5.335-2.121 9.318-2.121 9.318s-4.761-2.688-5.415-2.825m.385-11.744c.976-.706 2.143 1.386.569 2.855-4.208 3.927-7.474 4.195-12.015 3.675-1.171-.492-1.976-2.562-.167-2.966 5.428.203 8.049-.133 11.613-3.564m-1.37-.749c-2.417 2.587-5.972 3.189-10.115 3.144-1.788-.121-3.302-.212-5.788-3.56-.692-.933 1.085-1.535 1.085-1.535L1.843 5.799S4.985 1.56 13.286.961c.504 5.025 2.244 5.837 2.244 5.837s-.443-4.583.771-4.944c1.214-.362 5.324-1.628 5.233-.926-1.126 8.654-2.511 8.487-3.008 9.019M7.021 22.045c.408.498.789 1.171 1.021 1.683-.058 1.9-2.852 4.679-4.976 4.679-.644-.225-1.145-.708-1.617-1.123-1.427-1.519 4.144-6.757 5.572-5.239M4.543 33.788c.508.129 1.617.172 1.617.172L8 37s-.082 4.068.032 5.727c.724 1.055 3.36 3.375 6.303 4.613-2.178.259-8.194.056-11.504-4.5C.43 39.535-.113 32.978 1.373 29.484c-.287 2.182 1.645 3.096 3.17 4.304m6.633-7.794c.161 1.638-4.141 6.113-5.814 5.811-1.535-.667-2.702-1.614-2.322-2.021 2.22.973 7.198-3.723 6.227-6.368.341-.321 1.868 1.702 1.909 2.578m24.146 9.121c-1.116.105-13.55-6.446-14.102-6.77-.589-.345-1.898-1.446-1.411-3.98l13.714 7.008s-.478 2.306 1.799 3.742m-11.576-3.612s9.058 4.409 10.25 5.14c-.427.228-5.578 3.614-6.846 5.793 1.626-7.282-3.404-10.933-3.404-10.933M9.383 35.378 7.099 32.95c1.247.038 5.092-3.531 5.132-4.825l2.283 2.428c.723.769 6.321-.054 7.188.868 6.553 6.969 2.866 14.973 2.866 14.973s-8.208 3.181-14.761-3.788c-.867-.922.299-6.459-.424-7.228m2.028 6.143c5.487 5.835 11.76 3.391 11.76 3.391s2.836-6.121-2.651-11.957c-.726-.772-5.697-.015-6.302-.659l-1.492-1.586c-.025.789-2.522 2.91-3.077 2.893l1.492 1.586c.605.644-.456 5.559.27 6.332m6.611-3.365c2.162-.95.874-4.327 1.397-3.771 3.949 4.2 2.437 9.076 2.437 9.076s-5.045 1.264-8.941-2.987c-.41-4.23 2.806-1.307 5.107-2.318m19.215 5.571c2.51-.251 4.844 3.884 4.142 4.305-.703.422-6.473.997-7.457.154-.984-.844.943-4.222 3.315-4.459m9.421 3.772c-1.518.63-3.486-.068-3.486-.068l-1-2.177s2.246-1.029 4.486 2.245"/></symbol>
        <symbol id="gc-svgSmallIcon" viewBox="0 0 50 50"><path d="M49.635 21.339c-1.084 5.148-4.033 8.498-7.625 7.086-1.441-.567-.337-2.738.524-2.633 2.082.256 2.976-2.52 3.252-5.771.205-3.441-.692-5.169-2.134-5.591-1.698-.496-4.504.609-5.001 3.845-.924 5.235-1.772 28.967-7.13 30.188-5.227 1.19-4.933-7.843-4.933-7.843l-15.357-6.331c1.837-7.642 2.474-22.03 3.251-25.872 1.068-5.278 4.853-8.479 8.477-7.13 3.653 1.36 19.34 7.237 22.935 8.575 3.621 1.348 4.827 6.317 3.741 11.477M34.599 23.88l-4.478-1.77-.287 4.695 4.478 1.77zm-1.964 15.038.288-4.696-11.195-4.425-.287 4.695zm-17.922-7.085 4.478 1.77.287-4.696L15 27.137zm1.878-15.279-.287 4.695 11.194 4.426.287-4.696zm1.932-9.76-.288 4.696 6.717 2.655.287-4.695zm8.955 3.541-.287 4.695 8.955 3.541.288-4.696zm-.334 40.654C18.405 47.61 2.862 40.758 2.862 40.758S-.651 38.856.199 33.059l23.57 9.806s-.565 6.063 3.375 8.124"/></symbol>
        <symbol id="gc-svgFestival" viewBox="0 0 50 50"><path d="m49.331 37.41-1.908.84-.837 1.914a.914.914 0 0 1-1.675 0l-.837-1.914-1.908-.84c-.729-.321-.729-1.359 0-1.68l1.908-.84.837-1.914a.913.913 0 0 1 1.675 0l.837 1.914 1.908.84c.73.321.73 1.359 0 1.68M46.02 22.38a2.405 2.405 0 1 1-2.406 4.165 2.405 2.405 0 0 1 2.406-4.165m2.668-11.786-4.323-.473-3.509 2.584a.825.825 0 0 1-1.31-.756l.483-4.331-2.571-3.508c-.425-.58.044-1.393.759-1.314l4.323.472L46.049.684a.826.826 0 0 1 1.311.757l-.484 4.331 2.571 3.507a.83.83 0 0 1-.759 1.315m-8.781 8.013c-1.891 2.04-4.234 8.067-5.724 15.812-.426 2.394-3.239 1.594-3.374.141-.668-6.226-.185-17.155 5.116-20.149 1.917-.806 4.883 2.995 3.982 4.196m-15.176 30.27c-1.111-.647-6.234-8.514-14.813-9.643-1.881-.068-1.318-2.712-.039-3.973 1.977-1.4 5.988-1.444 12.542 4.507-1.073-4.334-2.109-10.533-7.642-14.568-1.759-1.561-2.356-5.514 2.235-4.538 6.914 1.47 8.515 13.059 9.026 27.117-.167.795-.744 1.456-1.309 1.098M19.864 9.249a2.56 2.56 0 1 1 2.56-4.436 2.56 2.56 0 0 1-2.56 4.436m-5.53 6.201-4.075 1.794-1.788 4.087c-.374.855-1.583.855-1.957 0l-1.788-4.087L.651 15.45c-.852-.375-.852-1.588 0-1.963l4.075-1.794 1.788-4.087c.374-.855 1.583-.855 1.957 0l1.788 4.087 4.075 1.794c.852.375.852 1.588 0 1.963m-9.96 19.076a2.495 2.495 0 1 1-2.495 4.321 2.495 2.495 0 0 1 2.495-4.321m34.333 3.69c2.428.469 4.172 3.338 2.249 4.72-2.7 1.207-5.907.768-8.234 4.317-.855 1.109-2.443.543-1.884-1.486 2.289-7.539 6.5-7.657 7.869-7.551"/></symbol>`;

    const gcStyles = `
.gc-root {
    --gc-frame: #121212; --gc-icons: #e0e0e0; --gc-header-text: #e0e0e0;
    --gc-main: #2e2e2e; --gc-main-accent: #212121; --gc-main-text: #e0e0e0; --gc-border: #000000;
    --gc-button: #e0e0e0; --gc-button-text: #212121;
    --gc-deleteColor: #b80000; --gc-deleteColor-accent: #e0e0e0; --gc-highlightColor: #d99b45;
    --gc-contentDivider: #121212; --gc-overviewHeader: #dedede; --gc-overviewHeader-accent: #121212;
    --gc-venueHeader: #ffffff; --gc-venueHeader-accent: #292929; --gc-entryIcons: #c2c2c2;
    --gc-FontFamily: Verdana, Geneva, sans-serif; --gc-fontSize: 12px; --gc-colWidth: auto;
    font-size: var(--gc-fontSize); font-family: var(--gc-FontFamily);
    line-height: 1.25em; color: var(--gc-main-text); overflow: visible;
}
.gc-root.gc-singleCol .gc-listSection { column-width: 100% !important; column-count: 1; }
button {
    font-size: inherit; display: flex; justify-content: center; cursor: pointer; align-items: center;
    border-style: none; padding-inline: 0px; padding-block: 0px; padding: 0.83em; border-radius: 5px;
    line-height: 1em; font-family: inherit; font-weight: bold;
    background-color: var(--gc-button); color: var(--gc-button-text);
    &:has(svg) { background-color: transparent; padding: 0; }
}
label { float: none; width: unset;}
div { cursor: default; }
.gc-buttonSmall { padding: 0.42em 0.83em 0.42em 0.83em; flex: 0 0 auto; align-self: stretch; }
.gc-editCancel { background-color: var(--gc-main-accent); color: var(--gc-main-text); margin-left: auto; }
svg { width: calc(var(--gc-fontSize) * 1.25); height: calc(var(--gc-fontSize) * 1.25); fill: var(--gc-icons); }
.gc-delete {
    background-color: var(--gc-deleteColor); color: var(--gc-deleteColor-accent); fill: var(--gc-deleteColor);
    &:has(svg) { background-color: transparent; padding: 0; margin-left: auto; & svg { fill: var(--gc-deleteColor); } }
}
select, input[type="number"] {
    font-size: inherit; cursor: pointer; flex: 1 1 0; border: 1px solid var(--gc-border); border-radius: 4px;
    padding: 0.41em; background-color: var(--gc-main-accent); font-family: inherit; line-height: 1em; color: inherit;
}
input[type="number"] { cursor: text; }
input[type="color"] {
    cursor: pointer; inline-size: var(--gc-fontSize); block-size: var(--gc-fontSize); border: none;
    border-radius: 2px; padding: 0px;
    &::-webkit-color-swatch-wrapper { padding: 0px; }
    &::-webkit-color-swatch { border: none; }
}
input[type="text"] {
    font-size: inherit; cursor: text; flex: 1 1 0; background-color: var(--gc-main-accent);
    align-items: center; border-style: none; font-family: inherit; line-height: 1em; border-radius: 4px;
    width: 0; padding: 0.42em 0.83em 0.42em 0.83em; color: inherit;
    &::placeholder { color: inherit; opacity: 0.5; }
}
input[type="checkbox"] {
    appearance: none; width: 1em; height: 1em; border: 1px solid var(--gc-border); border-radius: 2px;
    background-color: var(--gc-main-accent); cursor: pointer; flex: 0 0 auto;
    &:checked { background-color: var(--gc-button); border-color: var(--gc-button); }
    &:checked::after { content: "✓"; display: block; color: var(--gc-button-text); font-size: 0.75em; text-align: center; line-height: 1.3em; }
}
.gc-panel {
    background-color: var(--gc-main); position: fixed; top: 10px; right: 10px;
    min-width: min-content; min-height: min-content; width: 30em; height: 40em;
    resize: both; overflow: hidden; border: 2px solid var(--gc-frame); border-radius: 5px;
    display: flex; flex-direction: column; z-index: 3;
}
.gc-header {
    background-color: var(--gc-frame); padding: 1em; display: flex; align-items: center;
    gap: 1em; line-height: 1.5em; color: var(--gc-header-text);
    & > button:first-child { align-self: stretch; margin: -1em -0.83em -1em -1em; padding: 1em 0.83em 1em 1em; }
    & > button > svg { width: calc(var(--gc-fontSize) + 0.5em); height: calc(var(--gc-fontSize) + 0.5em); }
}
.gc-headerText { font-size: 1.5em; white-space: nowrap; }
.gc-tabs {
    display: flex; background-color: var(--gc-main-accent);
    & button {
        background-color: var(--gc-main-accent); color: var(--gc-main-text); flex: 1 1 auto; padding: 1em;
        border-top: 2px solid transparent; border-bottom: 2px solid transparent; border-radius: 0px;
        &.gc-active { background-color: var(--gc-main); border-bottom: 2px solid var(--gc-main-text); }
    }
}
.gc-searchbar {
    flex: 1 1 0; display: flex; border: 1px solid var(--gc-border); border-radius: 4em;
    color: var(--gc-main-text); background-color: var(--gc-main-accent); padding: 0.42em 0.83em 0.42em 0.83em;
    & input { background-color: inherit; padding: 0; padding-left: 2px; border-radius: 0px; min-width: 5em; }
    & > button > svg { fill: var(--gc-main-text); }
}
.gc-mainContent {
    flex: 1 1 0; display: flex; flex-direction: column; gap: 0.83em; padding: 0.83em;
    border-top: 1px solid var(--gc-border); overflow: auto;
}
.gc-footer {
    display: grid; align-items: center; justify-content: right; grid-template-columns: 1fr 1fr auto;
    background-color: var(--gc-frame); padding: 0.83em; gap: 0.83em; border-top: 1px solid var(--gc-border);
}
.gc-divider-v { background-color: var(--gc-icons); width: 1px; align-self: stretch; min-height: 2em; padding: 0px; }
.gc-divider-h { height: 1px; background-color: var(--gc-contentDivider); grid-column: 1 / -1; flex: 0 0 auto; }
.gc-scrollBox {
    flex: 1 1 auto; display: flex; flex-flow: column; background-color: var(--gc-main-accent);
    padding: 0.83em; border-radius: 4px; border: 1px solid var(--gc-border); overflow: auto; min-width: 0; min-height: 0;
}
.gc-scrollBox--resize { flex: 0 0 auto; resize: vertical; min-height: 3em; }
.gc-flex-row, .gc-flex-row-sb { display: flex; gap: 0.83em; justify-content: flex-start; align-items: center; }
.gc-flex-row-sb {
    justify-content: space-between; padding: 0em 0.41em 0em 0.41em;
    div:last-child { margin-left: auto; }
}
.gc-listHeader {
    gap: 0em; color: var(--gc-overviewHeader-accent); background-color: var(--gc-overviewHeader);
    width: 100%; margin-bottom: 0.42em;
    svg { fill: var(--gc-overviewHeader-accent); }
    svg:last-child { padding-right: 0.2em; padding-left: 0.42em; }
    div { flex: 1 1 auto; padding-left: 0.41em; text-align: left; line-height: 2em; }
}
.gc-listSection {
    column-width: var(--gc-colWidth); column-count: auto; column-gap: 0.41em;
    column-rule: 1px solid var(--gc-contentDivider); padding-bottom: 0.42em;
}
.gc-listEntry {
    border: none; background-color: var(--gc-main-accent); display: flex; padding: 2px 0.41em 1px 0.41em;
    border-bottom: 1px solid var(--gc-contentDivider); break-inside: avoid; align-items: center;
    svg { fill: var(--gc-entryIcons); flex: 0 0 auto; padding-right: 0.41em; }
    div { flex: 1 1 auto; break-inside: avoid; }
    div:last-of-type:not(:only-of-type) { margin-left: auto; flex: 0 0 auto; padding-left: 0.83em; }
    button:last-child { margin-left: auto; flex: 0 0 auto; padding-left: 0.83em; }
}
.gc-flex-col {
    flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 0.83em;
    padding: 0.83em; overflow: auto; align-content: center; align-items: center;
}
.gc-hidden { display: none; }
.gc-arrow { transform: scaleY(-1); transition: transform 0.6s ease; }
.gc-arrow.gc-collapsed { transform: scaleY(1); }
.gc-root.gc-hideEntryIcons .gc-listEntry svg { display: none; }
.gc-root.gc-hideHeaderIcons .gc-listHeader svg:not(:last-child) { display: none; }
.gc-listHeader--venue {
    font-weight: bold; background-color: var(--gc-venueHeader); color: var(--gc-venueHeader-accent);
    svg { fill: var(--gc-venueHeader-accent); }
}
.gc-Notification {
    position: fixed; background-color: var(--gc-button); color: var(--gc-button-text);
    border: 1px solid var(--gc-border); border-radius: 5px; padding: 0.5em 1em;
    font-size: var(--gc-fontSize); font-family: var(--gc-FontFamily); pointer-events: none;
    opacity: 0; transition: opacity 0.3s ease; z-index: 10; max-width: 16em;
}
.gc-Notification.gc-visible { opacity: 1; }
.gc-complete { opacity: 0.6; }
.gc-span { grid-column: 1 / -1; }
.gc-input-narrow { flex: 0 0 auto !important; width: 5em; }
    `;

    function injectGCStyles() {
        if (document.getElementById("gc-styles")) return;
        const style = document.createElement("style");
        style.id = "gc-styles";
        style.textContent = gcStyles;
        document.head.appendChild(style);
    }

    function updateUI(drops = null) {
        const venueData = getVenueData(currentVenue);
        gcWinsDisplay.textContent = `Wins: ${venueData.battleCount}`;
        gcVenueText.textContent = venueDisplayMap[currentVenue] ?? currentVenue;
        if (!gcContentBBCode.classList.contains("gc-hidden")) {
            gcBBCodeScrollBox.textContent = formatBBCode();
        }
        if (!gcContentOverview.classList.contains("gc-hidden")) {
            if (drops) patchOverview(drops);
            else buildOverview();
        }
        if (!gcContentQuests.classList.contains("gc-hidden")) {
            renderActiveQuests();
            renderCompletedQuests();
        }
    }

    // Called when switching to a tab that may have stale content
    function refreshTabContent(tabkey) {
        if (tabkey === "BBCode") gcBBCodeScrollBox.textContent = formatBBCode();
        else if (tabkey === "Overview") buildOverview();
        else if (tabkey === "Quests") { renderActiveQuests(); renderCompletedQuests(); }
    }

    function makeDraggable(handleEl, panelEl, elPositionTop, elPositionRight) {
        let startX, startY, startRight, startTop;
        handleEl.addEventListener("mousedown", (e) => {
            e.preventDefault(); e.stopPropagation();
            const rect = panelEl.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            startRight = document.documentElement.clientWidth - rect.right; startTop = rect.top;
            document.addEventListener("mousemove", onDrag);
            document.addEventListener("mouseup", onRelease, { once: true });
            window.addEventListener("mouseleave", onRelease, { once: true });
        });
        function onDrag(e) {
            const dx = startX - e.clientX, dy = e.clientY - startY;
            const rect = panelEl.getBoundingClientRect();
            panelEl.style.top = `${Math.max(0, Math.min(startTop + dy, document.documentElement.clientWidth - rect.height))}px`;
            panelEl.style.right = `${Math.max(0, Math.min(startRight + dx, document.documentElement.clientWidth - rect.width))}px`;
        }
        function onRelease() {
            const rect = panelEl.getBoundingClientRect();
            localStorage.setItem(elPositionTop, rect.top);
            localStorage.setItem(elPositionRight, (document.documentElement.clientWidth - rect.right));
            document.removeEventListener("mousemove", onDrag);
            window.removeEventListener("mouseleave", onRelease);
        }
    }

    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }

    ready(() => {

        // Poll for first battle venue and enemy detection
        // Only needed if a battle hasn't started yet via WS
        const enemyPoll = setInterval(() => {
            if (window._game?.enemies?.length > 0) {
                clearInterval(enemyPoll);
                currentVenue = window._game.room.stage.venueId ?? currentVenue;
                localStorage.setItem("fr_coli_currentVenue", currentVenue);
                currentEnemies = window._game.enemies.map(e => ({
                    name: e.name.trim(),
                    element: e.element
                }));
                updateUI();
            }
        }, 200);
        // timeout if the enemyPoll for some reason doesn't get populated when a battle starts to ensure it doesn't keep running 
        setTimeout(() => clearInterval(enemyPoll), 30000);

        injectGCStyles(); buildUI(); updateUI(); applyColumnMode();
    });


    // --- UI ELEMENT REFERENCES ---

    let gcRoot, gcMainToggle, gcMainPanel, gcVenueText, gcWinsDisplay;
    let gcTabBBCode, gcTabOverview, gcTabQuests;
    let gcContentBBCode, gcContentOverview, gcContentQuests;
    let gcBBCodeLayoutSelect, gcBBCodeScrollBox;
    let gcOverviewSearch, gcOverviewScrollBox;
    let gcFooterCategorySelect, gcFooterSortSelect, tabMap, gcQuestNotif;
    let gcActiveQuestsBox, gcCompletedQuestsBox;
    let questEditMode = false, completedEditMode = false;
    let gcSettingsPanel, gcSettingsTabVisual, gcSettingsTabHighlights;
    let gcSettingsContentVisual, gcSettingsContentHighlights;
    let colorInputMap = {}, themeDetailEl, highlightDetailEl, themePresetManager, highlightPresetManager;

    // --- MORE HELPERS ---

    function createIcon(name, extraStyle = "") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        if (extraStyle) svg.setAttribute("style", extraStyle);
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `#gc-svg${name}`);
        svg.appendChild(use);
        return svg;
    }

    // Creates a button containing a single icon. cls/btnStyle/iconStyle are all optional.
    function iconBtn(name, cls = "", btnStyle = "", iconStyle = "") {
        const btn = el("button", { ...(cls && { class: cls }), ...(btnStyle && { style: btnStyle }) });
        btn.appendChild(createIcon(name, iconStyle));
        return btn;
    }

    function el(tag, attrs = {}) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === "class") node.className = v;
            else if (k === "text") node.textContent = v;
            else node.setAttribute(k, v);
        }
        return node;
    }

    // Creates a labelled <select> inside parent, populates options, wires change listener.
    function makeSettingSelect(parent, labelText, options, value, applyFn, tooltip = "") {
        const labelAttrs = { text: labelText };
        if (tooltip) labelAttrs.title = tooltip;
        parent.appendChild(el("label", labelAttrs));
        const select = parent.appendChild(el("select"));
        options.forEach(([v, t]) => select.appendChild(el("option", { value: v, text: t })));
        select.value = value;
        select.addEventListener("change", () => applyFn(select.value));
        return select;
    }

    // Creates the venue select used in BBCode and Overview tabs.
    function makeVenueFilterSelect(value, onChange) {
        const select = el("select");
        select.appendChild(el("option", { value: "All", text: "All Venues" }));
        select.appendChild(el("option", { value: "current", text: `Current Venue` }));
        Object.entries(venueDisplayMap).forEach(([key, name]) =>
            select.appendChild(el("option", { value: key, text: name })));
        select.value = value;
        select.addEventListener("change", () => onChange(select.value));
        return select;
    }

    function switchTab(tabkey) {
        for (const group of Object.values(tabMap)) {
            if (group[tabkey]) {
                for (const [key, [content, tab]] of Object.entries(group)) {
                    if (key.startsWith("_")) continue;
                    content.classList.add("gc-hidden");
                    tab.classList.remove("gc-active");
                    if (key === tabkey) {
                        content.classList.remove("gc-hidden");
                        tab.classList.add("gc-active");
                        localStorage.setItem(group._storageKey, tabkey);
                        if (group._storageKey === "fr_coli_activeTab") refreshTabContent(tabkey);
                    }
                }
            }
        }
    }

    function applyTheme(name, preset = savedThemes[name]) {
        if (!preset) return;
        Object.entries(preset).forEach(([cssVar, value]) => {
            gcRoot.style.setProperty(cssVar, value);
            if (colorInputMap[cssVar]) {
                colorInputMap[cssVar].value = value;
                const row = colorInputMap[cssVar].closest(".gc-listEntry");
                if (row) {
                    row.querySelector(".gc-themeDisplayGroup div").style.backgroundColor = value;
                    row.querySelector(".gc-themeDisplayGroup div:last-child").textContent = value;
                }
            }
        });
        activeThemeName = name;
        localStorage.setItem("fr_coli_activeTheme", name);
    }

    function initThemes() {
        if (Object.keys(savedThemes).length === 0) {
            Object.assign(savedThemes, defaultThemes);
            localStorage.setItem("fr_coli_themes", JSON.stringify(savedThemes));
        }
    }

    function initHighlightPresets() {
        if (Object.keys(savedHighlightPresets).length === 0) {
            Object.assign(savedHighlightPresets, defaultHighlightPresets);
            localStorage.setItem("fr_coli_highlightPresets", JSON.stringify(savedHighlightPresets));
        }
        const active = savedHighlightPresets[activeHighlightPresetName] ?? defaultHighlightPreset;
        workingHighlightPreset = [...active].map(String);
        highlightSet.clear();
        workingHighlightPreset.forEach(id => highlightSet.add(id));
    }

    function getThemeCurrent() {
        const theme = {};
        colorVars.forEach(([, cssVar]) => { theme[cssVar] = colorInputMap[cssVar].value; });
        return theme;
    }

    function themeHasUnsavedChanges() {
        const current = savedThemes[activeThemeName];
        return colorVars.some(([, cssVar]) => colorInputMap[cssVar].value !== current?.[cssVar]);
    }

    function dividerV() { return el("div", { class: "gc-divider-v" }); }
    function dividerH() { return el("div", { class: "gc-divider-h" }); }

    function flashInvalid(...els) {
        els.forEach(e => {
            e.style.outline = "2px solid var(--gc-deleteColor)";
            setTimeout(() => { e.style.outline = ""; }, 800);
        });
    }

    function fitColumns(sectionEl) {
        if (columnMode === "single") return;
        const entries = [...sectionEl.querySelectorAll(".gc-listEntry")];
        entries.forEach(e => { e.style.width = "max-content" });
        const maxWidth = entries.reduce((m, e) => Math.max(m, e.offsetWidth), 0);
        entries.forEach(e => { e.style.width = "" });
        if (maxWidth > 0) sectionEl.style.setProperty("--gc-colWidth", `${maxWidth}px`);
    }

    function fitColumnsInContainer(containerEl) {
        if (columnMode === "single") return;
        containerEl.querySelectorAll(".gc-listSection").forEach(s => s.style.removeProperty("--gc-colWidth"));
        const entries = [...containerEl.querySelectorAll(".gc-listEntry")];
        entries.forEach(e => { e.style.width = "max-content" });
        const maxWidth = entries.reduce((m, e) => Math.max(m, e.offsetWidth), 0);
        entries.forEach(e => { e.style.width = "" });
        if (maxWidth > 0) containerEl.style.setProperty("--gc-colWidth", `${maxWidth}px`);
    }

    function applyColumnMode() {
        gcRoot.classList.toggle("gc-singleCol", columnMode === "single");
        if (columnMode === "auto") {
            if (gcOverviewScrollBox) fitColumnsInContainer(gcOverviewScrollBox);
            if (gcBBCodeScrollBox) fitColumnsInContainer(gcBBCodeScrollBox);
        }
    }

    const panelResizeObserver = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        localStorage.setItem("fr_coli_panelWidth", Math.round(width));
        localStorage.setItem("fr_coli_panelHeight", Math.round(height));
    });

    function applyIconMode() {
        gcRoot.classList.toggle("gc-hideEntryIcons", iconMode === "headers");
        gcRoot.classList.toggle("gc-hideHeaderIcons", iconMode === "entries");
    }

    function applyToggleStyle() {
        const handle = gcMainToggle.querySelector("div");
        gcMainToggle.innerHTML = "";
        if (toggleStyle === "text") gcMainToggle.appendChild(document.createTextNode("Coliseum Tracker"));
        else if (toggleStyle === "icon-small") gcMainToggle.appendChild(createIcon("SmallIcon", "width: 2em; height: 2em;"));
        else if (toggleStyle === "icon-large") gcMainToggle.appendChild(createIcon("BigIcon", "width: 4em; height: 4em;"));
        if (handle) gcMainToggle.appendChild(handle);
    }

    let lastPanelRect = null;

    function positionToggleFromPanel(panelRect) {
        lastPanelRect = panelRect;
        const isBottom = toggleCorner.startsWith("bottom");
        const isLeft = toggleCorner.endsWith("left");
        gcMainToggle.classList.remove("gc-hidden");
        const tw = gcMainToggle.offsetWidth, th = gcMainToggle.offsetHeight;
        gcMainToggle.classList.add("gc-hidden");
        const top = isBottom ? panelRect.bottom - th : panelRect.top;
        const right = isLeft ? document.documentElement.clientWidth - panelRect.left - tw : document.documentElement.clientWidth - panelRect.right;
        gcMainToggle.style.top = `${top}px`;
        gcMainToggle.style.right = `${right}px`;
        localStorage.setItem("fr_coli_toggleTop", top);
        localStorage.setItem("fr_coli_toggleRight", right);
    }

    function positionPanelFromToggle(toggleRect) {
        const isBottom = toggleCorner.startsWith("bottom");
        const isLeft = toggleCorner.endsWith("left");
        const panelWidth = lastPanelRect?.width ?? gcMainPanel.offsetWidth;
        const panelHeight = lastPanelRect?.height ?? gcMainPanel.offsetHeight;
        gcMainPanel.style.top = isBottom ? `${toggleRect.bottom - panelHeight}px` : `${toggleRect.top}px`;
        gcMainPanel.style.right = isLeft
            ? `${document.documentElement.clientWidth - toggleRect.left - panelWidth}px`
            : `${document.documentElement.clientWidth - toggleRect.right}px`;
    }

    function buildListHeader(iconName, title, targetEl = null, variant = "", key = null, rightText = "") {
        const header = el("button", { class: `gc-flex-row-sb gc-listHeader${variant ? ` gc-listHeader--${variant}` : ""}` });
        if (iconName) header.appendChild(createIcon(iconName));
        header.appendChild(el("div", { text: title }));
        if (rightText) header.appendChild(el("div", { text: rightText, style: "flex: 0 1 auto; font-weight: normal;" }));
        const arrow = createIcon("CollapseExpand");
        arrow.classList.add("gc-arrow");
        if (targetEl) {
            const collapsed = key ? (collapseStates[key] ?? false) : false;
            if (collapsed) { targetEl.classList.add("gc-hidden"); arrow.classList.add("gc-collapsed"); }
            header.addEventListener("click", () => {
                const collapsed = targetEl.classList.toggle("gc-hidden");
                arrow.classList.toggle("gc-collapsed", collapsed);
                if (!collapsed) {
                    targetEl.querySelectorAll(".gc-listSection").forEach(fitColumns);
                    fitColumnsInContainer(targetEl);
                }
                if (key) { collapseStates[key] = collapsed; saveCollapseStates(); }
            });
        }
        header.appendChild(arrow);
        return header;
    }

    function patchOverview(drops) {
        const resolvedVenue = overviewVenue === "current" ? currentVenue : overviewVenue;

        if (resolvedVenue !== "All" && resolvedVenue !== currentVenue) return;
        if (resolvedVenue === "All") { buildOverview(); return; }
        if (sortMode.includes("amount")) { buildOverview(); return; }

        for (const [id] of drops) {
            const idStr = String(id);
            const amountEl = overviewAmountEls.get(idStr);
            if (!amountEl) {
                // New item — check if it should be visible in current filter
                const item = itemIndex[idStr];
                const category = item?.category ?? "Other";
                const isHighlight = highlightSet.has(idStr);
                const isFestival = festivalSet.has(idStr);
                const shouldShow = activeCategory === "All" ||
                    (activeCategory === "Highlights" && isHighlight && highlightMode !== "off") ||
                    (activeCategory === "Festival" && isFestival && festivalMode !== "off") ||
                    activeCategory === category;
                if (shouldShow) { buildOverview(); return; }
                continue; // filtered out anyway, skip
            }
            const totalAmount = getVenueData(resolvedVenue).loot[id] ?? 0;
            amountEl.textContent = `x${totalAmount}`;
        }

        // Update wins display in place
        if (overviewWinsEl && (activeCategory === "All" || activeCategory === "Wins")) {
            overviewWinsEl.textContent = `Wins: ${getVenueData(resolvedVenue).battleCount}`;
        }
    }

    function buildOverview() {
        overviewAmountEls.clear();
        overviewWinsEl = null;
        gcOverviewScrollBox.innerHTML = "";
        const query = gcOverviewSearch?.value.trim().toLowerCase() ?? "";
        const resolvedVenue = overviewVenue === "current" ? currentVenue : overviewVenue;
        const isAllVenues = resolvedVenue === "All";
        const isGrouped = venueGroupMode === "grouped";

        function buildWinsEntry(count) {
            const entry = el("div", { class: "gc-listEntry", style: "margin-bottom: 0.42em; margin-top: -0.42em; border: none;" });
            const winsDiv = entry.appendChild(el("div", { text: `Wins: ${count}`, style: "text-align: center" }));
            overviewWinsEl = winsDiv;
            return entry;
        }

        function matchesSearch(e) { return !query || e.name.toLowerCase().includes(query) || e.id.includes(query); }

        function renderGroup(highlights, festivals, groups, venueLabel = null, battleCount = null) {
            const venueContent = el("div");
            const isCategorySort = sortMode.startsWith("category-");
            const keyPrefix = venueLabel ?? "single";
            const filteredHighlights = highlights.filter(matchesSearch);
            if (isCategorySort && filteredHighlights.length > 0 && ((activeCategory === "All" && highlightMode !== "off") || activeCategory === "Highlights")) {
                const section = el("div", { class: "gc-listSection" });
                filteredHighlights.forEach(e => {
                    const entryEl = buildListEntry(e.category, e.name, e.amount, null, e.isHighlight);
                    overviewAmountEls.set(e.id, entryEl._amountEl);
                    section.appendChild(entryEl);
                });
                if (showHeader()) venueContent.appendChild(buildListHeader("Highlights", "Highlights", section, "", `overview_${keyPrefix}_Highlights`));
                venueContent.appendChild(section);
            }
            const filteredFestivals = festivals.filter(matchesSearch);
            if (isCategorySort && filteredFestivals.length > 0 && ((activeCategory === "All" && festivalMode !== "off") || activeCategory === "Festival")) {
                const section = el("div", { class: "gc-listSection" });
                filteredFestivals.forEach(e => {
                    const entryEl = buildListEntry("Festival", e.name, e.amount, null, e.isHighlight);
                    overviewAmountEls.set(e.id, entryEl._amountEl);
                    section.appendChild(entryEl);
                });
                if (showHeader()) venueContent.appendChild(buildListHeader("Festival", "Festival", section, "", `overview_${keyPrefix}_Festival`));
                venueContent.appendChild(section);
            }
            for (const group of groups) {
                const filtered = group.entries.filter(matchesSearch);
                if (filtered.length === 0) continue;
                const section = el("div", { class: "gc-listSection" });
                filtered.forEach(e => {
                    const entryEl = buildListEntry(e.category, e.name, e.amount, null, e.isHighlight);
                    overviewAmountEls.set(e.id, entryEl._amountEl);
                    section.appendChild(entryEl);
                });
                if (group.key && showHeader()) venueContent.appendChild(buildListHeader(group.key, group.key, section, "", `overview_${keyPrefix}_${group.key}`));
                venueContent.appendChild(section);
            }

            if (venueLabel && showHeader()) {
                gcOverviewScrollBox.appendChild(buildListHeader(null, venueLabel, venueContent, "venue", `overview_venue_${venueLabel}`, battleCount !== null ? `Wins: ${battleCount}` : ""));
            }

            gcOverviewScrollBox.appendChild(venueContent);
        }

        if (isAllVenues && isGrouped) {
            const venueGroups = buildVenueGroupedModel(sortMode, activeCategory, highlightMode, festivalMode);
            for (const vg of venueGroups) renderGroup(vg.highlights, vg.festivals, vg.groups, vg.venue, vg.battleCount);
        } else {
            const { highlights, festivals, groups } = buildLootModel(resolvedVenue, sortMode, activeCategory, highlightMode, festivalMode);
            const battleCount = resolvedVenue === "All"
                ? Object.keys(venueDisplayMap).reduce((sum, k) => sum + getVenueData(k).battleCount, 0)
                : getVenueData(resolvedVenue).battleCount;
            if (activeCategory === "All" || activeCategory === "Wins") {
                gcOverviewScrollBox.appendChild(buildWinsEntry(battleCount));
            }
            renderGroup(highlights, festivals, groups);
        }
        gcOverviewScrollBox.querySelectorAll(".gc-listSection").forEach(fitColumns);
        fitColumnsInContainer(gcOverviewScrollBox);
    }

    // --- QUEST DATA & LOGIC ---
    function saveActiveQuests() { localStorage.setItem("fr_coli_activeQuests", JSON.stringify(activeQuests)); }
    function saveCompletedQuests() { localStorage.setItem("fr_coli_completedQuests", JSON.stringify(completedQuests)); }

    function createQuest(name, goals) {
        return { id: `quest_${Date.now()}`, name: name || null, goals, completed: false, createdAt: Date.now(), completedAt: null };
    }

    function questTotalProgress(quest) {
        const total = quest.goals.reduce((s, g) => s + g.target, 0);
        const done = quest.goals.reduce((s, g) => s + Math.min(g.progress, g.target), 0);
        return { total, done };
    }

    function isQuestComplete(quest) { return quest.goals.every(g => g.progress >= g.target); }

    function goalLabel(goal) {
        if (goal.type === "item") return `${goal.itemName}`;
        if (goal.type === "category") return `Any ${goal.category} drops`;
        if (goal.type === "battles") return goal.venue === "All" ? "Battles in any venue" : `Battles in ${venueDisplayMap[goal.venue] ?? goal.venue}`;
        if (goal.type === "enemy") return `Encounter ${goal.enemyName}`;
        return "?";
    }

    function positionQuestNotification() {
        if (panelHidden) {
            gcMainToggle.appendChild(gcQuestNotif);
            const rect = gcMainToggle.getBoundingClientRect();
            const goLeft = rect.right > document.documentElement.clientWidth / 2;
            const goUp = rect.bottom > window.innerHeight / 2;
            if (goUp) gcQuestNotif.style.marginTop = "-5em"; else gcQuestNotif.style.marginBottom = "-5em";
            if (goLeft) gcQuestNotif.style.marginLeft = "-5em"; else gcQuestNotif.style.marginRight = "-5em";
        } else {
            gcTabQuests.appendChild(gcQuestNotif);
            gcQuestNotif.style.marginTop = "-5em";
        }
    }

    function showQuestCompletionNotification(quest) {
        if (!questNotifEnabled) return;
        const name = quest.name ?? goalLabel(quest.goals[0]);
        gcQuestNotif.textContent = `✓ Quest complete: ${name}`;
        positionQuestNotification();
        gcQuestNotif.classList.add("gc-visible");
        setTimeout(() => gcQuestNotif.classList.remove("gc-visible"), 2500);
    }

    function updateQuestProgress(drops) {
        if (!activeQuests.length) return;
        let anyChanged = false;
        const nowComplete = [];

        activeQuests.forEach(quest => {
            if (quest.completed) return;
            let changed = false;
            // Valid encounter battle count (runs once per win, not per drop)
            quest.goals.forEach(goal => {
                // Battle count goal
                if (goal.type === "battles" && (goal.venue === "All" || goal.venue === currentVenue)) {
                    goal.progress++; changed = true;
                }
                // Enemy encounter goal
                if (goal.type === "enemy") {
                    const encountered = currentEnemies.some(e => e.name === goal.enemyName);
                    if (encountered) { goal.progress++; changed = true; }
                }
            });
            if (questBattleCountEnabled) {
                quest.goals.forEach(goal => {
                    if (goal.progress >= goal.target) return;
                    if (goal.type === "item") {
                        const item = itemIndex[String(goal.itemId)];
                        if (item) {
                            if (questBattleCountMode === "enemies") {
                                const count = countValidEnemies(item);
                                if (count > 0) { goal.encounterCount = (goal.encounterCount || 0) + count; changed = true; }
                            } else {
                                if (isValidEncounter(item)) { goal.battleCount = (goal.battleCount || 0) + 1; changed = true; }
                            }
                        }
                    } else if (goal.type === "category") {
                        if (questBattleCountMode === "enemies") {
                            const count = countValidEnemiesForCategory(goal.category);
                            if (count > 0) { goal.encounterCount = (goal.encounterCount || 0) + count; changed = true; }
                        } else {
                            if ((itemsByCategory[goal.category] ?? []).some(item => isValidEncounter(item))) {
                                goal.battleCount = (goal.battleCount || 0) + 1; changed = true;
                            }
                        }
                    }
                });
            }
            drops.forEach(([id, , amount]) => {
                const item = itemIndex[String(id)];
                const itemCategory = item?.category ?? "Other";
                const itemIsHighlight = highlightSet.has(String(id));
                const itemIsFestival = festivalSet.has(String(id));
                quest.goals.forEach(goal => {
                    if (goal.type === "item" && String(goal.itemId) === String(id)) {
                        goal.progress += amount; changed = true;
                    }
                    if (goal.type === "category") {
                        const matches = goal.category === itemCategory ||
                            (goal.category === "Highlights" && itemIsHighlight) ||
                            (goal.category === "Festival" && itemIsFestival);
                        if (matches) { goal.progress += amount; changed = true; }
                    }
                });
            });
            if (changed) { anyChanged = true; if (isQuestComplete(quest)) nowComplete.push(quest); }
        });

        if (nowComplete.length) {
            nowComplete.forEach(quest => {
                quest.completed = true; quest.completedAt = Date.now();
                activeQuests = activeQuests.filter(q => q.id !== quest.id);
                completedQuests.unshift(quest);
                showQuestCompletionNotification(quest);
            });
            saveCompletedQuests();
        }
        if (anyChanged) saveActiveQuests();
    }
    // --- QUEST UI ---
    function buildQuestItem(quest, editMode, isCompleted) {
        const { total, done } = questTotalProgress(quest);
        const progressStr = `${done}/${total}`;
        const isFlat = quest.goals.length === 1 && !quest.name;
        const isComplete = isCompleted || isQuestComplete(quest);
        const battleLabel = questBattleCountMode === "enemies" ? "encounters" : "battles";

        // Shared delete button factory — captures quest/isCompleted from outer scope
        function makeDelBtn() {
            const del = iconBtn("SmallX", "gc-delete");
            del.addEventListener("click", () => {
                activeQuests = activeQuests.filter(q => q.id !== quest.id);
                completedQuests = completedQuests.filter(q => q.id !== quest.id);
                saveActiveQuests();
                saveCompletedQuests();
                renderActiveQuests(); renderCompletedQuests();
            });
            return del;
        }

        if (isFlat) {
            const row = el("div", { class: `gc-flex-row-sb gc-listHeader${isComplete ? " gc-complete" : ""}`, style: "width: unset; border-radius: 5px; font-weight: bold;" });
            if (editMode && !isCompleted) {
                const nameInput = el("input", { type: "text", value: quest.name ?? "", placeholder: "Add name...", style: "background-color: var(--gc-overviewHeader); color: var(--gc-overviewHeader-accent)" });
                nameInput.addEventListener("change", () => { quest.name = nameInput.value.trim() || null; saveActiveQuests(); renderActiveQuests(); });
                row.appendChild(nameInput);
            } else {
                row.appendChild(el("div", { text: goalLabel(quest.goals[0]), style: "flex: 1 1 auto;" }));
            }
            const goal0 = quest.goals[0];

            const count = questBattleCountMode === "enemies" ? goal0.encounterCount : goal0.battleCount;
            const battleStr0 = questBattleCountEnabled && count && (goal0.type === "item" || goal0.type === "category") ? ` (${count} ${battleLabel})` : "";
            row.appendChild(el("div", { text: progressStr + battleStr0, style: "flex: 0 1 auto; font-weight: normal;" }));
            if (editMode) row.appendChild(makeDelBtn());
            return row;
        }

        const wrapper = el("div");
        const header = el("button", { class: `gc-flex-row-sb gc-listHeader${isComplete ? " gc-complete" : ""}` });

        if (!isCompleted && editMode) {
            const nameInput = el("input", { type: "text", style: "background-color: var(--gc-overviewHeader); color: var(--gc-overviewHeader-accent)", value: quest.name ?? "", placeholder: "Quest name..." });
            nameInput.addEventListener("change", () => { quest.name = nameInput.value.trim() || null; saveActiveQuests(); });
            header.appendChild(nameInput);
        } else {
            header.appendChild(el("div", { text: quest.name ?? "Unnamed Quest" }));
        }

        header.appendChild(el("div", { text: progressStr, style: "flex: 0 1 auto; font-weight: normal;" }));
        if (editMode) header.appendChild(makeDelBtn());

        const collapseKey = `quest_${quest.id}`;
        const startCollapsed = collapseStates[collapseKey] ?? true;
        const goals = el("div", { class: `gc-listSection${startCollapsed ? " gc-hidden" : ""}` });
        const arrow = createIcon("CollapseExpand");
        arrow.classList.add("gc-arrow");
        if (startCollapsed) arrow.classList.add("gc-collapsed");
        header.appendChild(arrow);

        header.addEventListener("click", e => {
            if (e.target.closest(".gc-delete") || e.target.tagName === "INPUT") return;
            const collapsed = goals.classList.toggle("gc-hidden");
            arrow.classList.toggle("gc-collapsed", collapsed);
            collapseStates[collapseKey] = collapsed;
            saveCollapseStates();
        });

        quest.goals.forEach((goal, index) => {
            const row = el("div", { class: `gc-listEntry${goal.progress >= goal.target ? " gc-complete" : ""}` });
            row.appendChild(el("div", { text: goalLabel(goal) }));

            const count = questBattleCountMode === "enemies" ? goal.encounterCount : goal.battleCount;
            const battleStr = questBattleCountEnabled && count && (goal.type === "item" || goal.type === "category") ? ` (${count} ${battleLabel})` : "";
            row.appendChild(el("div", { text: `${Math.min(goal.progress, goal.target)}/${goal.target}${battleStr}`, style: "flex: 0 1 auto; font-weight: normal;" }));
            if (editMode && !isCompleted) {
                const del = iconBtn("SmallX", "gc-delete");
                del.addEventListener("click", () => {
                    quest.goals.splice(index, 1);
                    if (!quest.goals.length) {
                        activeQuests = activeQuests.filter(q => q.id !== quest.id);
                    }
                    saveActiveQuests();
                    renderActiveQuests();
                });
                row.appendChild(del);
            }
            goals.appendChild(row);
        });

        wrapper.appendChild(header);
        wrapper.appendChild(goals);
        return wrapper;
    }

    function renderQuestsIntoContainer(container, quests, editMode, isCompleted) {
        container.innerHTML = "";
        if (!quests.length) {
            container.appendChild(el("div", { text: isCompleted ? "No completed quests." : "No active quests.", style: "opacity: 0.5; padding: 0.41em;" }));
            return;
        }
        quests.forEach(q => container.appendChild(buildQuestItem(q, editMode, isCompleted)));
    }

    function renderActiveQuests() { if (gcActiveQuestsBox) renderQuestsIntoContainer(gcActiveQuestsBox, activeQuests, questEditMode, false); }
    function renderCompletedQuests() { if (gcCompletedQuestsBox) renderQuestsIntoContainer(gcCompletedQuestsBox, completedQuests, completedEditMode, true); }

    function resolveItemQuery(query) {
        const q = query.trim();
        if (!q) return null;
        if (itemIndex[q]) return { itemId: q, itemName: itemIndex[q].name };
        const lower = q.toLowerCase();
        const foundId = itemNameMap[lower];
        if (foundId) return { itemId: foundId, itemName: itemIndex[foundId].name };
        return null;
    }

    function makeCollapseButton(targetEls, key = null) {
        const btn = el("button");
        const arrow = createIcon("CollapseExpand");
        arrow.classList.add("gc-arrow");
        btn.appendChild(arrow);
        let collapsed = key ? (collapseStates[key] ?? false) : false;
        targetEls.forEach(el => el.classList.toggle("gc-hidden", collapsed));
        arrow.classList.toggle("gc-collapsed", collapsed);
        btn.addEventListener("click", () => {
            collapsed = !collapsed;
            targetEls.forEach(el => el.classList.toggle("gc-hidden", collapsed));
            arrow.classList.toggle("gc-collapsed", collapsed);
            if (key) { collapseStates[key] = collapsed; saveCollapseStates(); }
        });
        return btn;
    }

    // Builds the standard edit/confirm section header used by Active and Completed Quests.
    function makeQuestSectionHeader(title, scrollBox, onEnter, onLeave) {
        const header = el("div", { class: "gc-flex-row-sb" });
        header.appendChild(el("div"));
        const label = header.appendChild(el("div", { class: "gc-flex-row" }));
        const editBtn = label.appendChild(iconBtn("Edit"));
        const confirmBtn = label.appendChild(iconBtn("Check", "gc-hidden", "", "width: calc(var(--gc-fontSize) * 1.75)"));
        label.appendChild(el("div", { text: title }));
        header.appendChild(makeCollapseButton([scrollBox], `questSection_${title}`));
        editBtn.addEventListener("click", () => {
            editBtn.classList.add("gc-hidden"); confirmBtn.classList.remove("gc-hidden"); onEnter();
        });
        confirmBtn.addEventListener("click", () => {
            editBtn.classList.remove("gc-hidden"); confirmBtn.classList.add("gc-hidden"); onLeave();
        });
        return header;
    }

    // --- BUILD MAIN HEADER ---
    function buildMainHeader() {
        const header = el("div", { class: "gc-header" });

        header.appendChild(iconBtn("Handle", "", "cursor: grab"));
        header.appendChild(dividerV());

        const venueWrapper = header.appendChild(el("div", { class: "gc-flex-row", style: "flex: 1 1 auto; gap: 0; height: 3em;" }));
        const venueInfo = venueWrapper.appendChild(el("div", { style: "padding-left: 0.82em" }));
        gcVenueText = venueInfo.appendChild(el("div", { class: "gc-headerText", text: venueDisplayMap[currentVenue] ?? currentVenue }));
        gcWinsDisplay = venueInfo.appendChild(el("div", { text: "Wins:" }));

        const gearMinCol = header.appendChild(el("div", { class: "gc-flex-row", style: "align-self: flex-start;" }));

        const gearBtn = gearMinCol.appendChild(iconBtn("Gear"));
        gearBtn.addEventListener("click", () => {
            gcSettingsPanel.classList.toggle("gc-hidden");
            if (!gcSettingsPanel.classList.contains("gc-hidden")) {
                gcSettingsPanel.querySelectorAll(".gc-listSection").forEach(fitColumns);
            }
        });

        const minimizeBtn = gearMinCol.appendChild(iconBtn("SmallX"));
        minimizeBtn.addEventListener("click", () => {
            const rect = gcMainPanel.getBoundingClientRect();
            positionToggleFromPanel(rect);
            gcMainPanel.classList.add("gc-hidden");
            gcSettingsPanel.classList.add("gc-hidden");
            gcMainToggle.classList.remove("gc-hidden");
            panelHidden = true;
            localStorage.setItem("fr_coli_panelHidden", panelHidden);
        });

        return header;
    }

    // --- BUILD MAIN PANEL TABS ---
    function buildMainTabs() {
        const tabs = el("div", { class: "gc-tabs" });
        gcTabBBCode = tabs.appendChild(el("button", { text: "BBCode" }));
        gcTabOverview = tabs.appendChild(el("button", { text: "Overview" }));
        gcTabQuests = tabs.appendChild(el("button", { text: "Quests" }));
        gcTabBBCode.addEventListener("click", () => switchTab("BBCode"));
        gcTabOverview.addEventListener("click", () => switchTab("Overview"));
        gcTabQuests.addEventListener("click", () => switchTab("Quests"));
        return tabs;
    }

    // --- BUILD BBCODE CONTENT ---
    function buildBBCodeContent() {
        gcContentBBCode = el("div", { class: "gc-mainContent gc-hidden" });
        const topRow = gcContentBBCode.appendChild(el("div", { class: "gc-flex-row" }));

        gcBBCodeLayoutSelect = topRow.appendChild(el("select"));
        [["lines", "List"], ["block", "Block"], ["columns", "Columns"], ["plain", "Plaintext"]].forEach(([value, text]) =>
            gcBBCodeLayoutSelect.appendChild(el("option", { value, text })));
        gcBBCodeLayoutSelect.value = bbcodeLayout;
        gcBBCodeLayoutSelect.addEventListener("change", () => {
            bbcodeLayout = gcBBCodeLayoutSelect.value;
            localStorage.setItem("fr_coli_bbcodeLayout", bbcodeLayout);
            updateUI();
        });

        topRow.appendChild(makeVenueFilterSelect(bbcodeVenue, v => {
            bbcodeVenue = v; localStorage.setItem("fr_coli_bbcodeVenue", v); updateUI();
        }));

        const copyBtn = topRow.appendChild(el("button"));
        copyBtn.appendChild(createIcon("Copy", "width: 2em; height: 2em;"));
        const notif = el("div", { class: "gc-Notification", text: "BBCode copied!", style: "margin-top: -5em" });
        copyBtn.appendChild(notif);

        gcBBCodeScrollBox = gcContentBBCode.appendChild(el("div", { class: "gc-scrollBox", style: "user-select: all; white-space: pre-wrap; cursor: text;" }));

        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(gcBBCodeScrollBox.textContent);
            notif.classList.add("gc-visible");
            setTimeout(() => notif.classList.remove("gc-visible"), 1000);
        });
        return gcContentBBCode;
    }

    // --- BUILD OVERVIEW CONTENT ---
    function buildOverviewContent() {
        gcContentOverview = el("div", { class: "gc-mainContent gc-hidden" });
        const topRow = gcContentOverview.appendChild(el("div", { class: "gc-flex-row" }));

        const searchBar = topRow.appendChild(el("div", { class: "gc-searchbar" }));
        gcOverviewSearch = searchBar.appendChild(el("input", { type: "text", placeholder: "Search.." }));
        gcOverviewSearch.addEventListener("input", debounce(() => updateUI(), 150));
        const searchBtn = searchBar.appendChild(iconBtn("Search"));
        searchBtn.addEventListener("click", () => updateUI());

        topRow.appendChild(makeVenueFilterSelect(overviewVenue, v => {
            overviewVenue = v; localStorage.setItem("fr_coli_overviewVenue", v); updateUI();
        }));

        gcOverviewScrollBox = gcContentOverview.appendChild(el("div", { class: "gc-scrollBox" }));
        return gcContentOverview;
    }

    // --- BUILD QUEST CONTENT ---
    function buildQuestsContent() {
        gcContentQuests = el("div", { class: "gc-mainContent gc-hidden" });

        // ---- Active Quests ----
        gcActiveQuestsBox = el("div", { class: "gc-scrollBox gc-scrollBox--resize" });
        const activeHeader = makeQuestSectionHeader("Active Quests", gcActiveQuestsBox,
            () => { questEditMode = true; renderActiveQuests(); },
            () => { questEditMode = false; renderActiveQuests(); }
        );

        const importExport = el("div", { class: "gc-flex-row", style: "justify-content: center;" });
        const importInput = el("input", { type: "file", accept: ".json", class: "gc-hidden" });
        const importBtn = importExport.appendChild(el("button", { class: "gc-buttonSmall", text: "Import" }));
        const exportBtn = importExport.appendChild(el("button", { class: "gc-buttonSmall", text: "Export" }));

        function exportQuests() {
            const data = { activeQuests, completedQuests };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "FR_Quests.json"; a.click();
            URL.revokeObjectURL(url);
        }

        function importQuests(file) {
            importInput.value = ""; // reset so the same file can be selected again
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const data = JSON.parse(e.target.result);
                    const incoming = Array.isArray(data) ? data : (data.activeQuests ?? []);
                    const valid = incoming.filter(q => q.id && Array.isArray(q.goals) && q.goals.length);
                    if (!incoming.length) {
                        flashInvalid(importBtn);
                        alert("No quests found in this file.");
                        return;
                    }
                    if (!valid.length) {
                        flashInvalid(importBtn);
                        alert("The file contained no valid quests. Make sure you're importing a quest export file.");
                        return;
                    }
                    const existingIds = new Set([
                        ...activeQuests.map(q => q.id),
                        ...completedQuests.map(q => q.id)
                    ]);
                    const newQuests = valid.filter(q => !existingIds.has(q.id));
                    if (!newQuests.length) {
                        flashInvalid(importBtn);
                        alert("All quests in this file have already been imported.");
                        return;
                    }
                    activeQuests.push(...newQuests);
                    saveActiveQuests(); renderActiveQuests();
                } catch {
                    flashInvalid(importBtn);
                    alert("Could not read this file. Make sure it is a valid JSON quest export.");
                }
            };
            reader.readAsText(file);
        }

        importInput.addEventListener("change", () => { if (importInput.files[0]) importQuests(importInput.files[0]); });
        importBtn.addEventListener("click", () => importInput.click());
        exportBtn.addEventListener("click", exportQuests);

        // ---- New Quest ----
        const newQuestHeader = el("div", { class: "gc-flex-row-sb" });
        newQuestHeader.appendChild(el("div"));
        newQuestHeader.appendChild(el("div", { text: "New Quest" }));

        const questNameRow = el("div", { class: "gc-flex-row" });
        const questNameInput = questNameRow.appendChild(el("input", { type: "text", placeholder: "Quest Name [Optional]" }));

        const newQuestGoalsBox = el("div", { class: "gc-scrollBox gc-scrollBox--resize" });
        const pendingGoals = [];

        function refreshGoalsBox() {
            newQuestGoalsBox.innerHTML = "";
            if (!pendingGoals.length) {
                newQuestGoalsBox.appendChild(el("div", { text: "No goals added yet.", style: "opacity: 0.5; padding: 0.41em;" }));
                return;
            }
            pendingGoals.forEach((goal, i) => {
                const row = el("div", { class: "gc-listEntry" });
                row.appendChild(el("div", { text: goalLabel(goal) }));
                row.appendChild(el("div", { text: `x${goal.target}` }));
                const del = row.appendChild(iconBtn("SmallX", "gc-delete"));
                del.addEventListener("click", () => { pendingGoals.splice(i, 1); refreshGoalsBox(); });
                newQuestGoalsBox.appendChild(row);
            });
        }
        refreshGoalsBox();

        const itemRow = el("div", { class: "gc-flex-row" });
        const itemInput = itemRow.appendChild(el("input", { type: "text", placeholder: "Item name or ID", style: "padding-right: 0.42em;" }));
        const itemAmount = itemRow.appendChild(el("input", { type: "number", placeholder: "Amount", class: "gc-input-narrow", min: "1" }));
        const addItemBtn = itemRow.appendChild(iconBtn("Add"));
        addItemBtn.addEventListener("click", () => {
            const resolved = resolveItemQuery(itemInput.value);
            const amt = parseInt(itemAmount.value);
            if (!resolved || !amt || amt < 1) { flashInvalid(...(!resolved ? [itemInput] : []), ...(!amt || amt < 1 ? [itemAmount] : [])); return; }
            pendingGoals.push({ type: "item", itemId: resolved.itemId, itemName: resolved.itemName, target: amt, progress: 0 });
            itemInput.value = ""; itemAmount.value = "";
            refreshGoalsBox();
        });

        const categoryRow = el("div", { class: "gc-flex-row" });
        const categorySelect = categoryRow.appendChild(el("select"));
        categories.filter(c => c !== "All" && c !== "Wins").forEach(c => categorySelect.appendChild(el("option", { value: c, text: c === "Battle" ? "Battle Items" : c })));
        const categoryAmount = categoryRow.appendChild(el("input", { type: "number", placeholder: "Amount", class: "gc-input-narrow", min: "1" }));
        const addCategoryBtn = categoryRow.appendChild(iconBtn("Add"));
        addCategoryBtn.addEventListener("click", () => {
            const amt = parseInt(categoryAmount.value);
            if (!amt || amt < 1) { flashInvalid(categoryAmount); return; }
            pendingGoals.push({ type: "category", category: categorySelect.value, target: amt, progress: 0 });
            categoryAmount.value = ""; refreshGoalsBox();
        });

        const venueRow = el("div", { class: "gc-flex-row" });
        const venueSelect = venueRow.appendChild(el("select"));
        venueSelect.appendChild(el("option", { value: "All", text: "All Venues" }));
        Object.entries(venueDisplayMap).forEach(([key, name]) =>
            venueSelect.appendChild(el("option", { value: key, text: name })));
        const venueAmount = venueRow.appendChild(el("input", { type: "number", placeholder: "Battles", class: "gc-input-narrow", min: "1" }));
        const addVenueBtn = venueRow.appendChild(iconBtn("Add"));
        addVenueBtn.addEventListener("click", () => {
            const amt = parseInt(venueAmount.value);
            if (!amt || amt < 1) { flashInvalid(venueAmount); return; }
            pendingGoals.push({ type: "battles", venue: venueSelect.value, target: amt, progress: 0 });
            venueAmount.value = ""; refreshGoalsBox();
        });

        const enemyRow = el("div", { class: "gc-flex-row" });
        const enemyInput = enemyRow.appendChild(el("input", { type: "text", placeholder: "Enemy name (exact)" }));
        const enemyAmount = enemyRow.appendChild(el("input", { type: "number", placeholder: "Amount", class: "gc-input-narrow", min: "1" }));
        const addEnemyBtn = enemyRow.appendChild(iconBtn("Add"));
        addEnemyBtn.addEventListener("click", () => {
            const name = enemyInput.value.trim();
            const amt = parseInt(enemyAmount.value);
            if (!name || !amt || amt < 1) { flashInvalid(...(!name ? [enemyInput] : []), ...(!amt || amt < 1 ? [enemyAmount] : [])); return; }
            pendingGoals.push({ type: "enemy", enemyName: name, target: amt, progress: 0 });
            enemyInput.value = ""; enemyAmount.value = "";
            refreshGoalsBox();
        });

        const addQuestBtn = el("button", { class: "gc-buttonSmall", text: "Add Quest", style: "margin: 0 auto 0.41em auto;" });
        addQuestBtn.addEventListener("click", () => {
            if (!pendingGoals.length) { flashInvalid(newQuestGoalsBox); return; }
            activeQuests.push(createQuest(questNameInput.value.trim() || null, [...pendingGoals]));
            saveActiveQuests();
            questNameInput.value = ""; pendingGoals.length = 0;
            refreshGoalsBox(); renderActiveQuests();
        });

        newQuestHeader.appendChild(makeCollapseButton([questNameRow, itemRow, categoryRow, venueRow, enemyRow, newQuestGoalsBox, addQuestBtn], "newQuest"));

        // ---- Completed Quests ----
        gcCompletedQuestsBox = el("div", { class: "gc-scrollBox gc-scrollBox--resize" });
        const completedHeader = makeQuestSectionHeader("Completed Quests", gcCompletedQuestsBox,
            () => { completedEditMode = true; renderCompletedQuests(); },
            () => { completedEditMode = false; renderCompletedQuests(); }
        );

        // ---- Assemble ----
        gcContentQuests.appendChild(activeHeader);
        gcContentQuests.appendChild(gcActiveQuestsBox);
        gcContentQuests.appendChild(importExport);
        gcContentQuests.appendChild(newQuestHeader);
        gcContentQuests.appendChild(questNameRow);
        gcContentQuests.appendChild(itemRow);
        gcContentQuests.appendChild(categoryRow);
        gcContentQuests.appendChild(venueRow);
        gcContentQuests.appendChild(enemyRow);
        gcContentQuests.appendChild(newQuestGoalsBox);
        gcContentQuests.appendChild(addQuestBtn);
        gcContentQuests.appendChild(completedHeader);
        gcContentQuests.appendChild(gcCompletedQuestsBox);
        return gcContentQuests;
    }

    // --- BUILD MAIN PANEL FOOTER ---
    function buildMainFooter() {
        const footer = el("div", { class: "gc-footer" });

        gcFooterSortSelect = footer.appendChild(el("select"));
        [["name", "Name"], ["amount", "Amount"], ["id", "ID"],
        ["category-name", "Category + Name"], ["category-amount", "Category + Amount"], ["category-id", "Category + ID"]]
            .forEach(([value, text]) => gcFooterSortSelect.appendChild(el("option", { value, text })));
        gcFooterSortSelect.value = sortMode;
        gcFooterSortSelect.addEventListener("change", () => {
            sortMode = gcFooterSortSelect.value; localStorage.setItem("fr_coli_sortMode", sortMode); updateUI();
        });

        gcFooterCategorySelect = footer.appendChild(el("select"));
        categories.forEach(v => gcFooterCategorySelect.appendChild(el("option", { value: v, text: v === "Battle" ? "Battle Items" : v })));
        gcFooterCategorySelect.value = activeCategory;
        gcFooterCategorySelect.addEventListener("change", () => {
            activeCategory = gcFooterCategorySelect.value; localStorage.setItem("fr_coli_category", activeCategory); updateUI();
        });

        const resetVenueBtn = el("button", { style: "background-color: var(--gc-button); color: var(--gc-button-text); padding: 0.83em; width: 100%; display: flex; justify-content: space-between;" });
        resetVenueBtn.appendChild(el("div"));
        resetVenueBtn.appendChild(el("div", { text: "Reset Venue" }));
        const resetArrow = resetVenueBtn.appendChild(createIcon("CollapseExpand", "fill: var(--gc-button-text); padding-left: 0.83em;"));
        resetArrow.classList.add("gc-arrow", "gc-collapsed");
        const resetVenueDropdown = el("div", { class: "gc-hidden", style: "position: fixed; background-color: var(--gc-main-accent); border-radius: 5px; z-index: 10; height: 12em; overflow-y: auto; resize: vertical;" });

        // Add All Venues option at top
        const allVenuesBtn = el("button", { text: "All Venues", style: "width: 100%; border-radius: 0; border-bottom: 1px solid color-mix(in srgb, var(--gc-button-text) 15%, transparent); font-weight: normal" });

        allVenuesBtn.addEventListener("click", () => {
            resetVenueDropdown.classList.add("gc-hidden");
            if (!confirm("Reset loot data for ALL venues? This cannot be undone.")) return;
            Object.keys(venueDisplayMap).forEach(key => saveVenueData(key, { battleCount: 0, loot: {} }));
            updateUI();
        });
        resetVenueDropdown.appendChild(allVenuesBtn);

        // Add each venue
        Object.entries(venueDisplayMap).forEach(([key, name]) => {
            const btn = el("button", { text: name, style: "width: 100%; border-radius: 0; border-bottom: 1px solid color-mix(in srgb, var(--gc-button-text) 15%, transparent); font-weight: normal" });
            btn.addEventListener("click", () => {
                resetVenueDropdown.classList.add("gc-hidden");
                if (!confirm(`Reset all loot data for ${name}?`)) return;
                saveVenueData(key, { battleCount: 0, loot: {} });
                updateUI();
            });
            resetVenueDropdown.appendChild(btn);
        });

        resetVenueBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isHidden = resetVenueDropdown.classList.contains("gc-hidden");
            resetVenueDropdown.classList.toggle("gc-hidden");
            resetArrow.classList.toggle("gc-collapsed", !isHidden);
            if (isHidden) {
                const rect = resetVenueBtn.getBoundingClientRect();
                resetVenueDropdown.style.top = `${rect.bottom}px`;
                resetVenueDropdown.style.left = `${rect.left}px`;
                resetVenueDropdown.style.width = `${rect.width}px`;
            }
        });


        document.addEventListener("mousedown", (e) => {
            if (resetVenueDropdown.contains(e.target) || resetVenueBtn.contains(e.target)) return;
            resetVenueDropdown.classList.add("gc-hidden");
            resetArrow.classList.add("gc-collapsed");
        });

        const resetVenueWrapper = el("div", { style: "position: relative; grid-column: 1 / 3;" });
        resetVenueWrapper.appendChild(resetVenueBtn);
        resetVenueWrapper.appendChild(resetVenueDropdown);

        const collapseBtn = footer.appendChild(makeCollapseButton([gcFooterSortSelect, gcFooterCategorySelect, resetVenueWrapper], "footer"));
        collapseBtn.style.gridColumn = "3";
        collapseBtn.style.gridRow = "1";
        footer.appendChild(resetVenueWrapper);
        return footer;
    }

    // --- BUILD SETTINGS PANEL HEADER ---
    function buildSettingsHeader() {
        const header = el("div", { class: "gc-header" });
        header.appendChild(iconBtn("Handle", "", "cursor: grab"));
        header.appendChild(dividerV());
        const titleWrapper = header.appendChild(el("div", { class: "gc-flex-row", style: "flex: 1 1 auto" }));
        titleWrapper.appendChild(el("div", { class: "gc-headerText", text: "Settings" }));
        const closeBtn = header.appendChild(iconBtn("SmallX", "", "width: calc(var(--gc-fontSize) * 1.25); height: calc(var(--gc-fontSize) * 1.25); align-self: flex-start;"));
        closeBtn.addEventListener("click", () => gcSettingsPanel.classList.toggle("gc-hidden"));
        return header;
    }

    // --- BUILD SETTINGS PANEL TABS ---
    function buildSettingsTabs() {
        const tabs = el("div", { class: "gc-tabs" });
        gcSettingsTabVisual = tabs.appendChild(el("button", { text: "Visual" }));
        gcSettingsTabHighlights = tabs.appendChild(el("button", { text: "Highlights" }));
        gcSettingsTabVisual.addEventListener("click", () => { switchTab("Visual"); fitColumns(themeDetailEl); });
        gcSettingsTabHighlights.addEventListener("click", () => { switchTab("Highlights"); fitColumns(highlightDetailEl); });
        return tabs;
    }

    // --- BUILD VISUAL SETTINGS CONTENT ---
    function buildVisualSettingsContent() {
        gcSettingsContentVisual = el("div", { class: "gc-mainContent gc-hidden" });
        const displayCol = el("div", { class: "gc-flex-col" });

        makeSettingSelect(displayCol, "Header Mode:",
            [["always", "Always"], ["all", "All Only"], ["none", "None"]], headerMode,
            v => { headerMode = v; localStorage.setItem("fr_coli_headerMode", v); updateUI(); },
            "When to show category headers in Overview and BBCode");

        makeSettingSelect(displayCol, "BBCode Header Style:",
            [["bold-center", "Bold + Centered"], ["hidden", "Hidden tag"], ["plain", "Plain text"]], bbcodeHeaderStyle,
            v => { bbcodeHeaderStyle = v; localStorage.setItem("fr_coli_bbcodeHeaderStyle", v); updateUI(); },
            "How category (and venue) headers are formatted in the BBCode output");

        makeSettingSelect(displayCol, "Venue group mode:",
            [["grouped", "By Venue"], ["mixed", "Mixed"]], venueGroupMode,
            v => { venueGroupMode = v; localStorage.setItem("fr_coli_groupMode", v); updateUI(); },
            "If showing loot from multiple venues, should loot be separated by venue or not");

        displayCol.appendChild(dividerH());

        makeSettingSelect(displayCol, "Quest Battle Count:",
            [["on", "On"], ["off", "Off"]], questBattleCountEnabled ? "on" : "off",
            v => { questBattleCountEnabled = v === "on"; localStorage.setItem("fr_coli_questBattleCount", questBattleCountEnabled); updateUI(); },
            "Track how many valid encounters it took to get a quest item drop");

        makeSettingSelect(displayCol, "Quest Battle Count Mode:",
            [["battles", "Valid Battles"], ["enemies", "Valid Enemy Encounters"]], questBattleCountMode,
            v => { questBattleCountMode = v; localStorage.setItem("fr_coli_questBattleCountMode", v); updateUI(); },
            "Whether the battle count tracks whole battles (1 per fight) or individual valid enemies per fight");

        makeSettingSelect(displayCol, "Quest Notifications:",
            [["on", "On"], ["off", "Off"]], questNotifEnabled ? "on" : "off",
            v => { questNotifEnabled = v === "on"; localStorage.setItem("fr_coli_questNotif", questNotifEnabled); },
            "Whether to show a notification when a quest is completed");

        displayCol.appendChild(dividerH());

        displayCol.appendChild(el("label", { text: "Font size:" }));
        const fontSizeInput = displayCol.appendChild(el("input", { type: "number", min: "5", max: "40", value: fontSize }));
        fontSizeInput.addEventListener("change", () => {
            fontSize = parseInt(fontSizeInput.value);
            localStorage.setItem("fr_coli_fontSize", fontSize);
            gcRoot.style.setProperty("--gc-fontSize", `${fontSize}px`);
            applyColumnMode();
        });

        makeSettingSelect(displayCol, "Font:",
            [["Verdana, Geneva, sans-serif", "Verdana"], ["Trebuchet MS, sans-serif", "Trebuchet MS"], ["Arial, sans-serif", "Arial"], ["Tahoma, Geneva, sans-serif", "Tahoma"], ["Segoe UI, sans-serif", "Segoe UI"], ["Georgia, serif", "Georgia"], ["Palatino Linotype, Palatino, serif", "Palatino"], ["Courier New, monospace", "Courier New"], ["Comic Sans MS, sans-serif", "Comic Sans MS"]], savedFont,
            v => { savedFont = v; gcRoot.style.setProperty("--gc-FontFamily", v); localStorage.setItem("fr_coli_fontFamily", v); });

        displayCol.appendChild(dividerH());

        makeSettingSelect(displayCol, "Column Mode:",
            [["auto", "Auto"], ["single", "Single"]], columnMode,
            v => { columnMode = v; localStorage.setItem("fr_coli_columnMode", v); applyColumnMode(); },
            "Auto fits columns to content width, Single forces one column everywhere");

        makeSettingSelect(displayCol, "Icon Mode:",
            [["both", "Both"], ["headers", "Headers Only"], ["entries", "Entries Only"]], iconMode,
            v => { iconMode = v; localStorage.setItem("fr_coli_iconMode", v); applyIconMode(); },
            "Where to show category icons — in headers, entries, or both");

        displayCol.appendChild(dividerH());

        makeSettingSelect(displayCol, "Toggle Position:",
            [["top-right", "Top Right"], ["top-left", "Top Left"], ["bottom-right", "Bottom Right"], ["bottom-left", "Bottom Left"]], toggleCorner,
            v => { toggleCorner = v; localStorage.setItem("fr_coli_toggleCorner", v); },
            "Which corner of the panel the toggle button collapses to");

        makeSettingSelect(displayCol, "Toggle Style:",
            [["text", "Text"], ["icon-small", "Icon (Small)"], ["icon-large", "Icon (Large)"]], toggleStyle,
            v => { toggleStyle = v; localStorage.setItem("fr_coli_toggleStyle", v); applyToggleStyle(); },
            "The appearance of the collapse toggle button");


        displayCol.appendChild(dividerH());

        // --- Color editor rows
        themeDetailEl = el("div", { class: "gc-listSection" });
        colorVars.forEach(([label, cssVar]) => {
            const currentValue = savedThemes[activeThemeName]?.[cssVar] ?? "";
            const row = el("div", { class: "gc-listEntry" });
            const displayGroup = el("div", { class: "gc-flex-row gc-themeDisplayGroup", style: "margin-left: auto; flex: 0 0 auto;" });
            const colorSwatch = el("div", { style: `border-radius: 2px; width: var(--gc-fontSize); height: var(--gc-fontSize); background-color: ${currentValue}` });
            const hexDisplay = el("div", { text: currentValue, style: "padding: 0.42em 0.83em 0.42em 0.83em; min-width: 5em;" });
            displayGroup.appendChild(colorSwatch);
            displayGroup.appendChild(hexDisplay);
            const inputGroup = el("div", { class: "gc-flex-row gc-themeInputGroup gc-hidden", style: "margin-left: auto" });
            const colorInput = el("input", { type: "color", value: currentValue });
            const textInput = el("input", { type: "text", style: "min-width: 5em", value: currentValue });
            inputGroup.appendChild(colorInput);
            inputGroup.appendChild(textInput);
            colorInputMap[cssVar] = colorInput;
            colorInput.addEventListener("input", () => {
                textInput.value = colorInput.value;
                colorSwatch.style.backgroundColor = colorInput.value;
                hexDisplay.textContent = colorInput.value;
                gcRoot.style.setProperty(cssVar, colorInput.value);
            });
            textInput.addEventListener("change", () => {
                const val = textInput.value.trim();
                if (/^#[0-9a-fA-F]{3,8}$/.test(val)) {
                    colorInput.value = val; colorSwatch.style.backgroundColor = val;
                    hexDisplay.textContent = val; gcRoot.style.setProperty(cssVar, val);
                }
            });
            row.appendChild(el("div", { text: label }));
            row.appendChild(displayGroup);
            row.appendChild(inputGroup);
            themeDetailEl.appendChild(row);
        });
        fitColumns(themeDetailEl);

        themePresetManager = buildPresetManager({
            label: "Theme", savedPresets: savedThemes, defaultPresets: defaultThemes,
            activePresetName: activeThemeName, storageKey: "fr_coli_themes", activeKey: "fr_coli_activeTheme",
            detailEl: themeDetailEl, editModeEls: [], onApply: applyTheme, onGetCurrent: getThemeCurrent,
            onUpdate: (updated) => { savedThemes = updated; }, hasUnsavedChanges: themeHasUnsavedChanges,
            onEnterEdit: () => {
                themeDetailEl.querySelectorAll(".gc-themeDisplayGroup").forEach(el => el.classList.add("gc-hidden"));
                themeDetailEl.querySelectorAll(".gc-themeInputGroup").forEach(el => el.classList.remove("gc-hidden"));
            },
            onLeaveEdit: () => {
                themeDetailEl.querySelectorAll(".gc-themeDisplayGroup").forEach(el => el.classList.remove("gc-hidden"));
                themeDetailEl.querySelectorAll(".gc-themeInputGroup").forEach(el => el.classList.add("gc-hidden"));
            }
        });

        gcSettingsContentVisual.appendChild(displayCol);
        gcSettingsContentVisual.appendChild(themePresetManager);
        return gcSettingsContentVisual;
    }

    // --- BUILD HIGHLIGHT SETTINGS CONTENT ---
    function buildHighlightsSettingsContent() {
        gcSettingsContentHighlights = el("div", { class: "gc-mainContent gc-hidden" });
        const optionsCol = el("div", { class: "gc-flex-col" });

        makeSettingSelect(optionsCol, "Festival Drops",
            [["duplicate", "Duplicate"], ["exclusive", "Exclusive"], ["off", "Off"]], festivalMode,
            v => { festivalMode = v; localStorage.setItem("fr_coli_festivalMode", v); updateUI(); },
            "Decides if festival drops should show in the festival category only, in both festival and the original category, or be turned off");

        optionsCol.appendChild(el("label", { text: "Festival Items", title: "Decides which festival items should be included as festival drops" }));
        const festivalCheckCol = optionsCol.appendChild(el("div", { class: "gc-flex-col", style: "grid-template-columns: auto 1fr; gap: 0.41em; padding: 0;" }));
        festivalTypes.forEach(([key, label]) => {
            const checkbox = festivalCheckCol.appendChild(el("input", { type: "checkbox" }));
            checkbox.checked = activeFestivals.has(key);
            festivalCheckCol.appendChild(el("div", { text: label }));
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) activeFestivals.add(key); else activeFestivals.delete(key);
                localStorage.setItem("fr_coli_festivals", JSON.stringify([...activeFestivals]));
                rebuildFestivalSet(); updateUI();
            });
        });

        optionsCol.appendChild(dividerH());

        makeSettingSelect(optionsCol, "Highlight Drops",
            [["duplicate", "Duplicate"], ["exclusive", "Exclusive"], ["off", "Off"]], highlightMode,
            v => { highlightMode = v; localStorage.setItem("fr_coli_highlightMode", v); updateUI(); },
            "Decides if highlight drops should show in the highlight category only, in both highlights and the original category, or be turned off");

        optionsCol.appendChild(dividerH());

        let highlightEditMode = false;
        highlightDetailEl = el("div", { class: "gc-listSection" });

        function rebuildHighlightDetail() {
            highlightDetailEl.innerHTML = "";
            workingHighlightPreset.forEach((id, index) => {
                const item = itemIndex[id];
                const row = el("div", { class: "gc-listEntry" });
                row.appendChild(createIcon(item?.category ?? "Other", "width: 1.1em; fill: var(--gc-highlightColor"));
                row.appendChild(el("div", { text: item?.name ?? id }));
                if (highlightEditMode) {
                    const deleteBtn = row.appendChild(iconBtn("SmallX", "gc-delete"));
                    deleteBtn.addEventListener("click", () => { workingHighlightPreset.splice(index, 1); rebuildHighlightDetail(); });
                }
                highlightDetailEl.appendChild(row);
            });
            fitColumns(highlightDetailEl);
        }

        const addRow = el("div", { class: "gc-flex-row gc-span" });
        const addSearchBar = addRow.appendChild(el("div", { class: "gc-searchbar" }));
        const addInput = addSearchBar.appendChild(el("input", { type: "text", placeholder: "Enter loot name or ID" }));
        const addBtn = addRow.appendChild(el("button", { class: "gc-buttonSmall", text: "Add" }));

        addBtn.addEventListener("click", () => {
            const query = addInput.value.trim();
            if (!query) return;
            const lower = query.toLowerCase();
            const matchId = itemIndex[query] ? query : (itemNameMap[lower] ?? null);
            if (!matchId) { alert(`Could not find an item matching "${query}". Try using the exact name or item ID.`); return; }
            if (workingHighlightPreset.includes(matchId)) { alert(`"${itemIndex[matchId]?.name ?? matchId}" is already in the preset.`); return; }
            workingHighlightPreset.push(matchId);
            addInput.value = ""; rebuildHighlightDetail();
        });
        addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });

        highlightPresetManager = buildPresetManager({
            label: "Highlight Preset", savedPresets: savedHighlightPresets, defaultPresets: defaultHighlightPresets,
            activePresetName: activeHighlightPresetName, storageKey: "fr_coli_highlightPresets",
            activeKey: "fr_coli_activeHighlightPreset", detailEl: highlightDetailEl, editModeEls: [addRow],
            onApply: (name, preset) => {
                activeHighlightPresetName = name;
                workingHighlightPreset = [...preset].map(String);
                highlightPreset = [...workingHighlightPreset];
                highlightSet.clear(); highlightPreset.forEach(id => highlightSet.add(id));
                rebuildHighlightDetail(); updateUI();
            },
            onGetCurrent: () => [...workingHighlightPreset],
            onUpdate: (updated) => { savedHighlightPresets = updated; },
            hasUnsavedChanges: () => {
                const saved = savedHighlightPresets[activeHighlightPresetName] ?? [];
                return JSON.stringify(workingHighlightPreset) !== JSON.stringify(saved.map(String));
            },
            onEnterEdit: () => { highlightEditMode = true; rebuildHighlightDetail(); },
            onLeaveEdit: () => {
                highlightEditMode = false;
                workingHighlightPreset = [...(savedHighlightPresets[activeHighlightPresetName] ?? [])].map(String);
                rebuildHighlightDetail();
            }
        });

        rebuildHighlightDetail();
        gcSettingsContentHighlights.appendChild(optionsCol);

        const importExportRow = el("div", { class: "gc-flex-row gc-span", style: "justify-content: center;" });

        const importBtn = el("button", { class: "gc-buttonSmall", text: "Import Preset from File" });
        importBtn.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file"; input.accept = ".json";
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        if (!Array.isArray(parsed)) throw new Error("Not array");
                        const name = prompt("Name this preset:", file.name.replace(".json", ""));
                        if (!name?.trim()) return;
                        savedHighlightPresets[name.trim()] = parsed.map(String);
                        localStorage.setItem("fr_coli_highlightPresets", JSON.stringify(savedHighlightPresets));
                        activeHighlightPresetName = name.trim();
                        localStorage.setItem("fr_coli_activeHighlightPreset", activeHighlightPresetName);
                        workingHighlightPreset = [...savedHighlightPresets[activeHighlightPresetName]];
                        highlightPreset = [...workingHighlightPreset];
                        highlightSet.clear(); highlightPreset.forEach(id => highlightSet.add(id));
                        highlightPresetManager._setActive(activeHighlightPresetName); rebuildHighlightDetail(); updateUI();
                        alert(`Preset "${name.trim()}" imported successfully.`);
                    } catch (err) {
                        alert("Invalid preset file — expected a JSON array of item IDs.");
                        console.warn("Preset import error:", err);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
        const exportPresetBtn = el("button", { class: "gc-buttonSmall", text: "Export Preset" });
        exportPresetBtn.addEventListener("click", () => {
            const preset = savedHighlightPresets[activeHighlightPresetName];
            if (!preset) return;
            const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${activeHighlightPresetName}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        importExportRow.appendChild(importBtn);
        importExportRow.appendChild(exportPresetBtn);
        gcSettingsContentHighlights.appendChild(importExportRow);
        gcSettingsContentHighlights.appendChild(highlightPresetManager);
        return gcSettingsContentHighlights;
    }

    // --- BUILD SETTINGS PANEL FOOTER ---
    function buildSettingsFooter() {
        const footer = el("div", { class: "gc-footer" });
        const deleteAllBtn = el("button", { class: "gc-delete gc-span", text: "Delete All Data", style: "margin: auto;" });
        deleteAllBtn.addEventListener("click", () => {
            if (!confirm("Delete ALL tracker data and user settings? This cannot be undone. The page will refresh upon deletion.")) return;
            Object.keys(localStorage)
                .filter(k => k.startsWith("fr_coli_"))
                .forEach(k => localStorage.removeItem(k));
            location.reload();
        });
        footer.appendChild(deleteAllBtn);
        return footer;
    }

    // --- BUILD LIST ENTRY ---
    function buildListEntry(iconName, name, amount, onDelete = null, isHighlight = false) {
        const entry = el("div", { class: "gc-listEntry" });
        entry.appendChild(createIcon(iconName, `width: 1.1em${isHighlight ? "; fill: var(--gc-highlightColor)" : ""}`));
        entry.appendChild(el("div", { text: name }));
        const amountEl = entry.appendChild(el("div", { text: `x${amount}` }));
        entry._amountEl = amountEl;
        if (onDelete) {
            const deleteBtn = iconBtn("SmallX", "gc-delete");
            deleteBtn.addEventListener("click", onDelete);
            entry.appendChild(deleteBtn);
        }
        return entry;
    }

    // --- BUILD PRESET MANAGER ---
    function buildPresetManager({ label, savedPresets, defaultPresets, activePresetName, storageKey, activeKey, detailEl, editModeEls = [], onApply, onGetCurrent, onUpdate, hasUnsavedChanges = () => false, onEnterEdit = null, onLeaveEdit = null }) {
        const container = el("div", { class: "gc-flex-col gc-span" });

        const displayLabel = container.appendChild(el("div", { text: `Active ${label}:`, class: "gc-span" }));
        const displayRow = container.appendChild(el("div", { class: "gc-flex-row gc-span" }));
        const presetSelect = displayRow.appendChild(el("select"));
        const editBtn = displayRow.appendChild(el("button", { class: "gc-editCancel gc-buttonSmall", text: "Edit" }));

        const editLabel = container.appendChild(el("div", { text: `Editing ${label}:`, class: "gc-hidden gc-span" }));
        const editRow = container.appendChild(el("div", { class: "gc-flex-row gc-hidden gc-span" }));
        const nameInput = editRow.appendChild(el("input", { type: "text", style: "border: 1px solid var(--gc-border);" }));
        const cancelBtn = editRow.appendChild(el("button", { class: "gc-editCancel gc-buttonSmall", text: "Cancel" }));

        const saveRow = container.appendChild(el("div", { class: "gc-flex-row gc-hidden gc-span" }));
        const saveBtn = saveRow.appendChild(el("button", { class: "gc-buttonSmall", text: "Save" }));
        const saveAsBtn = saveRow.appendChild(el("button", { class: "gc-buttonSmall", text: "Save As" }));

        container.appendChild(dividerH());

        editModeEls.forEach(el => { el.classList.add("gc-hidden"); container.appendChild(el); });

        const detailWrapper = el("div", { class: "gc-scrollBox gc-span", style: "flex: 1 1 auto;" });
        detailWrapper.appendChild(detailEl);
        container.appendChild(detailWrapper);

        const deleteBtn = container.appendChild(el("button", { class: "gc-buttonSmall gc-delete gc-span", text: "Delete Preset", style: "justify-self: center;" }));
        const resetBtn = container.appendChild(el("button", { class: "gc-buttonSmall gc-span", text: "Reset all Presets to Defaults", style: "justify-self: center; margin-top: 0.83em" }));

        let isEditing = false;
        let originalPresetName = activePresetName;

        function refreshSelect() {
            presetSelect.innerHTML = "";
            Object.keys(savedPresets).forEach(name => presetSelect.appendChild(el("option", { value: name, text: name })));
            presetSelect.value = activePresetName;
        }

        function enterEditMode() {
            isEditing = true; originalPresetName = activePresetName; nameInput.value = activePresetName;
            displayLabel.classList.add("gc-hidden"); displayRow.classList.add("gc-hidden");
            editLabel.classList.remove("gc-hidden"); editRow.classList.remove("gc-hidden"); saveRow.classList.remove("gc-hidden");
            editModeEls.forEach(el => el.classList.remove("gc-hidden"));
            if (onEnterEdit) onEnterEdit();
        }

        function leaveEditMode() {
            isEditing = false;
            displayLabel.classList.remove("gc-hidden"); displayRow.classList.remove("gc-hidden");
            editLabel.classList.add("gc-hidden"); editRow.classList.add("gc-hidden"); saveRow.classList.add("gc-hidden");
            editModeEls.forEach(el => el.classList.add("gc-hidden"));
            refreshSelect();
            if (onLeaveEdit) onLeaveEdit();
        }

        function save(name) {
            savedPresets[name] = onGetCurrent(); activePresetName = name;
            localStorage.setItem(storageKey, JSON.stringify(savedPresets));
            localStorage.setItem(activeKey, activePresetName);
            onUpdate(savedPresets);
            onApply(activePresetName, savedPresets[activePresetName]);
        }

        presetSelect.addEventListener("change", () => {
            activePresetName = presetSelect.value;
            localStorage.setItem(activeKey, activePresetName);
            onApply(activePresetName, savedPresets[activePresetName]);
        });

        editBtn.addEventListener("click", () => enterEditMode());

        cancelBtn.addEventListener("click", () => {
            if (hasUnsavedChanges()) {
                if (!confirm("Exit without saving?")) return;
                onApply(originalPresetName, savedPresets[originalPresetName]);
                activePresetName = originalPresetName;
            }
            leaveEditMode();
        });

        saveBtn.addEventListener("click", () => {
            const newName = nameInput.value.trim() || activePresetName;
            if (newName !== originalPresetName && savedPresets[originalPresetName]) {
                delete savedPresets[originalPresetName];
            }
            save(newName);
            leaveEditMode();
        });

        saveAsBtn.addEventListener("click", () => {
            const name = prompt("Enter preset name:");
            if (!name?.trim()) return;
            if (savedPresets[name.trim()] && !confirm(`"${name.trim()}" already exists. Overwrite?`)) return;
            save(name.trim()); leaveEditMode(); refreshSelect();
        });

        deleteBtn.addEventListener("click", () => {
            if (Object.keys(savedPresets).length <= 1) { alert("Cannot delete the last remaining preset."); return; }
            if (!confirm(`Delete "${activePresetName}"?`)) return;
            delete savedPresets[activePresetName];
            localStorage.setItem(storageKey, JSON.stringify(savedPresets));
            onUpdate(savedPresets);
            activePresetName = Object.keys(savedPresets)[0];
            localStorage.setItem(activeKey, activePresetName);
            onApply(activePresetName, savedPresets[activePresetName]);
            if (isEditing) leaveEditMode(); else refreshSelect();
        });

        resetBtn.addEventListener("click", () => {
            if (!confirm("Reset all presets to default? This cannot be undone.")) return;
            savedPresets = { ...defaultPresets };
            localStorage.setItem(storageKey, JSON.stringify(savedPresets));
            onUpdate(savedPresets);
            activePresetName = Object.keys(savedPresets)[0];
            localStorage.setItem(activeKey, activePresetName);
            onApply(activePresetName, savedPresets[activePresetName]);
            if (isEditing) leaveEditMode(); else refreshSelect();
        });

        container._refresh = refreshSelect;
        container._setActive = (name) => {
            activePresetName = name;
            refreshSelect();
        };
        return container;
    }

    // --- BUILD UI ---
    function buildUI() {
        gcMainPanel = el("div", {
            class: "gc-panel", style: `top: ${localStorage.getItem("fr_coli_posTop") ?? 10}px; right: ${localStorage.getItem("fr_coli_posRight") ?? 10}px; ${localStorage.getItem("fr_coli_panelWidth") ? `width: ${localStorage.getItem("fr_coli_panelWidth")}px;` : ""} ${localStorage.getItem("fr_coli_panelHeight") ? `height: ${localStorage.getItem("fr_coli_panelHeight")}px;` : ""}`
        });
        gcMainPanel.appendChild(buildMainHeader());
        gcMainPanel.appendChild(buildMainTabs());
        gcMainPanel.appendChild(buildBBCodeContent());
        gcMainPanel.appendChild(buildOverviewContent());
        gcMainPanel.appendChild(buildQuestsContent());
        gcMainPanel.appendChild(buildMainFooter());

        gcSettingsPanel = el("div", { class: "gc-panel gc-hidden", style: `z-index: 4; top: ${localStorage.getItem("fr_coli_settingsPosTop") ?? 10}px; right: ${localStorage.getItem("fr_coli_settingsPosRight") ?? 10}px` });
        gcSettingsPanel.appendChild(buildSettingsHeader());
        gcSettingsPanel.appendChild(buildSettingsTabs());
        gcSettingsPanel.appendChild(buildVisualSettingsContent());
        gcSettingsPanel.appendChild(buildHighlightsSettingsContent());
        gcSettingsPanel.appendChild(buildSettingsFooter());

        gcMainToggle = el("button", { text: "Coliseum tracker", style: `position: fixed; top: ${localStorage.getItem("fr_coli_toggleTop") ?? localStorage.getItem("fr_coli_posTop") ?? 10}px; right: ${localStorage.getItem("fr_coli_toggleRight") ?? localStorage.getItem("fr_coli_posRight") ?? 10}px;` });
        panelResizeObserver.observe(gcMainPanel);
        const toggleHandle = gcMainToggle.appendChild(el("div", { style: "position: absolute; top: 0; right: 0; width: 1.5em; height: 1.5em; cursor: grab;" }));

        gcMainPanel.classList.toggle("gc-hidden", panelHidden);
        gcMainToggle.classList.toggle("gc-hidden", !panelHidden);

        gcMainToggle.addEventListener("click", () => {
            const rect = gcMainToggle.getBoundingClientRect();
            positionPanelFromToggle(rect);
            gcMainPanel.classList.remove("gc-hidden");
            gcMainToggle.classList.add("gc-hidden");
            panelHidden = false;
            localStorage.setItem("fr_coli_panelHidden", panelHidden);
        });

        gcRoot = el("div", { class: "gc-root" });
        gcRoot.appendChild(gcMainToggle);
        gcRoot.appendChild(gcMainPanel);
        gcRoot.appendChild(gcSettingsPanel);
        gcRoot.appendChild(svgSprites);
        document.body.appendChild(gcRoot);

        initThemes();
        initHighlightPresets();
        themePresetManager._refresh();
        highlightPresetManager._refresh();
        applyTheme(activeThemeName);
        applyIconMode();
        applyToggleStyle();
        gcRoot.style.setProperty("--gc-FontFamily", savedFont);

        gcQuestNotif = el("div", { class: "gc-Notification" });
        positionQuestNotification();

        makeDraggable(toggleHandle, gcMainToggle, "fr_coli_toggleTop", "fr_coli_toggleRight");
        makeDraggable(gcMainPanel.querySelector(".gc-header button"), gcMainPanel, "fr_coli_posTop", "fr_coli_posRight");
        makeDraggable(gcSettingsPanel.querySelector(".gc-header button"), gcSettingsPanel, "fr_coli_settingsPosTop", "fr_coli_settingsPosRight");

        tabMap = {
            MainTabs: {
                _storageKey: "fr_coli_activeTab",
                BBCode: [gcContentBBCode, gcTabBBCode],
                Overview: [gcContentOverview, gcTabOverview],
                Quests: [gcContentQuests, gcTabQuests]
            },
            SettingsTabs: {
                _storageKey: "fr_coli_activeSetTab",
                Visual: [gcSettingsContentVisual, gcSettingsTabVisual],
                Highlights: [gcSettingsContentHighlights, gcSettingsTabHighlights],
            }
        };

        switchTab(activeTabName);
        switchTab(activeSetTabName);
    }

})();
