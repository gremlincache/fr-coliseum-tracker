// ==UserScript==
// @name         Flight Rising Coliseum Tracker
// @namespace    https://tampermonkey.net/
// @version      1.2
// @description  Coliseum tracker with BBCode, categories, sorting, overview, dark and light theme and font sizes.
// @match        https://flightrising.com/main.php?*
// @grant        none
// @run-at       document-start
// @require      https://raw.githubusercontent.com/gremlincache/fr-coliseum-tracker/refs/heads/main/itemIndex.js
// @updateURL    https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js
// @downloadURL  https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- External itemIndex
    const itemIndex = window.itemIndex;

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

    // --- Helpers
    const applyStyles = (el, baseStyles, overrides = {}) => {
        Object.assign(el.style, {...baseStyles, ...overrides});
    };

    // --- Format BBCode
function formatLootAsBBCode(loot, categoryFilter, sortBy) {
    const entries = Object.keys(loot).map(id => {
        const entry = itemIndex[id];
        return {
            id,
            amount: loot[id],
            name: entry?.name || id,
            category: entry?.category || "Other"
        };
    });

    // --- Sorting
    function categoryOrder(cat) {
        const idx = categories.indexOf(cat);
        return idx === -1 ? categories.length : idx; // unknown cats go last
    }

    if (sortBy === "name") {
        entries.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "id") {
        entries.sort((a, b) => a.id - b.id);
    } else if (sortBy === "category-name") {
        entries.sort((a, b) => {
            const catOrder = categoryOrder(a.category) - categoryOrder(b.category);
            if (catOrder !== 0) return catOrder;
            return a.name.localeCompare(b.name);
        });
    } else if (sortBy === "category-id") {
        entries.sort((a, b) => {
            const catOrder = categoryOrder(a.category) - categoryOrder(b.category);
            if (catOrder !== 0) return catOrder;
            return a.id - b.id;
        });
    }

    // --- Filtering
    const filtered = entries.filter(e =>
        categoryFilter === "All" || e.category === categoryFilter
    );

    // --- Helper to format one entry
    function formatEntry(e) {
        if (e.category === "Skins") return `[skin=${e.id}] x${e.amount}`;
        if (!itemIndex[e.id]?.name) return `[gamedb item=${e.id}] x${e.amount}`;
        return `[item=${e.name}] x${e.amount}`;
    }

    // --- If not sorting by category, output flat list (no headers)
    if (sortBy === "name" || sortBy === "id") {
        const formatted = filtered.map(formatEntry);

        if (bbcodeLayout === "lines") {
            return formatted.join("\n");
        } else if (bbcodeLayout === "block") {
            return formatted.join(" ");
        } else if (bbcodeLayout === "columns") {
            let output = "[columns]\n";
            formatted.forEach((item, i) => {
                const [base, amount] = item.split(" x");
                output += `${base}\n x${amount}`;
                if ((i + 1) % 6 === 0) {
                    output += "\n[/columns]\n[columns]\n"; // close & reopen
                } else {
                    output += "\n[nextcol]\n";
                }
            });
            if (!output.endsWith("[/columns]")) {
                output += "[/columns]";
            }
            return output;
        }
    }

    // --- If sorting by category, build grouped sections
    let result = "";
    let currentCat = null;
    let currentGroup = [];

    function flushGroup() {
        if (currentGroup.length === 0) return;
        const formatted = currentGroup.map(formatEntry);

        if (bbcodeLayout === "lines") {
            result += formatted.join("\n") + "\n";
        } else if (bbcodeLayout === "block") {
            result += formatted.join(" ") + "\n";
        } else if (bbcodeLayout === "columns") {
            let colBlock = "[columns][center]\n";
            formatted.forEach((item, i) => {
                const [base, amount] = item.split(" x");
                colBlock += `${base}\n x${amount}`;
                if ((i + 1) % 6 === 0) {
                    colBlock += "\n[/columns]\n[columns][center]\n";
                } else {
                    colBlock += "\n[nextcol][center]\n";
                }
            });
            if (!colBlock.endsWith("[/columns]")) {
                colBlock += "[/columns]";
            }
            result += colBlock + "\n";
        }

        currentGroup = [];
    }

    filtered.forEach(e => {
        if (e.category !== currentCat) {
            // flush previous group
            flushGroup();

            currentCat = e.category;

            // --- Header logic
            if (
                headerMode === "always" ||                    // Always add header
                (headerMode === "all" && categoryFilter === "All") // Only add if viewing ALL
            ) {
                result += `\n[b]${currentCat}[/b]\n`;
            }
        }
        currentGroup.push(e);
    });

    flushGroup(); // flush last

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

    // --- WebSocket Patch
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

    // --- UpdateUI declaring
    let updateUI;

    // --- DOM ready function
    function ready(fn) {
            if (document.readyState !== "loading") fn();
            else document.addEventListener("DOMContentLoaded", fn);
    }

    // --- Declare UI elements outside of Ready
        // --- Main panel
    let panel, toggleBtn, lootArea, switchBtn, venuePopup, venueSpan, venueLabel, confirmBtn, cancelBtn, venueSelect, bbTextarea, sortSelect, catSelect, resetAllBtn, resetBtn, overviewToggle;
        // --- Settings panel
    let cogBtn, settingsPopup, fontInput, themeBtn, exportCSVBtn, exportJSONBtn, headerLabel, headerSelect;

    ready(() => {

        // --- Toggle button
    toggleBtn = document.createElement("button");
    toggleBtn.textContent="Coliseum Tracker";

    document.body.appendChild(toggleBtn);

    toggleBtn.onclick = ()=>{ panel.style.display = panel.style.display==="none"?"block":"none"; };

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
        themeMode = themeMode==="dark"?"light":"dark";
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
    ["lines","block","columns"].forEach(mode => {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent =
        mode === "lines" ? "One per line" :
        mode === "block" ? "Block" :
        "Columns";
    if (mode === bbcodeLayout) opt.selected = true;
    layoutSelect.appendChild(opt);
    });
    layoutSelect.onchange = () => {
    bbcodeLayout = layoutSelect.value;
    localStorage.setItem("fr_coli_bbcodeLayout", bbcodeLayout);
    updateUI();
    };
    settingsPopup.appendChild(layoutSelect);

    headerRow.appendChild(headerLabel);
    headerRow.appendChild(headerSelect);

    settingsPopup.appendChild(headerRow);

    bbcodeLayoutRow.appendChild(layoutLabel);
    bbcodeLayoutRow.appendChild(layoutSelect)
    settingsPopup.appendChild(bbcodeLayoutRow);


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
            padding: "3px 6px",
            cursor: "pointer",
            flex: 1
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
    applyStyles(venueSelect, masterButtonStyle());

    applyStyles(themeBtn, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
    });

    applyStyles(headerSelect, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
    });
    applyStyles(fontInput, masterButtonStyle(), {
        maxWidth: "104px",
        textAlign: "center",
    });

    applyStyles(layoutSelect, masterButtonStyle(), {
        maxWidth: "120px",
        textAlign: "center",
    });

    applyStyles(exportCSVBtn, masterButtonStyle());
    applyStyles(exportJSONBtn, masterButtonStyle());

    applyStyles(bbTextarea, masterPanelStyle(), {
        width: "100%",
        height:"120px",
        resize: "vertical",
        overflowX: "hidden",
        boxSizing: "border-box",
        marginBottom: "5px"
    });

    applyStyles(sortSelect, masterButtonStyle());
    applyStyles(catSelect, masterButtonStyle());

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
    if (venuePopup.style.display === "block") {
        // Popup is open => close it (like Cancel)
        venuePopup.style.display = "none";
    } else {
        // Popup is closed => open it
        venuePopup.style.display = "block";
    }
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

    cogBtn.onclick = ()=>{
        settingsPopup.style.display = settingsPopup.style.display==="none"?"block":"none";
    };

// --- Overview
    overviewToggle.onclick=()=>{ overviewVisible=!overviewVisible; updateUI(); };

// --- Update UI
    updateUI = function(){
        const theme = getThemeColors();
        const data = getCurrentData();

        // Panel & Settings dynamic Styling

        applyStyles(toggleBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(fontInput, buttonthemeStyle(theme, fontSize),);

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
        applyStyles(fontInput, buttonthemeStyle(theme, fontSize),);
        applyStyles(exportCSVBtn, buttonthemeStyle(theme, fontSize),);
        applyStyles(exportJSONBtn, buttonthemeStyle(theme, fontSize),);

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
        ["name", "id", "category-name", "category-id"].forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent =
                s === "name" ? "Sort A–Z" :
                s === "id" ? "Sort by ID" :
                s === "category-name" ? "Category + A–Z" :
                "Category + ID";
            if (s === sortMode) opt.selected = true;
            sortSelect.appendChild(opt);
        });

        sortSelect.value = sortMode;
        catSelect.value = activeCategory;

        catSelect.innerHTML = "";

        categories.forEach(c=>{
            const opt=document.createElement("option");
            opt.value=c;
            opt.textContent=c;
            if(c===activeCategory) opt.selected=true;
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
