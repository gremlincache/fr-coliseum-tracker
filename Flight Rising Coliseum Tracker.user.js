// ==UserScript==
// @name         Flight Rising Coliseum Tracker
// @namespace    https://tampermonkey.net/
// @version      1.3.2
// @description  Coliseum tracker with BBCode, categories, sorting, overview, dark and light theme and font sizes.
// @match        https://flightrising.com/main.php?p=battle*
// @grant        none
// @run-at       document-start
// @require      https://raw.githubusercontent.com/gremlincache/fr-coliseum-tracker/refs/heads/main/itemIndex.js
// @updateURL    https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js
// @downloadURL  https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Prevent double execution
    if (window.hasRunColiTracker) return;
    window.hasRunColiTracker = true;

    // --- External itemIndex
    const itemIndex = window.itemIndex;

    // --- Highlight default preset
    const defaultHighlightPreset = [
        "577","578","579","580","581","582","583","584","585","586","587",
        "498",
        "1222","7594","7600","7882","7883","10231","10233","11522","11525","13428","13430","16481","16487","16911","16912","17507","17508","20145","20157","21430","21431","23842","23844","25776","25777","28235","28236","34765","34766","36300","36301","51945","51946", "67094", "67095",
    ];

    // current runtime preset (will be loaded from localStorage if present)
    let highlightPreset = [...defaultHighlightPreset];

    // highlight mode: "off" | "duplicate" | "exclusive"
    let highlightMode = localStorage.getItem("fr_coli_highlightMode") || "duplicate";

    // try to load a custom preset from localStorage (if user previously imported one)
    (function loadHighlightPresetFromStorage() {
    const stored = localStorage.getItem("fr_coli_customHighlight");
    if (!stored) return;
    try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
        // Normalize to strings to avoid number/string mismatches
        highlightPreset = parsed.map(String);
        } else {
        console.warn("fr_coli_customHighlight is not an array — ignoring.");
        localStorage.removeItem("fr_coli_customHighlight");
        }
    } catch (err) {
        console.warn("Could not parse fr_coli_customHighlight — ignoring.", err);
        localStorage.removeItem("fr_coli_customHighlight");
    }
    })();

    // --- Venues & Categories
    const venues = ["Training Fields","Woodland Path","Scorched Forest","Boneyard","Sandswept Delta",
        "Silk-Strewn Wreckage","Blooming Grove","Forgotten Cave","Bamboo Falls","Thunderhead Savanna",
        "Redrock Cove","Waterway","Arena","Volcanic Vents","Rainsong Jungle","Boreal Wood",
        "Crystal Pools","Harpy's Roost","Ghostlight Ruins","Mire","Kelp Beds","Construct Workshop","Forbidden Portal"];
    const categories = ["All","Food","Materials","Apparel","Familiars","Battle","Skins","Specialty","Other"];

    // --- Starting state
    let currentVenue = localStorage.getItem("fr_coli_currentVenue") || venues[0];
    let activeCategory = localStorage.getItem("fr_coli_category") || "All";
    let sortMode = localStorage.getItem("fr_coli_sortMode") || "name";
    let overviewVisible = false;
    let fontSize = parseInt(localStorage.getItem("fr_coli_fontSize")) || 12;
    let themeMode = localStorage.getItem("fr_coli_theme") || "dark";
    let headerMode = localStorage.getItem("fr_coli_headerMode") || "all";
    let bbcodeLayout = localStorage.getItem("fr_coli_bbcodeLayout") || "lines"; // options: "lines", "block", "columns"

    const themes = {
        dark: { bg:"rgb(31,29,29)", text:"rgb(233,233,233)", border:"rgb(0,0,0)" },
        light:{ bg:"rgb(233,233,233)", text:"rgb(0,0,0)", border:"rgb(255,255,255)" }
    };

    const getThemeColors = () => themes[themeMode];
    const getVenueData = v => JSON.parse(localStorage.getItem(`fr_coli_data_${v}`) || '{"battleCount":0,"loot":{}}');
    const saveVenueData = (v,d) => localStorage.setItem(`fr_coli_data_${v}`, JSON.stringify(d));
    const getCurrentData = () => getVenueData(currentVenue);

    // --- Helpers ---

    // --- Styling
    const applyStyles = (el, baseStyles, overrides = {}) => {
        Object.assign(el.style, {...baseStyles, ...overrides});
    };

    // --- Format BBCode
    function formatLootAsBBCode(loot, categoryFilter, sortBy) {
        let result = "";

        // normalize entries
        const entries = Object.keys(loot).map(id => {
            const entry = itemIndex[id];
            return {
            id: String(id),
            amount: loot[id],
            name: entry?.name || id,
            category: entry?.category || "Other"
            };
        });

        // categories ordering helper (use the same categories array)
        function categoryOrder(cat) {
            const idx = categories.indexOf(cat);
            return idx === -1 ? categories.length : idx;
        }

        // sorting
        if (sortBy === "name") {
            entries.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "id") {
            entries.sort((a, b) => Number(a.id) - Number(b.id));
        } else if (sortBy === "category-name") {
            entries.sort((a, b) => {
            const co = categoryOrder(a.category) - categoryOrder(b.category);
            return co !== 0 ? co : a.name.localeCompare(b.name);
            });
        } else if (sortBy === "category-id") {
            entries.sort((a, b) => {
            const co = categoryOrder(a.category) - categoryOrder(b.category);
            return co !== 0 ? co : Number(a.id) - Number(b.id);
            });
        } else if (sortBy === "amount") {
            entries.sort((a, b) => {
            const amt = b.amount - a.amount; // bigger amounts first
             if (amt !== 0) return amt;
            // tie → alphabetical
            return a.name.localeCompare(b.name);
            });
        } else if (sortBy === "category-amount") {
            entries.sort((a, b) => {
                const catOrder = categoryOrder(a.category) - categoryOrder(b.category);
                if (catOrder !== 0) return catOrder;

                const amt = b.amount - a.amount; // biggest first
                if (amt !== 0) return amt;
                return a.name.localeCompare(b.name);
            });
        }

        // highlights
        const highlightSet = new Set((highlightPreset || []).map(String));
        const highlights = entries.filter(e => highlightSet.has(e.id));

        // entriesToUse respects exclusive mode (remove highlights from normal entries)
        const entriesToUse = highlightMode === "exclusive"
            ? entries.filter(e => !highlightSet.has(e.id))
            : entries.slice(); // duplicate and off: keep entries as-is

        // filtering by category selection
        let filtered;
        if (categoryFilter === "All") {
            filtered = entriesToUse;
        } else if (categoryFilter === "Highlights") {
            filtered = highlights;
        } else {
            filtered = entriesToUse.filter(e => e.category === categoryFilter);
        }

        // helper to format one entry
        function formatEntry(e) {
            if (e.category === "Skins") return `[skin=${e.id}] x${e.amount}`;
            if (!itemIndex[e.id]?.name) return `[gamedb item=${e.id}] x${e.amount}`;
            return `[item=${e.name}] x${e.amount}`;
        }

        function formatEntryPlain(e) {
            if (!itemIndex[e.id]?.name) return `${e.id} x${e.amount}`;
            return `${e.name} x${e.amount}`;
        }

        // add highlight block at top when viewing All AND highlightMode isn't off
        if (categoryFilter === "All" && highlightMode !== "off" && highlights.length) {
            if (headerMode !== "none" && bbcodeLayout !== "plain") result += `[b]Highlights[/b]\n`;
            if (headerMode !== "none" && bbcodeLayout == "plain") result += `Highlights\n`;
            const highlightPlainFormatted = highlights.map(formatEntryPlain);
            const highlightFormatted = highlights.map(formatEntry);

            // if exclusive, highlights are already not in entriesToUse; if duplicate they will also appear later
            if (bbcodeLayout === "plain") result += highlightPlainFormatted.join(", ");
            if (bbcodeLayout === "lines") result += highlightFormatted.join("\n");
            if (bbcodeLayout === "block") result += highlightFormatted.join(" ");
            if (bbcodeLayout === "columns") {
                let block = "[columns]";
                highlightFormatted.forEach((item, i) => {
                    const [base, amount] = item.split(" x");
                    block += `[center]${base}\n x${amount}`;
                    // only append nextcol if there's a next item
                    if (i < highlightFormatted.length - 1) {
                        if ((i + 1) % 6 === 0) block += "[/columns]\n[columns]";
                        else block += "[nextcol]";
                    }
                });
                if (!block.endsWith("[/columns]")) block += "[/columns]";
                result += block;
            }
            result += "\n";
        }

        // flat list (no headers) when not sorting by category
        if (sortBy === "name" || sortBy === "id" || sortBy === "amount") {
            const formatted = filtered.map(formatEntry);
            const formattedPlain = filtered.map(formatEntryPlain);
            if (bbcodeLayout === "lines") return result + formatted.join("\n");
            if (bbcodeLayout === "block") return result + formatted.join(" ");
            if (bbcodeLayout === "columns") {
                let output = result + "[columns]";
                formatted.forEach((item, i) => {
                    const [base, amount] = item.split(" x");
                    output += `[center]${base}\n x${amount}`;
                    // only append nextcol if there's a next item
                    if (i < formatted.length - 1) {
                        if ((i + 1) % 6 === 0) output += "[/columns]\n[columns]";
                        else output += "[nextcol]";
                    }
                });
                if (!output.endsWith("[/columns]")) output += "[/columns]";
                return output;
            }
            if (bbcodeLayout === "plain") return result + formattedPlain.join(", ");
        }

    // grouped by category (category-name or category-id)
    let currentCat = null;
    let currentGroup = [];

    function flushGroup() {
        if (!currentGroup.length) return;
        const formatted = currentGroup.map(formatEntry);
        const formattedPlain = currentGroup.map(formatEntryPlain);
        if (bbcodeLayout === "lines") result += formatted.join("\n") + "\n";
        else if (bbcodeLayout === "block") result += formatted.join(" ") + "\n";
        else if (bbcodeLayout === "columns") {
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
        result += block + "\n";
        }
        else if (bbcodeLayout === "plain") result += formattedPlain.join(", ") + "\n";
        currentGroup = [];
    }

    filtered.forEach(e => {
        if (e.category !== currentCat) {
        flushGroup();
        currentCat = e.category;
        const showHeader = headerMode === "always" || (headerMode === "all" && categoryFilter === "All");
        if (showHeader && headerMode !== "none") {
            if (bbcodeLayout === "plain") {
            result += `\n${currentCat}\n`;
            }
            else {
            result += `\n[b]${currentCat}[/b]\n`;
            }
        }
        }
        currentGroup.push(e);
    });

    flushGroup();
    return result.trim();
    }

    // --- Export Functions
    function exportJSON(){
        const allData={};
        venues.forEach(v=>{ allData[v]=getVenueData(v); });
        const blob=new Blob([JSON.stringify(allData,null,2)],{type:"application/json"});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url;
        a.download="FR_Coliseum_Data.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportCSV(){
        let csv="Venue,Wins,LootID,Amount\n";
        venues.forEach(v=>{
            const d=getVenueData(v);
            Object.keys(d.loot).forEach(id=>{
                csv+=`"${v}",${d.battleCount},${id},${d.loot[id]}\n`;
            });
        });
        const blob=new Blob([csv],{type:"text/csv"});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url;
        a.download="FR_Coliseum_Data.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    function importHighlightPreset() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!Array.isArray(parsed)) throw new Error("Not array");
                highlightPreset = parsed.map(String);
                localStorage.setItem("fr_coli_customHighlight", JSON.stringify(highlightPreset));
                alert("Highlight preset imported.");
                updateUI();
            } catch {
                alert("Invalid highlight preset file (expected JSON array of IDs).");
            }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function resetHighlightPreset() {
    if (!confirm("Reset highlight preset to default?")) return;
    localStorage.removeItem("fr_coli_customHighlight");
    highlightPreset = [...defaultHighlightPreset].map(String);
    updateUI();
    }

        // --- WebSocket Patch
    if (!window.coliTrackerWSHooked) {
    window.coliTrackerWSHooked = true;
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url,...rest){
        const ws = new OriginalWebSocket(url,...rest);
        if(url.includes("/battle")){
            ws.addEventListener("message", event=>{
                try{
                    const jsonData=JSON.parse(event.data.slice(event.data.indexOf("[")));
                    if(Array.isArray(jsonData)&&jsonData[1]&&jsonData[1][0]==="P1_WIN"){
                        const venueData=getCurrentData();
                        const drops=jsonData[1][2]; venueData.battleCount++;
                        drops.forEach(([id,,amount])=>{ venueData.loot[id]=(venueData.loot[id]||0)+amount; });
                        saveVenueData(currentVenue,venueData); updateUI();
                    }
                } catch{}
            });
        }
        return ws;
    };
    }

    // --- UpdateUI declaring
    let updateUI;

    // --- DOM ready function
    function ready(fn) {
            if (document.readyState !== "loading") fn();
            else document.addEventListener("DOMContentLoaded", fn);
    }

    function closeAllPopups() {
        if (settingsPopup) settingsPopup.style.display = "none";
        if (venuePopup) venuePopup.style.display = "none";
    }

    // --- Declare UI elements outside of Ready
        // --- Main panel
    let panel, toggleBtn, lootArea, switchBtn, venuePopup, venueSpan, venueLabel, confirmBtn, cancelBtn, venueSelect, bbTextarea, sortSelect, catSelect, resetAllBtn, resetBtn, overviewToggle;
        // --- Settings panel
    let cogBtn, settingsPopup, fontInput, themeBtn, exportCSVBtn, exportJSONBtn, headerLabel, headerSelect;
        // ---

    ready(() => {

        // --- Toggle button
    toggleBtn = document.createElement("button");
    toggleBtn.textContent="Coliseum Tracker";

    document.body.appendChild(toggleBtn);

    toggleBtn.onclick = () => {
        const isVisible = panel.style.display !== "none";
        panel.style.display = isVisible ? "none" : "block";
        if (isVisible) closeAllPopups(); // hide all subpopups when closing
    };


        // --- Panel
    panel = document.createElement("div");
    document.body.appendChild(panel);

        // --- Current Venue Display
    venueSpan = document.createElement("span");
    venueSpan.textContent=currentVenue;

    venueLabel = document.createElement("span");
    venueLabel.textContent="Current Venue: ";
    panel.appendChild(venueLabel);
    panel.appendChild(venueSpan);

    switchBtn = document.createElement("button");
    switchBtn.textContent="Switch Venue";
    panel.appendChild(switchBtn);

    venuePopup = document.createElement("div");
    document.body.appendChild(venuePopup);

    venueSelect = document.createElement("select");

    venues.forEach(v=>{
        const opt=document.createElement("option");
        opt.value=v;
        opt.textContent=v;
        if(v===currentVenue) opt.selected=true;
        venueSelect.appendChild(opt);
        });

    venuePopup.appendChild(venueSelect);

    confirmBtn = document.createElement("button");
    confirmBtn.textContent="Confirm";
    venuePopup.appendChild(confirmBtn);

    cancelBtn = document.createElement("button");
    cancelBtn.textContent="Cancel";
    venuePopup.appendChild(cancelBtn);

    // --- Settings
    cogBtn = document.createElement("button");
    cogBtn.textContent="⚙";
    panel.appendChild(cogBtn);

    settingsPopup = document.createElement("div");
    settingsPopup.style.display="none";
    document.body.appendChild(settingsPopup);

    // --- Settings Controls

    // Container for the controls
    let fontRow = document.createElement("div");
    applyStyles(fontRow, {
        display: "flex",
        justifyContent: "space-between", // label left, input right
        alignItems: "center", // vertical alignment
        margin: "4px"
        });

    let headerRow = document.createElement("div");

    applyStyles(headerRow, {
        display: "flex",
        justifyContent: "space-between", // label left, input right
        alignItems: "center", // vertical alignment
        margin: "4px"
        });

    let themeRow = document.createElement("div");
    applyStyles(themeRow, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "4px"
    })

    let bbcodeLayoutRow = document.createElement("div");
    applyStyles(bbcodeLayoutRow, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "4px"
    })

    let highlightRow = document.createElement("div");
    applyStyles(highlightRow, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "4px"
    })

    let presetRow = document.createElement("div");
    applyStyles(presetRow, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "4px"
    })

    // Create the labels
    const fontLabel = document.createElement("span");
    fontLabel.textContent = "Font size:";
    applyStyles(fontLabel, {
        display: "inline-block", // ensures width behaves predictably
        textAlign: "left",
    });

    headerLabel = document.createElement("span");
    headerLabel.textContent = "Category Headers:";
    applyStyles(headerLabel, {
        display: "inline-block",
        textAlign: "left",
    });

    const themeLabel = document.createElement("span");
    themeLabel.textContent = "Theme:";
    applyStyles(themeLabel, {
        display: "inline-block",
        textAlign: "left",
    });

    const layoutLabel = document.createElement("span");
    layoutLabel.textContent = "BBCode Layout:";
        applyStyles(layoutLabel, {
        display: "inline-block",
        textAlign: "left",
    });

    const highlightLabel = document.createElement("span");
    highlightLabel.textContent = "Highlight Drops:";
    applyStyles(highlightLabel, {
            display: "inline-block",
            textAlign: "left",
        });

    const highlightPresetLabel = document.createElement("span");
    highlightPresetLabel.textContent = "Highlight Preset:";
    applyStyles(highlightPresetLabel, {
            display: "inline-block",
            textAlign: "left",
        });

    // Create the input
    fontInput = document.createElement("input");
    fontInput.type = "number";
    fontInput.value = fontSize;
    fontInput.min = 8;
    fontInput.max = 24;
    // fontInput.style.width = "50px"; // static width
    // fontInput.style.textAlign = "center";
    fontInput.onchange = () => {
    fontSize = parseInt(fontInput.value);
    localStorage.setItem("fr_coli_fontSize", fontSize);
        const wasOpen = settingsPopup.style.display === "block"; // remember state
        updateUI();
        if (wasOpen) settingsPopup.style.display = "block"; // restore open state
    };

    const highlightSelect = document.createElement("select");
    ["off","duplicate","exclusive"].forEach(mode => {
        const opt = document.createElement("option");
        opt.value = mode;
        opt.textContent = mode === "off" ? "Off" : mode === "duplicate" ? "Duplicate" : "Exclusive";
        if (mode === highlightMode) opt.selected = true;
        highlightSelect.appendChild(opt);
    });
    highlightSelect.onchange = () => {
        highlightMode = highlightSelect.value;
        localStorage.setItem("fr_coli_highlightMode", highlightMode);
        // if user turned highlights off while activeCategory is Highlights, reset activeCategory
        if (highlightMode === "off" && activeCategory === "Highlights") activeCategory = "All";
        updateUI();
    };

   // Append label and input to the row
    fontRow.appendChild(fontLabel);
    fontRow.appendChild(fontInput);

    // Append the row to settingsPopup
    settingsPopup.appendChild(fontRow);
    settingsPopup.appendChild(themeRow);

    themeBtn = document.createElement("select");
    // themeBtn.textContent="Toggle Theme";

    ["dark", "light"].forEach(mode => {
        const opt = document.createElement("option");
        opt.value = mode;
        opt.textContent =
            mode === "dark" ? "Dark" :
            mode === "light" ? "Light" :
            "None";
            if (mode === themeMode) opt.selected = true;
            themeBtn.appendChild(opt);
    })

    themeBtn.onchange = ()=>{
        themeMode = themeBtn.value;
        localStorage.setItem("fr_coli_theme",themeMode);
        updateUI();
    };

    themeRow.appendChild(themeLabel);
    themeRow.appendChild(themeBtn);

    headerSelect = document.createElement("select");
    ["always", "all", "none"].forEach(mode => {
        const opt = document.createElement("option");
        opt.value = mode;
        opt.textContent =
            mode === "always" ? "Always" :
            mode === "all" ? "All Only" :
            "None";
            if (mode === headerMode) opt.selected = true;
            headerSelect.appendChild(opt);
    })

    headerSelect.onchange = () => {
        headerMode = headerSelect.value;
        localStorage.setItem("fr_coli_headerMode", headerMode);
        updateUI();
    };

    let layoutSelect = document.createElement("select");
    ["lines","block","columns", "plain"].forEach(mode => {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent =
        mode === "lines" ? "One per line" :
        mode === "block" ? "Block" :
        mode === "columns" ? "Columns" :
        "Plaintext";
    if (mode === bbcodeLayout) opt.selected = true;
    layoutSelect.appendChild(opt);
    });

    layoutSelect.onchange = () => {
        bbcodeLayout = layoutSelect.value;
        localStorage.setItem("fr_coli_bbcodeLayout", bbcodeLayout);
        updateUI();
    };

    headerRow.appendChild(headerLabel);
    headerRow.appendChild(headerSelect);

    settingsPopup.appendChild(headerRow);

    bbcodeLayoutRow.appendChild(layoutLabel);
    bbcodeLayoutRow.appendChild(layoutSelect)
    settingsPopup.appendChild(bbcodeLayoutRow);

    // import / reset buttons and group for alignment
    const buttonGroup = document.createElement("div");
        applyStyles(buttonGroup, {
        width: "120px",
        margin: "2px",
        display: "flex",
        gap: "6px",
        justifyContent: "flex-end",
        flexWrap: "wrap"
    });

    const importPresetBtn = document.createElement("button");
    importPresetBtn.textContent = "Import";
    importPresetBtn.onclick = importHighlightPreset;

    const resetPresetBtn = document.createElement("button");
    resetPresetBtn.textContent = "Reset";
    resetPresetBtn.onclick = resetHighlightPreset;

    highlightRow.appendChild(highlightLabel);
    highlightRow.appendChild(highlightSelect);

    presetRow.appendChild(highlightPresetLabel);
    buttonGroup.appendChild(importPresetBtn);
    buttonGroup.appendChild(resetPresetBtn);
    presetRow.appendChild(buttonGroup);

    settingsPopup.appendChild(highlightRow);
    settingsPopup.appendChild(presetRow);

    // export button

    exportJSONBtn = document.createElement("button");
    exportJSONBtn.textContent="Export JSON";
    exportJSONBtn.onclick=exportJSON;

    exportCSVBtn = document.createElement("button");
    exportCSVBtn.textContent="Export CSV";
    exportCSVBtn.onclick=exportCSV;

    settingsPopup.appendChild(document.createElement("br"));
    settingsPopup.appendChild(exportJSONBtn);
    settingsPopup.appendChild(exportCSVBtn);


    // --- Loot area
    lootArea = document.createElement("div");
    panel.appendChild(lootArea);

    const header = document.createElement("div");
    lootArea.appendChild(header);

    // BBCode Textarea
    bbTextarea = document.createElement("textarea");
    lootArea.appendChild(bbTextarea);

    sortSelect = document.createElement("select");
    lootArea.appendChild(sortSelect);

    catSelect=document.createElement("select");
    lootArea.appendChild(catSelect);

    const maxPanelHeight = 550;
    bbTextarea.addEventListener("input", () => {
        const bbHeight = bbTextarea.scrollHeight + 10;
        panel.style.height = Math.min(bbHeight + 150, maxPanelHeight) + "px";
    });

    let resetRow = document.createElement("div");

    resetBtn = document.createElement("button");
    resetBtn.textContent="Reset Venue";

    resetAllBtn=document.createElement("button");
    resetAllBtn.textContent="Reset All";

    resetRow.appendChild(resetBtn);
    resetRow.appendChild(resetAllBtn);
    lootArea.appendChild(resetRow);

    // Overview Toggle
    overviewToggle=document.createElement("button");
    overviewToggle.textContent=overviewVisible?"Hide Overview":"Show Overview";
    lootArea.appendChild(overviewToggle);

    let overviewContainer = document.createElement("div");
    lootArea.appendChild(overviewContainer);

    // Sorting

    sortSelect.onchange=()=>{
        sortMode=sortSelect.value;
        localStorage.setItem("fr_coli_sortMode",sortMode);
        updateUI();
    };

    catSelect.onchange=()=>{
        activeCategory=catSelect.value;
        localStorage.setItem("fr_coli_category",activeCategory);
        updateUI();
    };

// Styling templates

    const masterButtonStyle = () => {
        return {
            borderRadius: "10px",
            margin: "2px",
            padding: "4px 6px",
            cursor: "pointer",
            flex: "1 100%",
            };
        };

    const masterPanelStyle = () => {
        return {
            padding:"10px",
            borderRadius:"10px",
            zIndex:9999,
            };
        };

    function buttonthemeStyle(theme, fontSize){
        return {
            background: theme.bg,
            color: theme.text,
            border: "2px solid " + theme.border,
            fontSize: fontSize + "px",
            }
    };

    function panelthemeStyle(theme, fontSize){
        return {
            background: theme.bg,
            color: theme.text,
            fontSize: fontSize + "px",
            }

    };

    applyStyles(cogBtn, masterButtonStyle(), {
        position:"absolute",
        top:"5px",
        right:"5px",
        margin: "6px",
        fontSize: "10px",
    });

    applyStyles(switchBtn, masterButtonStyle(), {
        marginLeft: "10px",
        marginBottom: "10px",
    });

    applyStyles(toggleBtn, masterButtonStyle(), {
                position: "fixed",
                right: "30px",
                top: "30px",
                fontSize: "12px",
        });

    applyStyles(panel, masterPanelStyle(), {
        width:"360px",
        maxHeight:"80%",
        overflowY:"auto",
        position: "fixed",
        right: "10px",
        boxSizing: "border-box",
        top: (toggleBtn.getBoundingClientRect().bottom + 10) + "px",
    });

    applyStyles(venuePopup, masterPanelStyle(), {
        position: "fixed",
        right: "10px",
        zIndex: 10000,
        display:"none",
        width: "360px",
        boxSizing: "border-box",
    });

    applyStyles(settingsPopup, masterPanelStyle(), {
        position: "fixed",
        right: "10px",
        zIndex: 10000,
        display:"none",
        width: "360px",
        boxSizing: "border-box",
    });

    applyStyles(confirmBtn, masterButtonStyle());
    applyStyles(cancelBtn, masterButtonStyle());
    applyStyles(venueSelect, masterButtonStyle(), {
        padding: "3px 6px"
    });

    applyStyles(themeBtn, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
        padding: "3px 6px",
    });

    applyStyles(headerSelect, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
        padding: "3px 6px",
    });

    applyStyles(highlightSelect, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
        padding: "3px 6px",
    });

    applyStyles(fontInput, masterButtonStyle(), {
        maxWidth: "104px",
        textAlign: "center",
    });

    applyStyles(layoutSelect, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
        padding: "3px 6px",
    });

    applyStyles(exportCSVBtn, masterButtonStyle());
    applyStyles(exportJSONBtn, masterButtonStyle());

    applyStyles(importPresetBtn, masterButtonStyle(), {
        margin: "0px",
        width: "100%"
    });
    applyStyles(resetPresetBtn, masterButtonStyle(), {
        margin: "0px",
        width: "100%"
    });

    applyStyles(bbTextarea, masterPanelStyle(), {
        width: "100%",
        height:"120px",
        resize: "vertical",
        overflowX: "hidden",
        boxSizing: "border-box",
        marginBottom: "5px"
    });

    applyStyles(sortSelect, masterButtonStyle(), {
    padding: "3px 6px"
    });
    applyStyles(catSelect, masterButtonStyle(), {
    padding: "3px 6px"
    });

    applyStyles(resetRow,{
            display:"flex",
            gap:"2px",
            border:"none",
            marginTop: "6px",
            marginBottom: "6px",
        });


    applyStyles(resetBtn, masterButtonStyle());
    applyStyles(resetAllBtn, masterButtonStyle());
    applyStyles(overviewToggle, masterButtonStyle());

    // buttons do be buttoning

    resetBtn.onclick=()=>{
        if(confirm(`Reset ${currentVenue}?`)){ saveVenueData(currentVenue,{battleCount:0,loot:{}}); updateUI(); }
    };


    resetAllBtn.onclick=()=>{
        if(confirm("Reset ALL?")){ venues.forEach(v=>saveVenueData(v,{battleCount:0,loot:{}})); updateUI(); }
    };

switchBtn.onclick = () => {
        const isOpen = venuePopup.style.display === "block";
        closeAllPopups(); // close others before toggling
        venuePopup.style.display = isOpen ? "none" : "block";
    };


    confirmBtn.onclick=()=>{
        currentVenue=venueSelect.value;
        localStorage.setItem("fr_coli_currentVenue",currentVenue);
        venueSpan.textContent=currentVenue;
        venuePopup.style.display="none";
        updateUI();
    };

    cancelBtn.onclick=()=>{
        venuePopup.style.display="none";
    };

    cogBtn.onclick = () => {
        const isOpen = settingsPopup.style.display === "block";
        closeAllPopups(); // close others before toggling
        settingsPopup.style.display = isOpen ? "none" : "block";
    };


// --- Overview
    overviewToggle.onclick=()=>{ overviewVisible=!overviewVisible; updateUI(); };

// --- Update UI
    updateUI = function(){
        const theme = getThemeColors();
        const data = getCurrentData();

        // Panel & Settings dynamic Styling

        applyStyles(toggleBtn, buttonthemeStyle(theme, fontSize),);

        applyStyles(panel, panelthemeStyle(theme, fontSize),{
            background: theme.bg.replace("rgb", "rgba").replace(")", ",0.75)"),
        });

        applyStyles(cogBtn, buttonthemeStyle(theme, fontSize),);

        applyStyles(venuePopup, panelthemeStyle(theme, fontSize), {
            top: switchBtn.getBoundingClientRect().bottom + 5 + "px",
            border: "2px solid " + theme.border,
        });
        applyStyles(settingsPopup, panelthemeStyle(theme, fontSize), {
            top: cogBtn.getBoundingClientRect().bottom + 5 + "px",
            border: "2px solid " + theme.border,
        });
        applyStyles(bbTextarea, panelthemeStyle(theme, fontSize),);

        applyStyles(venueSpan, {
            fontSize: (fontSize - 2) + "px"
        });

        applyStyles(venueLabel, {
            fontSize: (fontSize - 2) + "px"
        });

        applyStyles(switchBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(confirmBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(cancelBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(venueSelect, buttonthemeStyle(theme, fontSize),);

        applyStyles(themeBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(headerSelect, buttonthemeStyle(theme, fontSize),);
        applyStyles(highlightSelect, buttonthemeStyle(theme, fontSize),);
        applyStyles(fontInput, buttonthemeStyle(theme, fontSize),);
        applyStyles(exportCSVBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(exportJSONBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(importPresetBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(resetPresetBtn, buttonthemeStyle(theme, fontSize),);

        applyStyles(sortSelect, buttonthemeStyle(theme, fontSize),);
        applyStyles(catSelect, buttonthemeStyle(theme, fontSize),);
        applyStyles(layoutSelect, buttonthemeStyle(theme, fontSize),);

        applyStyles(resetBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(resetAllBtn, buttonthemeStyle(theme, fontSize),);

        applyStyles(overviewToggle, buttonthemeStyle(theme, fontSize),);

        header.innerHTML=`<b>${currentVenue} — Coliseum Tracker</b><br>Wins: ${data.battleCount}<br><br>`;
        bbTextarea.value=formatLootAsBBCode(data.loot,activeCategory,sortMode);

        // Sorting & Category
        sortSelect.innerHTML = "";
        ["name", "id", "amount", "category-name", "category-id", "category-amount"].forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent =
                s === "name" ? "Sort A–Z" :
                s === "id" ? "Sort by ID" :
                s === "amount" ? "Sort by Amount" :
                s === "category-name" ? "Category + A–Z" :
                s === "category-id" ? "Category + ID" :
                "Category + Amount";
            if (s === sortMode) opt.selected = true;
            sortSelect.appendChild(opt);
        });

        sortSelect.value = sortMode;

        // --- Build category dropdown (with Highlights dynamic logic)
        catSelect.innerHTML = "";

        // if highlights are off but user still has "Highlights" active, reset to "All"
        if (highlightMode === "off" && activeCategory === "Highlights") {
            activeCategory = "All";
            localStorage.setItem("fr_coli_category", activeCategory);
        }

        // compute displayed categories
        const displayedCategories = (() => {
            const base = [...categories];
            if (highlightMode === "off") {
                return base;
            } else {
                const rest = base.slice(1);
                return ["All", "Highlights", ...rest];
            }
        })();

        // populate dropdown
        displayedCategories.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            if (c === activeCategory) opt.selected = true;
            catSelect.appendChild(opt);
        });


        // Overview Toggle
        overviewContainer.innerHTML = "";
        if(overviewVisible){
            const overviewDiv = document.createElement("div");
            applyStyles(overviewDiv,{
                display:"grid",
                gridTemplateColumns:"1fr 1fr",
                gap:"2px",
                margin: "5px 2px 2px 2px",
            });
            Object.keys(data.loot).forEach(id=>{
                const entry=itemIndex[id]; const name=entry?.name||id;
                const cell=document.createElement("div");
                applyStyles(cell,{
                    border:"1px solid "+theme.border,
                    borderRadius:"6px",
                    padding:"2px",
                    fontSize:fontSize - 2 + "px",})
                ;
                cell.textContent=`${name}: x${data.loot[id]}`;
                overviewDiv.appendChild(cell);
            });
            overviewContainer.appendChild(overviewDiv);
        }
    }
    updateUI();

})
})();
