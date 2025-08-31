// ==UserScript==
// @name         Flight Rising Coliseum Tracker v1.0
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Coliseum tracker with BBCode, categories, sorting, and overview grid. ItemIndex loaded externally.
// @match        https://www1.flightrising.com/*
// @match        https://flightrising.com/main.php?p=battle*
// @grant        none
// @run-at       document-start
// @require      https://raw.githubusercontent.com/gremlincache/fr-coliseum-tracker/refs/heads/main/itemIndex.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Venues ---
    const venues = [
        "Training Fields","Woodland Path","Scorched Forest","Boneyard","Sandswept Delta",
        "Silk-Strewn Wreckage","Blooming Grove","Forgotten Cave","Bamboo Falls","Thunderhead Savanna",
        "Redrock Cove","Waterway","Arena","Volcanic Vents","Rainsong Jungle","Boreal Wood",
        "Crystal Pools","Harpy's Roost","Ghostlight Ruins","Mire","Kelp Beds","Construct Workshop","Forbidden Portal"
    ];

    // --- Categories ---
    const categories = ["All","Food","Materials","Apparel","Familiars","Battle","Skins","Specialty","Other"];

    // --- State ---
    let currentVenue = localStorage.getItem("fr_coli_currentVenue") || venues[0];
    let activeCategory = localStorage.getItem("fr_coli_category") || "All";
    let overviewVisible = false;
    let sortMode = localStorage.getItem("fr_coli_sortMode") || "name"; // "name" or "id"

    function getVenueData(venue) {
        return JSON.parse(localStorage.getItem(`fr_coli_data_${venue}`) || '{"battleCount":0,"loot":{}}');
    }

    function saveVenueData(venue, data) {
        localStorage.setItem(`fr_coli_data_${venue}`, JSON.stringify(data));
    }

    // --- UI Setup ---
    const panel = document.createElement("div");
    Object.assign(panel.style, {
        position:"fixed", top:"60px", right:"20px", width:"360px", maxHeight:"550px",
        overflowY:"auto", background:"rgba(31,29,29,0.75)", color:"rgba(233,233,233,1)",
        padding:"10px", borderRadius:"10px", fontSize:"12px", zIndex:9999, display:"none"
    });
    document.body.appendChild(panel);

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Coliseum Tracker";
    Object.assign(toggleBtn.style, {
        position:"fixed", top:"20px", right:"20px", background:"rgba(31,29,29,0.75)",
        color:"rgba(233,233,233,1)", zIndex:9999, padding:"5px 10px",
        borderRadius:"10px", cursor:"pointer", border:"2px solid rgb(210,210,210)"
    });
    toggleBtn.onclick = () => { panel.style.display = (panel.style.display === "none" ? "block" : "none"); };
    document.body.appendChild(toggleBtn);

    const currentVenueDisplay = document.createElement("span");
    currentVenueDisplay.textContent = currentVenue;
    panel.appendChild(document.createTextNode("Current Venue: "));
    panel.appendChild(currentVenueDisplay);

    const switchBtn = document.createElement("button");
    switchBtn.textContent = "Switch Venue";
    Object.assign(switchBtn.style, {
        marginLeft:"10px", marginBottom:"10px", color:"rgba(233,233,233,1)",
        background:"rgb(31,29,29)", padding:"3px 6px", borderRadius:"10px",
        border:"2px solid rgb(0,0,0)", cursor:"pointer", fontSize:"11px"
    });
    panel.appendChild(switchBtn);

    const venuePopup = document.createElement("div");
    Object.assign(venuePopup.style, {
        display:"none", position:"absolute", background:"rgba(50,50,50,0.95)",
        padding:"10px", borderRadius:"10px", border:"2px solid rgb(0,0,0)",
        top:"30px", left:"30px"
    });
    panel.appendChild(venuePopup);

    const venueSelectPopup = document.createElement("select");
    Object.assign(venueSelectPopup.style,{borderRadius:"5px", padding:"2px", background:"rgb(31,29,29)", color:"rgb(233,233,233)"});
    venues.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v; opt.textContent = v;
        if(v === currentVenue) opt.selected = true;
        venueSelectPopup.appendChild(opt);
    });
    venuePopup.appendChild(venueSelectPopup);

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    Object.assign(confirmBtn.style,{marginLeft:"4px", borderRadius:"10px", background:"rgb(31,29,29)", color:"rgb(233,233,233)", padding:"5px", border:"2px solid rgb(0,0,0)"});
    confirmBtn.onclick = () => { currentVenue = venueSelectPopup.value; localStorage.setItem("fr_coli_currentVenue", currentVenue); currentVenueDisplay.textContent = currentVenue; venuePopup.style.display="none"; updateUI(); };
    venuePopup.appendChild(confirmBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    Object.assign(cancelBtn.style,{marginLeft:"5px", borderRadius:"10px", background:"rgb(31,29,29)", color:"rgb(233,233,233)", padding:"5px", border:"2px solid rgb(0,0,0)"});
    cancelBtn.onclick = () => { venuePopup.style.display = "none"; };
    switchBtn.onclick = () => { venuePopup.style.display = "block"; };

    const lootArea = document.createElement("div");
    panel.appendChild(lootArea);

    function getCurrentData() { return getVenueData(currentVenue); }

    function formatLootAsBBCode(loot, categoryFilter, sortBy) {
        const entries = Object.keys(loot).map(id => ({id, amount:loot[id]}));
        if(sortBy === "name") {
            entries.sort((a,b) => {
                const aName = window.itemIndex?.[a.id]?.name || a.id;
                const bName = window.itemIndex?.[b.id]?.name || b.id;
                return aName.localeCompare(bName);
            });
        } else {
            entries.sort((a,b) => a.id - b.id);
        }
        return entries
            .filter(e => categoryFilter === "All" || window.itemIndex?.[e.id]?.category === categoryFilter)
            .map(e => {
                const entry = window.itemIndex?.[e.id];
                if(entry?.category === "Skins") return `[skin=${e.id}] x${e.amount}`;
                if(!entry?.name) return `[gamedb item=${e.id}] x${e.amount}`;
                return `[item=${entry.name}] x${e.amount}`;
            }).join("\n");
    }

    function updateUI() {
        const data = getCurrentData();
        lootArea.innerHTML = "";

        const header = document.createElement("div");
        header.innerHTML = `<b>${currentVenue} — Coliseum Tracker</b><br>Wins: ${data.battleCount}<br><br>`;
        lootArea.appendChild(header);

        const bbTextarea = document.createElement("textarea");
        bbTextarea.style.width = "100%"; bbTextarea.style.height = "120px"; bbTextarea.style.backgroundColor = "rgb(31,29,29)"; bbTextarea.style.color = "rgb(233,233,233)";
        bbTextarea.value = formatLootAsBBCode(data.loot, activeCategory, sortMode);
        lootArea.appendChild(bbTextarea);

        const sortSelect = document.createElement("select");
        ["name","id"].forEach(s => {
            const opt = document.createElement("option");
            opt.value = s; opt.textContent = s==="name"?"Sort A-Z":"Sort by ID";
            if(s===sortMode) opt.selected = true;
            sortSelect.appendChild(opt);
        });
        sortSelect.onchange = () => { sortMode = sortSelect.value; localStorage.setItem("fr_coli_sortMode", sortMode); updateUI(); };
        lootArea.appendChild(sortSelect);

        const catSelect = document.createElement("select");
        categories.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c; opt.textContent = c;
            if(c===activeCategory) opt.selected = true;
            catSelect.appendChild(opt);
        });
        catSelect.onchange = () => { activeCategory = catSelect.value; localStorage.setItem("fr_coli_category", activeCategory); updateUI(); };
        lootArea.appendChild(catSelect);

        const buttonRow1 = document.createElement("div"); Object.assign(buttonRow1.style,{display:"flex", gap:"5px", marginTop:"5px"});
        const resetBtn = document.createElement("button"); resetBtn.textContent="Reset Venue"; resetBtn.style.flex="1";
        resetBtn.onclick = () => { if(confirm(`Reset data for ${currentVenue}?`)){saveVenueData(currentVenue,{battleCount:0,loot:{}}); updateUI();} };
        const resetAllBtn = document.createElement("button"); resetAllBtn.textContent="Reset All"; resetAllBtn.style.flex="1";
        resetAllBtn.onclick = () => { if(confirm("Reset ALL venue data?")){venues.forEach(v=>saveVenueData(v,{battleCount:0,loot:{}})); updateUI();} };
        buttonRow1.appendChild(resetBtn); buttonRow1.appendChild(resetAllBtn); lootArea.appendChild(buttonRow1);

        const buttonRow2 = document.createElement("div"); Object.assign(buttonRow2.style,{display:"flex", gap:"5px", marginTop:"5px"});
        const exportJSONBtn = document.createElement("button"); exportJSONBtn.textContent="Export JSON"; exportJSONBtn.style.flex="1";
        exportJSONBtn.onclick = () => {
            const allData = {};
            venues.forEach(v => { allData[v] = getVenueData(v); });
            const blob = new Blob([JSON.stringify(allData,null,2)],{type:"application/json"});
            const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="FR_Coliseum_Data.json"; a.click(); URL.revokeObjectURL(url);
        };
        const exportCSVBtn = document.createElement("button"); exportCSVBtn.textContent="Export CSV"; exportCSVBtn.style.flex="1";
        exportCSVBtn.onclick = () => {
            let csv="Venue,Wins,LootID,Amount\n";
            venues.forEach(v=>{
                const d=getVenueData(v);
                Object.keys(d.loot).forEach(id=>{csv+=`"${v}",${d.battleCount},${id},${d.loot[id]}\n`;});
            });
            const blob = new Blob([csv],{type:"text/csv"});
            const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="FR_Coliseum_Data.csv"; a.click(); URL.revokeObjectURL(url);
        };
        buttonRow2.appendChild(exportJSONBtn); buttonRow2.appendChild(exportCSVBtn); lootArea.appendChild(buttonRow2);

        const overviewToggle = document.createElement("button"); overviewToggle.textContent = overviewVisible?"Hide Overview":"Show Overview"; overviewToggle.style.marginTop="5px";
        overviewToggle.onclick = () => { overviewVisible = !overviewVisible; updateUI(); };
        lootArea.appendChild(overviewToggle);

        if(overviewVisible){
            const overviewDiv = document.createElement("div");
            Object.assign(overviewDiv.style,{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:"4px", marginTop:"5px", fontSize:"10px"});
            Object.keys(data.loot).forEach(id=>{
                const entry = window.itemIndex?.[id]; const name = entry?.name || id;
                const cell = document.createElement("div"); Object.assign(cell.style,{border:"1px solid rgb(80,80,80)", borderRadius:"6px", padding:"2px"});
                cell.textContent = `${name}: ${data.loot[id]}`;
                overviewDiv.appendChild(cell);
            });
            lootArea.appendChild(overviewDiv);
        }
    }

    // --- WebSocket Patch ---
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url,...rest){
        const ws = new OriginalWebSocket(url,...rest);
        if(url.includes("/battle")){
            ws.addEventListener("message", event=>{
                try{
                    const jsonData = JSON.parse(event.data.slice(event.data.indexOf("[")));
                    if(Array.isArray(jsonData) && jsonData[1] && jsonData[1][0]==="P1_WIN"){
                        const venueData = getCurrentData();
                        const drops = jsonData[1][2];
                        venueData.battleCount++;
                        drops.forEach(([id,,amount])=>{ venueData.loot[id]=(venueData.loot[id]||0)+amount; });
                        saveVenueData(currentVenue,venueData); updateUI();
                    }
                }catch{}
            });
        }
        return ws;
    };

    // --- Init ---
    updateUI();

})();
