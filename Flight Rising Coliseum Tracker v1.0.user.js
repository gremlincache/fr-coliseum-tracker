// ==UserScript==
// @name         Flight Rising Coliseum Tracker v1.0
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Coliseum tracker with BBCode, categories, sorting, overview, dark and light theme and font sizes.
// @match        https://flightrising.com/main.php?*
// @grant        none
// @run-at       document-start
// @require      https://raw.githubusercontent.com/gremlincache/fr-coliseum-tracker/refs/heads/main/itemIndex.js
// @updateURL    https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker%20v1.0.user.js
// @downloadURL  https://github.com/gremlincache/fr-coliseum-tracker/raw/refs/heads/main/Flight%20Rising%20Coliseum%20Tracker%20v1.0.user.js
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

    // --- State
    let currentVenue = localStorage.getItem("fr_coli_currentVenue") || venues[0];
    let activeCategory = localStorage.getItem("fr_coli_category") || "All";
    let sortMode = localStorage.getItem("fr_coli_sortMode") || "name";
    let overviewVisible = false;
    let fontSize = parseInt(localStorage.getItem("fr_coli_fontSize")) || 12;
    let themeMode = localStorage.getItem("fr_coli_theme") || "dark";

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

    // --- Toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent="Coliseum Tracker";

    document.body.appendChild(toggleBtn);

    toggleBtn.onclick = ()=>{ panel.style.display = panel.style.display==="none"?"block":"none"; };

        // --- Panel
    const panel = document.createElement("div");

    document.body.appendChild(panel);

        // --- Current Venue Display
    const venueSpan = document.createElement("span");
    venueSpan.textContent=currentVenue;

    const venueLabel = document.createElement("span");
    venueLabel.textContent="Current Venue: ";

    panel.appendChild(venueLabel);
    panel.appendChild(venueSpan);

    const switchBtn = document.createElement("button");
    switchBtn.textContent="Switch Venue";

    panel.appendChild(switchBtn);

    const venuePopup = document.createElement("div");

    document.body.appendChild(venuePopup);

    const venueSelect = document.createElement("select");

    venues.forEach(v=>{
        const opt=document.createElement("option");
        opt.value=v;
        opt.textContent=v;
        if(v===currentVenue) opt.selected=true;
        venueSelect.appendChild(opt);
    });

    venuePopup.appendChild(venueSelect);

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent="Confirm";
    confirmBtn.onclick=()=>{
        currentVenue=venueSelect.value;
        localStorage.setItem("fr_coli_currentVenue",currentVenue);
        venueSpan.textContent=currentVenue;
        venuePopup.style.display="none";
        updateUI();
    };

    venuePopup.appendChild(confirmBtn);

    const cancelBtn = document.createElement("button");

    cancelBtn.textContent="Cancel";
    cancelBtn.onclick=()=>{ venuePopup.style.display="none"; };

    venuePopup.appendChild(cancelBtn);

    switchBtn.onclick = () => {
    if (venuePopup.style.display === "block") {
        // Popup is open → close it (like Cancel)
        venuePopup.style.display = "none";
    } else {
        // Popup is closed → open it
        venuePopup.style.display = "block";
    }
};

    // --- Settings
    const cogBtn = document.createElement("button");
    cogBtn.textContent="⚙";

    panel.appendChild(cogBtn);

    const settingsPopup = document.createElement("div");
    settingsPopup.style.display="none";

    document.body.appendChild(settingsPopup);

    cogBtn.onclick = ()=>{
        settingsPopup.style.display = settingsPopup.style.display==="none"?"block":"none";
    };

    // --- Settings Controls

    // Container for the font size control
    const fontRow = document.createElement("div");
    applyStyles(fontRow, {
        display: "flex",
        justifyContent: "space-between", // label left, input right
        alignItems: "center", // vertical alignment
        margin: "4px"
        });

    // Create the label
    const fontLabel = document.createElement("label");
    fontLabel.textContent = "Font size:";
    applyStyles(fontLabel, {
        display: "inline-block", // ensures width behaves predictably
        textAlign: "left",
    });

    // Create the input
    const fontInput = document.createElement("input");
    fontInput.type = "number";
    fontInput.value = fontSize;
    fontInput.min = 8;
    fontInput.max = 24;
    fontInput.style.width = "50px"; // static width
    fontInput.style.textAlign = "center";
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

    const themeBtn = document.createElement("button");
    themeBtn.textContent="Toggle Theme";
    themeBtn.onclick = ()=>{
        themeMode = themeMode==="dark"?"light":"dark";
        localStorage.setItem("fr_coli_theme",themeMode);
        updateUI();
    };

    settingsPopup.appendChild(themeBtn);

    const exportJSONBtn = document.createElement("button");
    exportJSONBtn.textContent="Export JSON";
    exportJSONBtn.onclick=exportJSON;

    const exportCSVBtn = document.createElement("button");
    exportCSVBtn.textContent="Export CSV";
    exportCSVBtn.onclick=exportCSV;

    settingsPopup.appendChild(document.createElement("br"));
    settingsPopup.appendChild(exportJSONBtn);
    settingsPopup.appendChild(exportCSVBtn);


    // --- Loot area
    const lootArea = document.createElement("div");
    panel.appendChild(lootArea);

    // --- Format BBCode
    function formatLootAsBBCode(loot,categoryFilter,sortBy){
        const entries = Object.keys(loot).map(id=>({id,amount:loot[id]}));
        if(sortBy==="name"){
            entries.sort((a,b)=>{
                const aName=itemIndex[a.id]?.name||a.id;
                const bName=itemIndex[b.id]?.name||b.id;
                return aName.localeCompare(bName);
            });
        }
        else{ entries.sort((a,b)=>a.id-b.id); }
        return entries.filter(e=>categoryFilter==="All"||itemIndex[e.id]?.category===categoryFilter)
            .map(e=>{
                const entry=itemIndex[e.id];
                if(entry?.category==="Skins") return `[skin=${e.id}] x${e.amount}`;
                if(!entry?.name) return `[gamedb item=${e.id}] x${e.amount}`;
                return `[item=${entry.name}] x${e.amount}`;
            }).join("\n");
    }

    // --- Update UI
    function updateUI(){
        const theme = getThemeColors();
        const data = getCurrentData();

        // Panel & Settings Styling

        const masterButtonStyle = () => {
                return {
                    borderRadius: "10px",
                    background: theme.bg,
                    color: theme.text,
                    border: "2px solid " + theme.border,
                    margin: "2px",
                    padding: "3px 6px",
                    cursor: "pointer",
                    fontSize: fontSize + "px",
                    flex: 1
                };
            };

        const masterPanelStyle = () => {
            return {
                padding:"10px",
                borderRadius:"10px",
                zIndex:9999,
                background: theme.bg,
                color: theme.text,
                fontSize: fontSize + "px",
            };
        };

        applyStyles(toggleBtn, masterButtonStyle(), {
                position: "fixed",
                right: "30px",
                top: "30px",
                fontSize: "12px",
        });

        applyStyles(fontInput, {
                borderRadius: "5px",
                background: theme.bg,
                color: theme.text,
                fontSize: fontSize + "px",
                border: "2px solid " + theme.border,

            });

        applyStyles(panel, masterPanelStyle(), {
            background: theme.bg.replace("rgb","rgba").replace(") ",",0.75)"),
            width:"360px",
            maxHeight:"550px",
            overflowY:"auto",
            position: "fixed",
            right: "10px",
            boxSizing: "border-box",
            top: (toggleBtn.getBoundingClientRect().bottom + 10) + "px",
        });

        applyStyles(cogBtn, masterButtonStyle(), {
            position:"absolute",
            top:"5px",
            right:"5px",
            fontSize: "10px",
            margin: "6px",
        });

        applyStyles(switchBtn, masterButtonStyle(), {
            marginLeft: "10px",
            marginBottom: "10px",
        });

        const rect = switchBtn.getBoundingClientRect();

        applyStyles(venuePopup, masterPanelStyle(), {
            position: "fixed",
            top: rect.bottom + 5 + "px",
            right: "10px",
            zIndex: 10000,
            display:"none",
            width: "360px",
            boxSizing: "border-box",
            border: "2px solid " + theme.border
        });

        const rectCog = cogBtn.getBoundingClientRect();
         applyStyles(settingsPopup, masterPanelStyle(), {
            position: "fixed",
            top: rectCog.bottom + 5 + "px",
            right: "10px",
            zIndex: 10000,
            display:"none",
            width: "360px",
            boxSizing: "border-box",
            border: "2px solid " + theme.border
        });

        applyStyles(venueSpan, {
            fontSize: (fontSize - 2) + "px"
        });

        applyStyles(venueLabel, {
            fontSize: (fontSize - 2) + "px"
        });

        applyStyles(confirmBtn, masterButtonStyle());
        applyStyles(cancelBtn, masterButtonStyle());
        applyStyles(venueSelect, masterButtonStyle());

        applyStyles(themeBtn, masterButtonStyle());
        applyStyles(exportCSVBtn, masterButtonStyle());
        applyStyles(exportJSONBtn, masterButtonStyle());


        // Clear loot area
        lootArea.innerHTML="";

        const header = document.createElement("div");
        header.innerHTML=`<b>${currentVenue} — Coliseum Tracker</b><br>Wins: ${data.battleCount}<br><br>`;
        lootArea.appendChild(header);

        // BBCode Textarea
        const bbTextarea = document.createElement("textarea");
        bbTextarea.value=formatLootAsBBCode(data.loot,activeCategory,sortMode);

        applyStyles(bbTextarea, masterPanelStyle(), {
            width: "100%",
            height:"120px",
            resize: "vertical",
            overflowX: "hidden",
            boxSizing: "border-box",
            marginBottom: "5px"
        });

        lootArea.appendChild(bbTextarea);

        const maxPanelHeight = 550;
        bbTextarea.addEventListener("input", () => {
            const bbHeight = bbTextarea.scrollHeight + 10;
            panel.style.height = Math.min(bbHeight + 150, maxPanelHeight) + "px";
        });

        // Sorting & Category
        const sortSelect=document.createElement("select");
        ["name","id"].forEach(s=>{
            const opt=document.createElement("option");
            opt.value=s;
            opt.textContent=s==="name"?"Sort A-Z":"Sort by ID";
            if(s===sortMode) opt.selected=true;

            sortSelect.appendChild(opt);
        });
        sortSelect.onchange=()=>{
            sortMode=sortSelect.value;
            localStorage.setItem("fr_coli_sortMode",sortMode);
            updateUI();
        };

        applyStyles(sortSelect, masterButtonStyle());

        lootArea.appendChild(sortSelect);

        const catSelect=document.createElement("select");

        categories.forEach(c=>{
            const opt=document.createElement("option");
            opt.value=c;
            opt.textContent=c;
            if(c===activeCategory) opt.selected=true;

            catSelect.appendChild(opt);
        });

        catSelect.onchange=()=>{
            activeCategory=catSelect.value;
            localStorage.setItem("fr_coli_category",activeCategory);
            updateUI();
        };

        applyStyles(catSelect, masterButtonStyle());

        lootArea.appendChild(catSelect);

        // Reset Buttons
        const resetRow=document.createElement("div");
        applyStyles(resetRow,{
            display:"flex",
            gap:"2px",
            border:"none",
            marginTop: "6px",
            marginBottom: "6px",
        });

        const resetBtn=document.createElement("button");
        resetBtn.textContent="Reset Venue";
        resetBtn.onclick=()=>{
            if(confirm(`Reset ${currentVenue}?`)){ saveVenueData(currentVenue,{battleCount:0,loot:{}}); updateUI(); }
        };

        const resetAllBtn=document.createElement("button");
        resetAllBtn.textContent="Reset All";
        resetAllBtn.onclick=()=>{
            if(confirm("Reset ALL?")){ venues.forEach(v=>saveVenueData(v,{battleCount:0,loot:{}})); updateUI(); }
        };

        applyStyles(resetBtn, masterButtonStyle());
        applyStyles(resetAllBtn, masterButtonStyle());

        resetRow.appendChild(resetBtn);
        resetRow.appendChild(resetAllBtn);
        lootArea.appendChild(resetRow);

        // Overview Toggle
        const overviewToggle=document.createElement("button");
        overviewToggle.textContent=overviewVisible?"Hide Overview":"Show Overview";
        overviewToggle.onclick=()=>{ overviewVisible=!overviewVisible; updateUI(); };
        applyStyles(overviewToggle, masterButtonStyle());
        lootArea.appendChild(overviewToggle);

        if(overviewVisible){
            const overviewDiv=document.createElement("div");
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
            lootArea.appendChild(overviewDiv);
        }
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

    updateUI();

})();
