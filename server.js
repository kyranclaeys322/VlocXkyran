<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>AeroNex - ATA Manual Viewer</title>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    </script>

    <style>
        :root {
            --airbus-header: #071930;
            --airbus-orange: #f59e0b;
            --airbus-accent: #0284c7;
            --border-color: #cbd5e1;
            --bg-light: #f1f5f9;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: "Segoe UI", Arial, sans-serif;
            background: var(--bg-light);
            color: #1e293b;
            height: 100vh;
            overflow: hidden;
        }

        header {
            height: 50px;
            background: var(--airbus-header);
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 15px;
            border-bottom: 2px solid #00b0f0;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .airbus-logo {
            font-size: 1rem;
            font-weight: bold;
            letter-spacing: 1px;
        }

        .airbus-logo span {
            color: #00b0f0;
            font-weight: normal;
        }

        .doc-view-btn {
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 5px 12px;
            border-radius: 3px;
            cursor: pointer;
        }

        .doc-view-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        .header-center-info {
            font-size: 0.8rem;
            color: #cbd5e1;
            max-width: 50%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        .header-right {
            font-size: 0.8rem;
            font-weight: bold;
        }

        .workspace {
            display: flex;
            height: calc(100vh - 50px);
            overflow: hidden;
            position: relative;
        }

        #welcomeOverlay {
            position: absolute;
            inset: 0;
            background: rgba(7,25,48,0.96);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .welcome-card {
            background: #1e293b;
            border: 1px solid #475569;
            padding: 40px;
            border-radius: 8px;
            width: 450px;
            max-width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .welcome-card h1 {
            margin-bottom: 15px;
        }

        .welcome-card h1 span {
            color: #00b0f0;
        }

        .welcome-card p {
            color: #94a3b8;
            margin-bottom: 15px;
        }

        .code-input {
            width: 100%;
            padding: 10px;
            background: #0f172a;
            color: white;
            border: 1px solid #475569;
            border-radius: 4px;
            text-align: center;
            margin-bottom: 10px;
        }

        .code-submit-btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 4px;
            background: var(--airbus-orange);
            font-weight: bold;
            cursor: pointer;
        }

        #codeErrorMsg {
            display: none;
            color: #f87171;
            font-size: 0.8rem;
            margin-top: 10px;
        }

        .context-sidebar {
            width: 240px;
            background: #2b3544;
            color: white;
            border-right: 1px solid #1e293b;
            font-size: 0.75rem;
        }

        .context-header {
            background: #1a2332;
            padding: 10px 15px;
            font-weight: bold;
            border-bottom: 1px solid #334155;
        }

        .context-section {
            padding: 12px 15px;
            border-bottom: 1px solid #334155;
        }

        .context-label {
            color: #94a3b8;
            margin-bottom: 6px;
            text-transform: uppercase;
            font-size: 0.65rem;
        }

        .aircraft-select-row {
            display: flex;
            gap: 5px;
        }

        .aircraft-select {
            flex: 1;
            background: #1a2332;
            color: white;
            border: 1px solid #475569;
            padding: 6px;
            border-radius: 3px;
        }

        .aircraft-add-btn {
            width: 30px;
            background: var(--airbus-orange);
            border: none;
            border-radius: 3px;
            font-weight: bold;
            cursor: pointer;
        }

        .aircraft-hint {
            color: #94a3b8;
            font-size: 0.62rem;
            margin-top: 6px;
        }

        .browse-sidebar {
            width: 460px;
            background: white;
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .browse-tabs {
            display: flex;
            background: #f8fafc;
            border-bottom: 1px solid var(--border-color);
        }

        .b-tab {
            padding: 10px 15px;
            font-size: 0.75rem;
            font-weight: bold;
            color: #64748b;
            cursor: pointer;
            border-bottom: 2px solid transparent;
        }

        .b-tab.active {
            color: var(--airbus-header);
            border-bottom-color: var(--airbus-header);
        }

        .tab-content {
            display: none;
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            font-size: 0.75rem;
        }

        .tab-content.active {
            display: flex;
            flex-direction: column;
        }

        .tree-node {
            margin-bottom: 3px;
        }

        .tree-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 7px 8px;
            cursor: pointer;
            border-radius: 2px;
            font-weight: bold;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }

        .tree-toggle:hover {
            background: #e2e8f0;
        }

        .tree-children {
            list-style: none;
            padding-left: 12px;
            display: none;
            border-left: 1px dashed #cbd5e1;
            margin-top: 2px;
        }

        .tree-node.open > .tree-children {
            display: block;
        }

        .tree-leaf {
            padding: 7px 8px;
            cursor: pointer;
            background: white;
            border: 1px solid #f1f5f9;
            border-radius: 2px;
            margin-bottom: 3px;
        }

        .tree-leaf:hover {
            background: #e0f2fe;
            border-color: #bae6fd;
        }

        .search-box-container {
            display: flex;
            gap: 6px;
            margin-bottom: 10px;
        }

        .search-input {
            flex: 1;
            padding: 7px 10px;
            border: 1px solid var(--border-color);
            border-radius: 2px;
        }

        .search-btn {
            background: var(--airbus-header);
            color: white;
            border: none;
            padding: 7px 12px;
            border-radius: 2px;
            cursor: pointer;
        }

        .search-result-item {
            padding: 8px;
            background: white;
            border: 1px solid var(--border-color);
            margin-bottom: 6px;
            cursor: pointer;
        }

        .search-result-item:hover {
            background: #f0f9ff;
            border-color: var(--airbus-accent);
        }

        .upload-section {
            padding: 10px 15px;
            background: #f8fafc;
            border-top: 1px solid var(--border-color);
        }

        .upload-section label {
            display: block;
            font-size: 0.7rem;
            font-weight: bold;
            margin-bottom: 4px;
        }

        input[type="file"] {
            width: 100%;
            font-size: 0.7rem;
        }

        .progress-bar-container {
            display: none;
            width: 100%;
            height: 6px;
            background: #cbd5e1;
            margin-top: 5px;
        }

        .progress-bar-fill {
            height: 100%;
            width: 0%;
            background: var(--airbus-orange);
        }

        .viewer-pane {
            flex: 1;
            background: #e2e8f0;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .viewer-toolbar {
            width: 100%;
            max-width: 900px;
            background: white;
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .page-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .btn-action {
            background: var(--airbus-header);
            color: white;
            border: none;
            padding: 4px 10px;
            cursor: pointer;
            border-radius: 2px;
        }

        .pdf-canvas-container {
            width: 100%;
            max-width: 900px;
            background: white;
            padding: 5px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            position: relative;
        }

        #pdfCanvas {
            display: block;
            max-width: 100%;
            height: auto;
            margin: auto;
        }

        .textLayer {
            position: absolute;
            left: 5px;
            top: 5px;
            overflow: hidden;
            line-height: 1;
            text-align: initial;
            transform-origin: 0 0;
            user-select: text;
            -webkit-user-select: text;
        }

        .textLayer span,
        .textLayer br {
            color: transparent;
            position: absolute;
            white-space: pre;
            cursor: text;
            transform-origin: 0% 0%;
        }

        .textLayer ::selection {
            background: rgba(0, 100, 255, 0.30);
        }

        #ataOverviewContainer {
            display: none;
            width: 100%;
            max-width: 900px;
            background: white;
            padding: 30px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
        }

        #ataOverviewContainer h2 {
            color: var(--airbus-header);
            margin-bottom: 15px;
            border-bottom: 2px solid var(--airbus-orange);
            padding-bottom: 5px;
        }

        .ata-table {
            width: 100%;
            border-collapse: collapse;
        }

        .ata-table th,
        .ata-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
        }

        .ata-table th {
            background: var(--airbus-header);
            color: white;
        }

        .ata-table tr:nth-child(even) {
            background: #f8fafc;
        }

        @media(max-width:1100px) {
            .context-sidebar {
                width: 190px;
            }

            .browse-sidebar {
                width: 360px;
            }
        }

        @media(max-width:850px) {
            .context-sidebar {
                display: none;
            }

            .browse-sidebar {
                width: 320px;
            }

            .header-center-info {
                display: none;
            }
        }

        .ai-part-btn { background:#f59e0b;color:#071930;border:1px solid #fbbf24;padding:7px 12px;border-radius:4px;font-weight:700;cursor:pointer; }
        .ai-part-btn:hover { filter:brightness(1.05); }
        .ai-modal-backdrop { display:none; position:fixed; inset:0; z-index:500; background:rgba(2,12,27,.78); align-items:center; justify-content:center; padding:18px; }
        .ai-modal { width:min(760px,100%); max-height:92vh; overflow:auto; background:#f8fafc; color:#1e293b; border:1px solid #64748b; border-radius:8px; box-shadow:0 20px 60px #0008; }
        .ai-modal-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; color:#fff; background:#071930; border-bottom:2px solid #00b0f0; }
        .ai-modal-body { padding:18px; display:grid; gap:13px; }
        .ai-field { display:grid; gap:6px; font-size:.85rem; }
        .ai-field input { width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:4px; background:white; }
        .ai-help { color:#64748b; font-size:.78rem; line-height:1.45; }
        .ai-status { padding:10px; background:#e2e8f0; border-radius:4px; font-size:.85rem; white-space:pre-wrap; }
        .ai-result { padding:12px; border:1px solid #cbd5e1; border-left:4px solid #0284c7; background:#fff; border-radius:4px; margin-top:8px; }
        .ai-result h4 { margin-bottom:5px; }
        .ai-close { background:transparent; border:1px solid #64748b; color:#fff; padding:5px 9px; border-radius:4px; cursor:pointer; }
        @media(max-width:650px) { .header-right { display:none; } .ai-modal-body { padding:12px; } }

    </style>
</head>

<body>

<header>

    <div class="header-left">

        <div class="airbus-logo">
            AeroNex <span>Kyran</span>
        </div>

        <button
            class="doc-view-btn"
            onclick="toggleAtaChaptersOverview()">
            📋 ATA Chapters
        </button>

        <button class="ai-part-btn" onclick="openAiPartFinder()">📷 AI Part Finder</button>

    </div>

    <div
        class="header-center-info"
        id="headerInfoText">
        AERONEX MANUAL VIEWER
    </div>

    <div class="header-right">
        HELP CENTRE
    </div>

</header>

<div id="aiPartModal" class="ai-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="aiPartTitle">
  <div class="ai-modal">
    <div class="ai-modal-head">
      <strong id="aiPartTitle">📷 AI IPC Part Finder</strong>
      <button class="ai-close" onclick="closeAiPartFinder()" aria-label="Sluiten">Sluiten ✕</button>
    </div>
    <div class="ai-modal-body">
      <p class="ai-help">Upload de IPC-catalogus voor dit vliegtuig en een duidelijke foto van het onderdeel. AI vergelijkt de foto met overzichtsbeelden uit de catalogus en geeft mogelijke matches met paginanummers. Controleer altijd de officiële IPC voor je een onderdeel bestelt of gebruikt.</p>
      <label class="ai-field">Vliegtuigtype / model
        <input id="aiAircraftModel" type="text" placeholder="Bijv. Falcon 7X, A320, B737">
      </label>
      <label class="ai-field">IPC-catalogus (PDF)
        <input id="aiIpcPdf" type="file" accept="application/pdf,.pdf">
      </label>
      <label class="ai-field">Foto van het onderdeel
        <input id="aiPartPhoto" type="file" accept="image/*">
      </label>
      <div class="ai-help">MVP-limiet: maximaal 60 pagina's per IPC-scan. Als je IPC langer is, upload dan eerst het relevante hoofdstuk/deel als aparte PDF. De API-sleutel staat uitsluitend op de server.</div>
      <button id="aiRunBtn" class="ai-part-btn" onclick="runAiPartFinder()">Analyseer foto met AI</button>
      <div id="aiPartStatus" class="ai-status" aria-live="polite">Kies een IPC-PDF en een foto om te beginnen.</div>
      <div id="aiPartResults"></div>
    </div>
  </div>
</div>



<div class="workspace">

    <div id="welcomeOverlay">

        <div class="welcome-card">

            <h1>
                AeroNex <span>Kyran</span>
            </h1>

            <p>
                Voer de toegangscode in om de applicatie te ontgrendelen.
            </p>

            <input
                id="accessCodeInput"
                class="code-input"
                type="password"
                placeholder="Voer code in..."
                onkeydown="if(event.key==='Enter') checkAccessCode()"
            >

            <button
                class="code-submit-btn"
                onclick="checkAccessCode()">
                Ontgrendel
            </button>

            <div id="codeErrorMsg">
                Onjuiste code. Probeer opnieuw.
            </div>

        </div>

    </div>


    <div class="context-sidebar">

        <div class="context-header">
            ☰ CONTEXT
        </div>

        <div class="context-section">

            <div class="context-label">
                Vliegtuig
            </div>

            <div class="aircraft-select-row">

                <select
                    id="aircraftSelect"
                    class="aircraft-select"
                    onchange="selectAircraft(this.value)">
                </select>

                <button
                    class="aircraft-add-btn"
                    onclick="addAircraft()">
                    +
                </button>

            </div>

            <div class="aircraft-hint">
                Manuals die je toevoegt horen bij het geselecteerde vliegtuig.
            </div>

        </div>

        <div class="context-section">

            <div class="context-label">
                Geselecteerd vliegtuig
            </div>

            <div id="selectedAircraftName">
                Falcon
            </div>

        </div>

        <div class="context-section">

            <div class="context-label">
                Geladen boeken
            </div>

            <div id="loadedBooksCount">
                0 / 10 boeken geladen
            </div>

        </div>

    </div>


    <div class="browse-sidebar">

        <div class="browse-tabs">

            <div
                class="b-tab active"
                onclick="switchTab('browse',this)">
                📁 Browse
            </div>

            <div
                class="b-tab"
                onclick="switchTab('search',this)">
                🔍 Search
            </div>

            <div
                class="b-tab"
                onclick="switchTab('troubleshoot',this)">
                🛠️ Troubleshoot
            </div>

        </div>


        <div
            id="tabBrowse"
            class="tab-content active">

            <div style="font-weight:bold;margin-bottom:4px;">
                AERONEX MANUALS
            </div>

            <div
                style="color:#64748b;font-size:0.68rem;margin-bottom:8px;">
                Pagina's worden automatisch volgens ATA verdeeld.
            </div>

            <div
                id="treeContainer"
                style="flex:1;overflow-y:auto;">
            </div>

        </div>


        <div
            id="tabSearch"
            class="tab-content">

            <div style="font-weight:bold;margin-bottom:5px;">
                GLOBALE ZOEKMACHINE
            </div>

            <div class="search-box-container">

                <input
                    id="globalSearchInput"
                    class="search-input"
                    placeholder="Typ zoekterm..."
                    onkeydown="if(event.key==='Enter') executeGlobalSearch()"
                >

                <button
                    class="search-btn"
                    onclick="executeGlobalSearch()">
                    Zoek
                </button>

            </div>

            <div
                id="searchResultsContainer"
                style="flex:1;overflow-y:auto;">
                <i>Voer een zoekterm in.</i>
            </div>

        </div>


        <div
            id="tabTroubleshoot"
            class="tab-content">

            <div style="font-weight:bold;margin-bottom:5px;">
                TROUBLESHOOT
            </div>

            <div class="search-box-container">

                <input
                    id="troubleshootInput"
                    class="search-input"
                    placeholder="Bijv. HYD LOW PRESS of ATA 29"
                    onkeydown="if(event.key==='Enter') runTroubleshoot()"
                >

                <button
                    class="search-btn"
                    onclick="runTroubleshoot()">
                    Zoek
                </button>

            </div>

            <div
                id="troubleshootResults"
                style="flex:1;overflow-y:auto;">
                <i>Zoek een foutmelding of ATA-hoofdstuk.</i>
            </div>

        </div>


        <div class="upload-section">

            <label id="uploadLabel">
                Manuals voor Falcon (max. 10):
            </label>

            <input
                id="pdfUpload"
                type="file"
                accept=".pdf"
                multiple
                onchange="processMultipleManuals(event)"
            >

            <div
                id="progressBarContainer"
                class="progress-bar-container">

                <div
                    id="progressBarFill"
                    class="progress-bar-fill">
                </div>

            </div>

        </div>

    </div>


    <div class="viewer-pane">

        <div
            id="viewerToolbar"
            class="viewer-toolbar"
            style="display:none;">

            <div class="page-controls">

                <button
                    class="btn-action"
                    onclick="prevPage()">
                    Vorige
                </button>

                <span id="pageIndicator">
                    Pagina 1 / 1
                </span>

                <button
                    class="btn-action"
                    onclick="nextPage()">
                    Volgende
                </button>

            </div>

            <div id="viewerStatus">
                Gereed
            </div>

        </div>


        <div
            id="pdfContainerWrapper"
            class="pdf-canvas-container">

            <canvas id="pdfCanvas"></canvas>

        </div>


        <div id="ataOverviewContainer">

            <h2>
                Volledig Overzicht ATA Chapters
            </h2>

            <table class="ata-table">

                <thead>
                    <tr>
                        <th>Chap.</th>
                        <th>Subject</th>
                        <th>Chap.</th>
                        <th>Subject</th>
                    </tr>
                </thead>

                <tbody>

                    <tr><td>00</td><td>Air Vehicle General</td><td>21</td><td>Environmental Control</td></tr>
                    <tr><td>22</td><td>Auto Flight</td><td>23</td><td>Communications</td></tr>
                    <tr><td>24</td><td>Electrical Power</td><td>25</td><td>Equipment and Furnishings</td></tr>
                    <tr><td>26</td><td>Fire Protection</td><td>27</td><td>Flight Controls</td></tr>
                    <tr><td>28</td><td>Fuel</td><td>29</td><td>Hydraulic Power</td></tr>
                    <tr><td>30</td><td>Ice and Rain Protection</td><td>31</td><td>Indicating and Recording Systems</td></tr>
                    <tr><td>32</td><td>Landing Gear</td><td>33</td><td>Lights</td></tr>
                    <tr><td>34</td><td>Navigation</td><td>35</td><td>Oxygen</td></tr>
                    <tr><td>36</td><td>Pneumatic</td><td>37</td><td>Vacuum</td></tr>
                    <tr><td>38</td><td>Water and Waste</td><td>45</td><td>Central Maintenance System</td></tr>
                    <tr><td>46</td><td>Systems Integration</td><td>49</td><td>Airborne Auxiliary Power</td></tr>
                    <tr><td>51</td><td>Structures</td><td>52</td><td>Doors</td></tr>
                    <tr><td>53</td><td>Fuselage</td><td>54</td><td>Nacelles and Pylons</td></tr>
                    <tr><td>55</td><td>Stabilizers</td><td>56</td><td>Windows and Canopies</td></tr>
                    <tr><td>57</td><td>Wings</td><td>71</td><td>Power Plant</td></tr>
                    <tr><td>72</td><td>Engine</td><td>73</td><td>Engine Fuel and Control</td></tr>
                    <tr><td>74</td><td>Ignition</td><td>75</td><td>Air</td></tr>
                    <tr><td>76</td><td>Engine Controls</td><td>77</td><td>Engine Indicating</td></tr>
                    <tr><td>78</td><td>Exhaust</td><td>79</td><td>Oil</td></tr>
                    <tr><td>80</td><td>Starting</td><td>91</td><td>Charts and Diagrams</td></tr>

                </tbody>

            </table>

        </div>

    </div>

</div>


<script>

    /* ============================================================
       CONFIG
       ============================================================ */

    const CORRECT_ACCESS_CODE = "Vti2026";


    /* ============================================================
       DATA
       ============================================================ */

    let aircraftProfiles = [
        {
            id: 1,
            name: "Falcon",
            books: []
        }
    ];

    let selectedAircraftIndex = 0;
    let loadedBooks = aircraftProfiles[0].books;
    let currentBookIndex = 0;
    let activePageNum = 1;
    let renderScale = 1.3;
    let isShowingAtaOverview = false;

    const canvasElement =
        document.getElementById("pdfCanvas");

    const canvasContext =
        canvasElement.getContext("2d");


    /* ============================================================
       ATA NAMEN
       ============================================================ */

    const ATA_CHAPTER_NAMES = {

        "00": "Air Vehicle General",
        "04": "Airworthiness Limitations",
        "05": "Time Limits/Maintenance Checks",
        "06": "Dimensions and Areas",
        "07": "Lifting, Shoring, Recovering and Transporting",
        "08": "Levelling and Weighing",
        "09": "Handling and Taxiing",
        "10": "Parking and Mooring",
        "11": "Placards and Markings",
        "12": "Servicing",
        "14": "Air Vehicle Loading and Offloading",
        "15": "Aircrew Information",
        "16": "Change of Role",
        "18": "Vibration and Noise Analysis and Attenuation",
        "20": "Standard Practices – Airframe Systems",
        "21": "Environmental Control",
        "22": "Auto Flight",
        "23": "Communications",
        "24": "Electrical Power",
        "25": "Equipment and Furnishings",
        "26": "Fire Protection",
        "27": "Flight Controls",
        "28": "Fuel",
        "29": "Hydraulic Power",
        "30": "Ice and Rain Protection",
        "31": "Indicating and Recording Systems",
        "32": "Landing Gear",
        "33": "Lights",
        "34": "Navigation",
        "35": "Oxygen",
        "36": "Pneumatic",
        "37": "Vacuum",
        "38": "Water and Waste",
        "39": "Electrical Panels",
        "40": "Multisystem",
        "41": "Water Ballast",
        "42": "Integrated Modular Avionics",
        "43": "Tactical Communications",
        "44": "Cabin Systems",
        "45": "Central Maintenance System",
        "46": "Systems Integration and Display",
        "47": "Liquid Nitrogen",
        "48": "In-Flight Refuelling Tanker",
        "49": "Airborne Auxiliary Power",
        "51": "Standard Practices – Structures",
        "52": "Doors",
        "53": "Fuselage",
        "54": "Nacelles and Pylons",
        "55": "Stabilizers",
        "56": "Windows and Canopies",
        "57": "Wings",
        "60": "Standard Practices – Propeller or Rotor",
        "61": "Propellers and Propulsors",
        "62": "Main Rotors",
        "63": "Main Rotor Drives",
        "64": "Tail Rotor",
        "65": "Tail Rotor Drive",
        "66": "Folding Blades and Pylon",
        "67": "Rotors Flight Control",
        "70": "Standard Practices – Engine",
        "71": "Power Plant",
        "72": "Engine",
        "73": "Engine Fuel and Control",
        "74": "Ignition",
        "75": "Air",
        "76": "Engine Controls",
        "77": "Engine Indicating",
        "78": "Exhaust",
        "79": "Oil",
        "80": "Starting",
        "81": "Turbines",
        "82": "Water Injection",
        "83": "Accessory Gearboxes",
        "84": "Propulsion Augmentation",
        "91": "Charts and Diagrams",
        "93": "Surveillance",
        "94": "Weapons Systems",
        "95": "Crew Escape and Safety",
        "96": "Missiles, Drones and Telemetry",
        "97": "Image Recording",
        "98": "Meteorological and Atmospheric Research"

    };


    function getAtaChapterName(chapter) {

        return ATA_CHAPTER_NAMES[
            String(chapter).padStart(2, "0")
        ] || "Unknown / Other";

    }


    /* ============================================================
       HELPERS
       ============================================================ */

    function normalizeText(value) {

        return String(value || "")
            .normalize("NFKC")
            .replace(/[\u2010-\u2015\u2212]/g, "-")
            .replace(/[\u00A0\u2007\u202F]/g, " ")
            .replace(/\s*-\s*/g, "-")
            .replace(/\s+/g, " ")
            .trim();

    }


    function normalizeLower(value) {

        return normalizeText(value)
            .toLowerCase();

    }


    function escapeHtml(value) {

        return String(value || "")
            .replace(/[&<>'"]/g, c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            }[c]));

    }


    function getCurrentAircraft() {

        return aircraftProfiles[
            selectedAircraftIndex
        ];

    }


    /* ============================================================
       ACCESS
       ============================================================ */

    function checkAccessCode() {

        const input =
            document.getElementById(
                "accessCodeInput"
            );

        const error =
            document.getElementById(
                "codeErrorMsg"
            );

        if (
            input.value ===
            CORRECT_ACCESS_CODE
        ) {

            document.getElementById(
                "welcomeOverlay"
            ).style.display = "none";

        } else {

            error.style.display = "block";

            input.value = "";

            input.focus();

        }

    }


    /* ============================================================
       AIRCRAFT UI
       ============================================================ */

    function refreshAircraftUI() {

        const select =
            document.getElementById(
                "aircraftSelect"
            );

        const aircraft =
            getCurrentAircraft();

        select.innerHTML =
            aircraftProfiles
                .map(
                    (a, i) =>
                        `<option value="${i}">
                            ${escapeHtml(a.name)}
                        </option>`
                )
                .join("");

        select.value =
            selectedAircraftIndex;

        document.getElementById(
            "selectedAircraftName"
        ).innerText =
            aircraft.name;

        document.getElementById(
            "loadedBooksCount"
        ).innerText =
            `${aircraft.books.length} / 10 boeken geladen`;

        document.getElementById(
            "uploadLabel"
        ).innerText =
            `Manuals voor ${aircraft.name} (max. 10):`;

        document.getElementById(
            "headerInfoText"
        ).innerText =
            aircraft.books.length
                ? `${aircraft.name.toUpperCase()} — ${
                    aircraft.books
                        .map(book => book.name)
                        .join(", ")
                }`
                : `${aircraft.name.toUpperCase()} — GEEN MANUALS`;

    }


    function addAircraft() {

        const name =
            prompt(
                "Naam van het vliegtuig:",
                `Aircraft ${aircraftProfiles.length + 1}`
            );

        if (!name || !name.trim()) {
            return;
        }

        aircraftProfiles.push({

            id: Date.now(),

            name: name.trim(),

            books: []

        });

        selectedAircraftIndex =
            aircraftProfiles.length - 1;

        loadedBooks =
            getCurrentAircraft().books;

        currentBookIndex = 0;

        activePageNum = 1;

        refreshAircraftUI();

        rebuildCurrentAircraftTree();

        clearViewer();

    }


    function selectAircraft(index) {

        index = Number(index);

        if (!aircraftProfiles[index]) {
            return;
        }

        selectedAircraftIndex =
            index;

        loadedBooks =
            getCurrentAircraft().books;

        currentBookIndex = 0;

        activePageNum = 1;

        refreshAircraftUI();

        rebuildCurrentAircraftTree();

        if (loadedBooks.length) {

            renderSelectedPage(
                0,
                1
            );

        } else {

            clearViewer();

        }

    }


    /* ============================================================
       TAB
       ============================================================ */

    function switchTab(
        tabName,
        element
    ) {

        document
            .querySelectorAll(".b-tab")
            .forEach(
                tab =>
                    tab.classList.remove(
                        "active"
                    )
            );

        document
            .querySelectorAll(".tab-content")
            .forEach(
                tab =>
                    tab.classList.remove(
                        "active"
                    )
            );

        element.classList.add("active");

        document
            .getElementById(
                tabName === "browse"
                    ? "tabBrowse"
                    : tabName === "search"
                        ? "tabSearch"
                        : "tabTroubleshoot"
            )
            .classList.add("active");

    }


    /* ============================================================
       TREE
       ============================================================ */

    function toggleNode(element) {

        const node =
            element.parentElement;

        node.classList.toggle("open");

        const symbol =
            element.querySelector(
                ".toggle-symbol"
            );

        if (symbol) {

            symbol.innerText =
                node.classList.contains("open")
                    ? "▼"
                    : ">";

        }

    }


    function rebuildCurrentAircraftTree() {

        const chapters = {};

        loadedBooks.forEach(
            book => {

                book.pages.forEach(
                    page => {

                        if (!chapters[page.chapter]) {
                            chapters[page.chapter] = [];
                        }

                        chapters[
                            page.chapter
                        ].push(page);

                    }
                );

            }
        );

        buildTreeUI(chapters);

    }


    function buildTreeUI(chapters) {

        const container =
            document.getElementById(
                "treeContainer"
            );

        container.innerHTML = "";

        const chapterNumbers =
            Object.keys(chapters)
                .sort(
                    (a,b) =>
                        Number(a) -
                        Number(b)
                );


        if (!chapterNumbers.length) {

            container.innerHTML =
                "<i>Nog geen boeken geladen.</i>";

            return;

        }


        chapterNumbers.forEach(
            chapter => {

                const pages =
                    chapters[chapter];

                const node =
                    document.createElement(
                        "div"
                    );

                node.className =
                    "tree-node";


                const toggle =
                    document.createElement(
                        "div"
                    );

                toggle.className =
                    "tree-toggle";

                toggle.onclick =
                    () =>
                        toggleNode(
                            toggle
                        );


                toggle.innerHTML = `
                    <span class="toggle-symbol">></span>
                    <b>ATA ${escapeHtml(chapter)}</b>
                    — ${escapeHtml(
                        getAtaChapterName(chapter)
                    )}
                    (${pages.length})
                `;


                const children =
                    document.createElement(
                        "ul"
                    );

                children.className =
                    "tree-children";


                const sections = {};


                pages.forEach(
                    page => {

                        const code =
                            page.sectionCode ||
                            `${chapter}-00`;

                        if (!sections[code]) {
                            sections[code] = [];
                        }

                        sections[code].push(page);

                    }
                );


                Object.keys(sections)
                    .sort()
                    .forEach(
                        code => {

                            const sectionPages =
                                sections[code];

                            const firstPage =
                                sectionPages[0];


                            const leaf =
                                document.createElement(
                                    "div"
                                );

                            leaf.className =
                                "tree-leaf";


                            leaf.innerHTML = `
                                <b>${escapeHtml(code)}</b>
                                —
                                ${escapeHtml(
                                    firstPage.subject ||
                                    "Onbekend onderwerp"
                                )}
                                <span style="color:#64748b;">
                                    (${sectionPages.length} pag.)
                                </span>
                            `;


                            leaf.onclick =
                                event => {

                                    event.stopPropagation();

                                    const bookIndex =
                                        loadedBooks.findIndex(
                                            book =>
                                                book.pages.includes(
                                                    firstPage
                                                )
                                        );

                                    if (
                                        bookIndex >= 0
                                    ) {

                                        renderSelectedPage(
                                            bookIndex,
                                            firstPage.pageNum
                                        );

                                    }

                                };


                            children.appendChild(
                                leaf
                            );

                        }
                    );


                node.appendChild(toggle);

                node.appendChild(children);

                container.appendChild(node);

            }
        );

    }


    /* ============================================================
       PDF.JS TEKST REGELS
       ============================================================ */

    function buildTextLines(items) {

        const lines = {};

        for (
            let i = 0;
            i < items.length;
            i++
        ) {

            const item = items[i];

            const text =
                normalizeText(
                    item.str
                );

            if (!text) {
                continue;
            }

            const y =
                Math.round(
                    item.y / 2
                ) * 2;

            if (!lines[y]) {
                lines[y] = [];
            }

            lines[y].push({
                text,
                x: item.x,
                y: item.y,
                width: item.width || 0,
                height: item.height || 0,
                fontName: item.fontName || ""
            });

        }


        return Object.keys(lines)
            .map(
                key => {

                    const line =
                        lines[key].sort(
                            (a,b) =>
                                a.x - b.x
                        );

                    return {

                        y:
                            Number(key),

                        items:
                            line,

                        text:
                            line
                                .map(
                                    item =>
                                        item.text
                                )
                                .join(" ")

                    };

                }
            )
            .sort(
                (a,b) =>
                    b.y - a.y
            );

    }


    /* ============================================================
       ATA HERKENNING
       ============================================================ */

    function extractAtaInfo(
        items,
        existingLines = null
    ) {

        const lines =
            existingLines ||
            buildTextLines(items);

        const candidates = [];


        lines.forEach(
            line => {

                const text =
                    normalizeText(
                        line.text
                    );


                const regex =
                    /\b(\d{2}(?:\s*-\s*\d{2}){1,3})\b/g;


                let match;


                while (
                    (match =
                        regex.exec(text)) !== null
                ) {

                    const code =
                        match[1]
                            .replace(/\s+/g,"");

                    const chapter =
                        code.split("-")[0];


                    candidates.push({

                        chapter,

                        sectionCode:
                            code,

                        y: line.y,

                        priority: 200

                    });

                }


                const chapterRegex =
                    /\b(?:ATA|CHAPTER)\s*(\d{2})\b/gi;


                while (
                    (match =
                        chapterRegex.exec(text)) !== null
                ) {

                    candidates.push({

                        chapter:
                            match[1],

                        sectionCode:
                            `${match[1]}-00`,

                        y: line.y,

                        priority: 150

                    });

                }

            }
        );


        if (!candidates.length) {

            return {

                chapter: "00",

                sectionCode: "00-00"

            };

        }


        candidates.sort(
            (a,b) => {

                if (
                    b.priority !==
                    a.priority
                ) {

                    return (
                        b.priority -
                        a.priority
                    );

                }

                return (
                    b.y -
                    a.y
                );

            }
        );


        return {

            chapter:
                candidates[0].chapter,

            sectionCode:
                candidates[0].sectionCode

        };

    }


    /* ============================================================
       SNELLE ONDERWERP DETECTIE
       ============================================================ */

    function cleanSubject(text) {

        return normalizeText(text)
            .replace(
                /\s+/g,
                " "
            )
            .replace(
                /^[_\-–—\s]+/,
                ""
            )
            .replace(
                /[_\-–—\s]+$/,
                ""
            )
            .trim();

    }


    function isForbiddenSubject(text) {

        const value =
            cleanSubject(text)
                .toUpperCase();

        if (!value) {
            return true;
        }

        const forbidden = [

            "AVIONS MARCEL DASSAULT",
            "FAN JET FALCON",
            "MAINTENANCE MANUAL",

            "AVIONS MARCEL",
            "DASSAULT",
            "FAN JET",
            "FALCON",

            "MAINTENANCE",
            "MANUAL"

        ];


        return forbidden.some(
            word =>
                value === word ||
                value.includes(word)
        );

    }


    function isLikelySubject(text) {

        const value =
            cleanSubject(text);

        if (!value) {
            return false;
        }

        if (
            value.length < 3 ||
            value.length > 120
        ) {
            return false;
        }

        if (
            isForbiddenSubject(value)
        ) {
            return false;
        }

        if (
            /^\d+(?:[\s.-]+\d+)*$/
                .test(value)
        ) {
            return false;
        }

        if (
            /^(ATA|CHAPTER|PAGE|PAGINA|REVISION|ISSUE|DATE|DOCUMENT|CONTENTS|TABLE OF CONTENTS)\b/i
                .test(value)
        ) {
            return false;
        }

        if (
            /^(page|pagina|chapter|ata)\s+\d+/i
                .test(value)
        ) {
            return false;
        }

        return true;

    }


    function isProbablyHeader(text) {

        const value =
            cleanSubject(text)
                .toUpperCase();

        return (

            value.includes(
                "AVIONS MARCEL DASSAULT"
            ) ||

            value.includes(
                "FAN JET FALCON"
            ) ||

            value ===
                "MAINTENANCE MANUAL" ||

            value.includes(
                "MAINTENANCE MANUAL"
            )

        );

    }


    function scoreSubjectLine(
        line,
        index,
        ataIndex,
        headerIndex
    ) {

        const text =
            cleanSubject(
                line.text
            );

        if (
            !isLikelySubject(text)
        ) {
            return -9999;
        }

        if (
            isProbablyHeader(text)
        ) {
            return -9999;
        }

        let score = 0;


        if (
            headerIndex >= 0 &&
            index > headerIndex
        ) {

            score += 100;

            const distance =
                index -
                headerIndex;

            if (
                distance === 1
            ) {
                score += 100;
            } else if (
                distance === 2
            ) {
                score += 80;
            } else if (
                distance === 3
            ) {
                score += 50;
            } else if (
                distance <= 6
            ) {
                score += 20;
            }

        }


        if (
            ataIndex >= 0 &&
            index > ataIndex
        ) {

            score += 70;

            const distance =
                index -
                ataIndex;

            if (
                distance === 1
            ) {
                score += 50;
            } else if (
                distance <= 4
            ) {
                score += 25;
            }

        }


        if (
            /\b(system|unit|control|valve|pump|switch|indicator|display|circuit|generator|battery|sensor|actuator|landing|gear|brake|wheel|door|window|engine|fuel|hydraulic|pneumatic|oxygen|fire|lighting|navigation|communication|pressure|temperature|air|pack|flow)\b/i
                .test(text)
        ) {

            score += 30;

        }


        const wordCount =
            text.split(/\s+/).length;


        if (
            wordCount >= 2 &&
            wordCount <= 12
        ) {

            score += 25;

        }


        const letters =
            text.replace(
                /[^A-Za-zÀ-ÿ]/g,
                ""
            );

        const upper =
            letters.replace(
                /[^A-ZÀ-Þ]/g,
                ""
            );

        if (
            letters.length >= 5 &&
            upper.length /
                letters.length >=
                0.65
        ) {

            score += 15;

        }


        if (
            text.length > 80
        ) {

            score -= 30;

        }


        return score;

    }


    function findSubject(
        items,
        fullText,
        ataInfo,
        existingLines = null
    ) {

        const lines =
            existingLines ||
            buildTextLines(items);


        if (!lines.length) {
            return "Onbekend onderwerp";
        }


        let ataIndex = -1;


        if (
            ataInfo &&
            ataInfo.sectionCode &&
            ataInfo.sectionCode !== "00-00"
        ) {

            const ataCode =
                normalizeText(
                    ataInfo.sectionCode
                );

            ataIndex =
                lines.findIndex(
                    line =>
                        normalizeText(
                            line.text
                        ).includes(
                            ataCode
                        )
                );

        }


        let headerIndex = -1;


        lines.forEach(
            (line, index) => {

                const text =
                    cleanSubject(
                        line.text
                    )
                        .toUpperCase();


                if (
                    text.includes(
                        "AVIONS MARCEL DASSAULT"
                    ) ||

                    text.includes(
                        "FAN JET FALCON"
                    ) ||

                    text.includes(
                        "MAINTENANCE MANUAL"
                    )
                ) {

                    headerIndex =
                        Math.max(
                            headerIndex,
                            index
                        );

                }

            }
        );


        if (
            headerIndex >= 0
        ) {

            const directCandidates = [];


            for (
                let i =
                    headerIndex + 1;

                i <
                    Math.min(
                        lines.length,
                        headerIndex + 8
                    );

                i++
            ) {

                const line =
                    lines[i];

                const text =
                    cleanSubject(
                        line.text
                    );


                if (
                    !isLikelySubject(text)
                ) {
                    continue;
                }


                if (
                    /\b\d{2}(?:-\d{2}){1,3}\b/
                        .test(text)
                ) {
                    continue;
                }


                const score =
                    scoreSubjectLine(
                        line,
                        i,
                        ataIndex,
                        headerIndex
                    );


                directCandidates.push({

                    text,

                    score:

                        score +
                        (
                            i ===
                            headerIndex + 1
                                ? 120
                                : 0
                        ),

                    index: i

                });

            }


            if (
                directCandidates.length
            ) {

                directCandidates.sort(
                    (a,b) =>
                        b.score -
                        a.score
                );


                return cleanSubject(
                    directCandidates[0].text
                );

            }

        }


        if (
            ataIndex >= 0
        ) {

            const ataCandidates = [];


            for (
                let i =
                    ataIndex + 1;

                i <
                    Math.min(
                        lines.length,
                        ataIndex + 8
                    );

                i++
            ) {

                const line =
                    lines[i];

                const text =
                    cleanSubject(
                        line.text
                    );


                if (
                    !isLikelySubject(text)
                ) {
                    continue;
                }


                if (
                    /\b\d{2}(?:-\d{2}){1,3}\b/
                        .test(text)
                ) {
                    continue;
                }


                const score =
                    scoreSubjectLine(
                        line,
                        i,
                        ataIndex,
                        headerIndex
                    );


                ataCandidates.push({

                    text,

                    score,

                    index: i

                });

            }


            if (
                ataCandidates.length
            ) {

                ataCandidates.sort(
                    (a,b) =>
                        b.score -
                        a.score
                );


                return cleanSubject(
                    ataCandidates[0].text
                );

            }

        }


        const candidates = [];


        lines.forEach(
            (line, index) => {

                const text =
                    cleanSubject(
                        line.text
                    );


                if (
                    !isLikelySubject(text)
                ) {
                    return;
                }


                const score =
                    scoreSubjectLine(
                        line,
                        index,
                        ataIndex,
                        headerIndex
                    );


                if (
                    score > 0
                ) {

                    candidates.push({

                        text,

                        score,

                        index

                    });

                }

            }
        );


        if (
            candidates.length
        ) {

            candidates.sort(
                (a,b) =>
                    b.score -
                    a.score
            );


            return cleanSubject(
                candidates[0].text
            );

        }


        return "Onbekend onderwerp";

    }


    /* ============================================================
       PAGE LABEL
       ============================================================ */

    function getPageLabel(
        fullText,
        pageNumber
    ) {

        const text =
            normalizeText(
                fullText
            );


        const match =
            text.match(
                /\bpage\s+([a-z0-9]+)/i
            );


        if (match) {

            return `p.${match[1]}`;

        }


        return `p.${pageNumber}`;

    }


    /* ============================================================
       UPLOAD
       ============================================================ */

    async function processMultipleManuals(event) {

        const files =
            event.target.files;


        if (
            !files ||
            !files.length
        ) {
            return;
        }


        const aircraft =
            getCurrentAircraft();


        if (
            aircraft.books.length +
            files.length >
            10
        ) {

            alert(
                "Je kunt maximaal 10 boeken per vliegtuig laden."
            );

            event.target.value = "";

            return;

        }


        const progressContainer =
            document.getElementById(
                "progressBarContainer"
            );

        const progress =
            document.getElementById(
                "progressBarFill"
            );


        progressContainer.style.display =
            "block";


        for (
            let fileIndex = 0;
            fileIndex < files.length;
            fileIndex++
        ) {

            const file =
                files[fileIndex];


            try {

                document.getElementById(
                    "viewerStatus"
                ).innerText =
                    `PDF openen: ${file.name}`;


                const arrayBuffer =
                    await file.arrayBuffer();


                const loadingTask =
                    pdfjsLib.getDocument({
                        data: arrayBuffer
                    });


                const pdfDoc =
                    await loadingTask.promise;


                const pages = [];


                for (
                    let pageNumber = 1;
                    pageNumber <= pdfDoc.numPages;
                    pageNumber++
                ) {

                    const pdfPage =
                        await pdfDoc.getPage(
                            pageNumber
                        );


                    const textContent =
                        await pdfPage.getTextContent();


                    const textItems =
                        textContent.items
                            .map(
                                item => ({

                                    str:
                                        String(
                                            item.str ||
                                            ""
                                        ).trim(),

                                    x:
                                        Number(
                                            item.transform[4]
                                        ) || 0,

                                    y:
                                        Number(
                                            item.transform[5]
                                        ) || 0,

                                    width:
                                        Number(
                                            item.width
                                        ) || 0,

                                    height:
                                        Number(
                                            item.height
                                        ) || 0,

                                    fontName:
                                        item.fontName ||
                                        ""

                                })
                            )
                            .filter(
                                item =>
                                    item.str
                            );


                    const fullText =
                        textItems
                            .map(
                                item =>
                                    item.str
                            )
                            .join(" ");


                    const textLines =
                        buildTextLines(
                            textItems
                        );


                    const ataInfo =
                        extractAtaInfo(
                            textItems,
                            textLines
                        );


                    const subject =
                        findSubject(
                            textItems,
                            fullText,
                            ataInfo,
                            textLines
                        );


                    const pageLabel =
                        getPageLabel(
                            fullText,
                            pageNumber
                        );


                    pages.push({

                        pageNum:
                            pageNumber,

                        chapter:
                            ataInfo.chapter,

                        sectionCode:
                            ataInfo.sectionCode,

                        subject:
                            subject,

                        pageLabel:
                            pageLabel,

                        fullText:
                            fullText

                    });


                    const percentage =
                        Math.round(
                            (
                                (
                                    fileIndex +
                                    pageNumber /
                                    pdfDoc.numPages
                                ) /
                                files.length
                            ) *
                            100
                        );


                    progress.style.width =
                        `${percentage}%`;


                    if (
                        pageNumber === 1 ||
                        pageNumber % 5 === 0 ||
                        pageNumber === pdfDoc.numPages
                    ) {

                        document.getElementById(
                            "viewerStatus"
                        ).innerText =
                            `Verwerken ${file.name}: pagina ${pageNumber}/${pdfDoc.numPages} — ATA ${ataInfo.chapter} — ${subject}`;

                    }


                    if (
                        pageNumber % 10 === 0
                    ) {

                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    0
                                )
                        );

                    }

                }


                aircraft.books.push({

                    name:
                        file.name,

                    pdfDoc:
                        pdfDoc,

                    pages:
                        pages

                });


            } catch (error) {

                console.error(error);

                alert(
                    `Fout bij ${file.name}: ${error.message}`
                );

            }

        }


        progress.style.width =
            "100%";


        loadedBooks =
            aircraft.books;


        refreshAircraftUI();

        rebuildCurrentAircraftTree();


        if (
            loadedBooks.length
        ) {

            currentBookIndex = 0;

            activePageNum = 1;

            document.getElementById(
                "viewerToolbar"
            ).style.display =
                "flex";

            await renderSelectedPage(
                0,
                1
            );

        }


        setTimeout(
            () => {

                progressContainer.style.display =
                    "none";

                progress.style.width =
                    "0%";

            },
            500
        );


        event.target.value = "";

    }


    /* ============================================================
       PDF RENDER
       ============================================================ */

    async function renderSelectedPage(
        bookIndex,
        pageNumber
    ) {

        const aircraft =
            getCurrentAircraft();


        const book =
            aircraft.books[
                bookIndex
            ];


        if (!book) {
            return;
        }


        if (
            pageNumber < 1 ||
            pageNumber >
                book.pdfDoc.numPages
        ) {
            return;
        }


        currentBookIndex =
            bookIndex;

        activePageNum =
            pageNumber;


        isShowingAtaOverview =
            false;


        document.getElementById(
            "ataOverviewContainer"
        ).style.display =
            "none";


        document.getElementById(
            "pdfContainerWrapper"
        ).style.display =
            "block";


        document.getElementById(
            "viewerToolbar"
        ).style.display =
            "flex";


        const page =
            await book.pdfDoc.getPage(
                pageNumber
            );


        const viewport =
            page.getViewport({
                scale: renderScale
            });


        canvasElement.width =
            viewport.width;

        canvasElement.height =
            viewport.height;


        await page.render({

            canvasContext,

            viewport

        }).promise;

        const wrapper = document.getElementById("pdfContainerWrapper");
        const oldTextLayer = wrapper.querySelector(".textLayer");
        if (oldTextLayer) oldTextLayer.remove();

        const textLayerDiv = document.createElement("div");
        textLayerDiv.className = "textLayer";
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        wrapper.appendChild(textLayerDiv);

        try {
            const textContent = await page.getTextContent();
            const textLayerTask = pdfjsLib.renderTextLayer({
                textContent,
                container: textLayerDiv,
                viewport,
                textDivs: []
            });
            await textLayerTask.promise;
        } catch (error) {
            console.warn("PDF-tekstlaag kon niet worden opgebouwd:", error);
            textLayerDiv.remove();
        }

        document.getElementById(
            "pageIndicator"
        ).innerText =
            `${book.name} — Pagina ${pageNumber}/${book.pdfDoc.numPages}`;


        document.getElementById(
            "viewerStatus"
        ).innerText =
            `ATA ${book.pages[pageNumber - 1]?.chapter || ""}`;

    }


    function nextPage() {

        const book =
            loadedBooks[
                currentBookIndex
            ];


        if (!book) {
            return;
        }


        if (
            activePageNum <
            book.pdfDoc.numPages
        ) {

            renderSelectedPage(
                currentBookIndex,
                activePageNum + 1
            );

        }

    }


    function prevPage() {

        if (
            activePageNum > 1
        ) {

            renderSelectedPage(
                currentBookIndex,
                activePageNum - 1
            );

        }

    }


    /* ============================================================
       SEARCH
       ============================================================ */

    function executeGlobalSearch() {

        const query =
            normalizeLower(
                document.getElementById(
                    "globalSearchInput"
                ).value
            );


        const container =
            document.getElementById(
                "searchResultsContainer"
            );


        container.innerHTML = "";


        if (!query) {

            container.innerHTML =
                "<i>Voer een zoekterm in.</i>";

            return;

        }


        const results = [];


        loadedBooks.forEach(
            (book, bookIndex) => {

                book.pages.forEach(
                    page => {

                        if (

                            normalizeLower(
                                page.fullText
                            ).includes(
                                query
                            ) ||

                            normalizeLower(
                                page.subject
                            ).includes(
                                query
                            ) ||

                            normalizeLower(
                                page.sectionCode
                            ).includes(
                                query
                            )

                        ) {

                            results.push({

                                bookIndex,

                                bookName:
                                    book.name,

                                page

                            });

                        }

                    }
                );

            }
        );


        if (!results.length) {

            container.innerHTML =
                `<i>Geen resultaten gevonden voor "${escapeHtml(query)}".</i>`;

            return;

        }


        results.forEach(
            result => {

                const div =
                    document.createElement(
                        "div"
                    );

                div.className =
                    "search-result-item";


                div.innerHTML = `
                    <b>
                        ATA ${escapeHtml(
                            result.page.sectionCode
                        )}
                    </b>
                    —
                    ${escapeHtml(
                        result.page.subject
                    )}
                    <br>

                    <span style="color:#64748b;">
                        ${escapeHtml(
                            result.bookName
                        )}
                        — pagina
                        ${result.page.pageNum}
                    </span>
                `;


                div.onclick =
                    () =>
                        renderSelectedPage(
                            result.bookIndex,
                            result.page.pageNum
                        );


                container.appendChild(div);

            }
        );

    }


    /* ============================================================
       TROUBLESHOOT
       ============================================================ */

    function runTroubleshoot() {

        const query =
            normalizeLower(
                document.getElementById(
                    "troubleshootInput"
                ).value
            );


        const container =
            document.getElementById(
                "troubleshootResults"
            );


        container.innerHTML = "";


        if (!query) {

            container.innerHTML =
                "<i>Voer een zoekterm in.</i>";

            return;

        }


        const results = [];


        loadedBooks.forEach(
            (book, bookIndex) => {

                book.pages.forEach(
                    page => {

                        if (

                            normalizeLower(
                                page.fullText
                            ).includes(query) ||

                            normalizeLower(
                                page.subject
                            ).includes(query) ||

                            normalizeLower(
                                page.sectionCode
                            ).includes(query)

                        ) {

                            results.push({

                                bookIndex,

                                bookName:
                                    book.name,

                                page

                            });

                        }

                    }
                );

            }
        );


        results
            .slice(0,50)
            .forEach(
                result => {

                    const div =
                        document.createElement(
                            "div"
                        );

                    div.className =
                        "search-result-item";


                    div.innerHTML = `
                        <b>
                            ATA ${escapeHtml(
                                result.page.sectionCode
                            )}
                        </b>
                        —
                        ${escapeHtml(
                            result.page.subject
                        )}
                        <br>
                        <span style="color:#64748b;">
                            ${escapeHtml(
                                result.bookName
                            )}
                            — pagina
                            ${result.page.pageNum}
                        </span>
                    `;


                    div.onclick =
                        () =>
                            renderSelectedPage(
                                result.bookIndex,
                                result.page.pageNum
                            );


                    container.appendChild(
                        div
                    );

                }
            );


        if (!results.length) {

            container.innerHTML =
                "<i>Geen resultaten gevonden.</i>";

        }

    }


    /* ============================================================
       ATA OVERVIEW
       ============================================================ */

    function toggleAtaChaptersOverview() {

        isShowingAtaOverview =
            !isShowingAtaOverview;


        const overview =
            document.getElementById(
                "ataOverviewContainer"
            );

        const pdf =
            document.getElementById(
                "pdfContainerWrapper"
            );

        const toolbar =
            document.getElementById(
                "viewerToolbar"
            );


        if (
            isShowingAtaOverview
        ) {

            overview.style.display =
                "block";

            pdf.style.display =
                "none";

            toolbar.style.display =
                "none";

        } else {

            overview.style.display =
                "none";

            pdf.style.display =
                "block";

            if (loadedBooks.length) {

                toolbar.style.display =
                    "flex";

            }

        }

    }


    /* ============================================================
       CLEAR VIEWER
       ============================================================ */

    function clearViewer() {

        document.getElementById(
            "viewerToolbar"
        ).style.display =
            "none";


        canvasElement.width = 1;

        canvasElement.height = 1;

        canvasContext.clearRect(
            0,
            0,
            1,
            1
        );


        document.getElementById(
            "viewerStatus"
        ).innerText =
            "Geen manual geladen";

    }


    /* ============================================================
       CTRL + F
       ============================================================ */

    window.addEventListener(
        "keydown",
        event => {

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.key.toLowerCase() === "f"
            ) {

                event.preventDefault();

                const tab =
                    document.querySelectorAll(
                        ".b-tab"
                    )[1];

                switchTab(
                    "search",
                    tab
                );

                document.getElementById(
                    "globalSearchInput"
                ).focus();

            }

        }
    );



    /* ============================================================
       AI IPC PART FINDER
       ============================================================ */
    function openAiPartFinder() {
        document.getElementById("aiPartModal").style.display = "flex";
        const current = getCurrentAircraft();
        const modelInput = document.getElementById("aiAircraftModel");
        if (!modelInput.value && current && current.name) modelInput.value = current.name;
    }

    function closeAiPartFinder() {
        document.getElementById("aiPartModal").style.display = "none";
    }

    function setAiPartStatus(message) {
        document.getElementById("aiPartStatus").textContent = message;
    }

    async function makeIpcContactSheets(file, onProgress) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (pdf.numPages > 60) {
            throw new Error(`Deze IPC heeft ${pdf.numPages} pagina's. De eerste versie ondersteunt maximaal 60 pagina's per scan. Splits de PDF in relevante hoofdstukken.`);
        }
        const pageCanvases = [];
        for (let n = 1; n <= pdf.numPages; n++) {
            onProgress(`IPC-pagina's voorbereiden: ${n}/${pdf.numPages}...`);
            const page = await pdf.getPage(n);
            const base = page.getViewport({ scale: 1 });
            const scale = Math.min(0.72, 420 / base.width, 520 / base.height);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.ceil(viewport.width));
            canvas.height = Math.max(1, Math.ceil(viewport.height + 28));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            ctx.fillStyle = '#071930'; ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px Arial';
            ctx.fillText(`IPC PDF page ${n}`, 8, canvas.height - 8);
            pageCanvases.push(canvas);
        }
        const sheets = [];
        for (let i = 0; i < pageCanvases.length; i += 4) {
            const group = pageCanvases.slice(i, i + 4);
            const cellW = 440, cellH = 560, gap = 12;
            const sheet = document.createElement('canvas');
            sheet.width = cellW * 2 + gap * 3; sheet.height = cellH * 2 + gap * 3;
            const ctx = sheet.getContext('2d');
            ctx.fillStyle = '#dbe4ee'; ctx.fillRect(0, 0, sheet.width, sheet.height);
            group.forEach((canvas, index) => {
                const x = gap + (index % 2) * (cellW + gap);
                const y = gap + Math.floor(index / 2) * (cellH + gap);
                const scale = Math.min((cellW - 8) / canvas.width, (cellH - 8) / canvas.height);
                const w = canvas.width * scale, h = canvas.height * scale;
                ctx.fillStyle = '#fff'; ctx.fillRect(x, y, cellW, cellH);
                ctx.drawImage(canvas, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h);
            });
            sheets.push(sheet.toDataURL('image/jpeg', 0.72));
        }
        return { sheets, pageCount: pdf.numPages };
    }

    async function runAiPartFinder() {
        const ipcFile = document.getElementById('aiIpcPdf').files[0];
        const photo = document.getElementById('aiPartPhoto').files[0];
        const aircraft = document.getElementById('aiAircraftModel').value.trim() || 'Niet opgegeven';
        const button = document.getElementById('aiRunBtn');
        const results = document.getElementById('aiPartResults');
        results.innerHTML = '';
        if (!ipcFile || !photo) {
            setAiPartStatus('Kies zowel de IPC-PDF als een foto van het onderdeel.');
            return;
        }
        if (photo.size > 12 * 1024 * 1024) {
            setAiPartStatus('De foto is te groot. Kies een foto kleiner dan 12 MB.'); return;
        }
        if (!photo.type.startsWith('image/')) {
            setAiPartStatus('Het gekozen fotobestand is geen ondersteunde afbeelding.'); return;
        }
        button.disabled = true; button.style.opacity = '.65';
        try {
            const { sheets, pageCount } = await makeIpcContactSheets(ipcFile, setAiPartStatus);
            setAiPartStatus(`IPC heeft ${pageCount} pagina's. Foto en ${sheets.length} contact sheets worden naar de AI gestuurd...`);
            const photoDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Foto kon niet worden gelezen.'));
                reader.readAsDataURL(photo);
            });
            const response = await fetch('/api/identify-part', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aircraft, photo: photoDataUrl, sheets, pageCount, ipcName: ipcFile.name })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || `Serverfout (${response.status})`);
            const matches = Array.isArray(payload.matches) ? payload.matches : [];
            setAiPartStatus(matches.length ? `AI-analyse klaar. ${matches.length} mogelijke match(es) gevonden. Controleer deze in de officiële IPC.` : 'AI-analyse klaar, maar er zijn geen betrouwbare matches gevonden.');
            if (!matches.length) {
                results.innerHTML = `<div class="ai-result">${escapeHtml(payload.notes || payload.summary || 'Probeer een scherpere foto of upload het relevante IPC-hoofdstuk.')}</div>`;
            } else {
                results.innerHTML = matches.map((m, i) => `<div class="ai-result"><h4>${i + 1}. ${escapeHtml(m.partNumber || 'Part number niet gevonden')} — ${escapeHtml(m.description || 'Omschrijving niet vastgesteld')}</h4><div><strong>IPC-pagina:</strong> ${escapeHtml(String(m.pageNumber ?? 'Niet vastgesteld'))}</div><div><strong>Figuur / item:</strong> ${escapeHtml(m.figureItem || 'Niet vastgesteld')}</div><div><strong>Vertrouwen:</strong> ${escapeHtml(m.confidence || 'Onzeker')}</div><p style="margin-top:6px">${escapeHtml(m.reason || '')}</p></div>`).join('');
            }
            if (payload.warning) {
                results.insertAdjacentHTML('beforeend', `<div class="ai-result"><strong>Belangrijk:</strong> ${escapeHtml(payload.warning)}</div>`);
            }
            if (!matches.length && payload.notes) {
                results.innerHTML = `<div class="ai-result">${escapeHtml(payload.notes)}</div>`;
                if (payload.warning) {
                    results.insertAdjacentHTML('beforeend', `<div class="ai-result"><strong>Belangrijk:</strong> ${escapeHtml(payload.warning)}</div>`);
                }
            }
        } catch (error) {
            setAiPartStatus(`Fout: ${error.message}
Controleer of de backend is gedeployed en OPENAI_API_KEY in Render is ingesteld.`);
        } finally {
            button.disabled = false; button.style.opacity = '1';
        }
    }

    /* ============================================================
       START
       ============================================================ */

    refreshAircraftUI();

    rebuildCurrentAircraftTree();

</script>

</body>
</html>
