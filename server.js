
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const DATA_DIR = path.join(__dirname, "data");
const MANUALS_DIR = path.join(DATA_DIR, "manuals");
const LIBRARY_FILE = path.join(DATA_DIR, "library.json");

const MAX_MANUALS_PER_AIRCRAFT = 50;
const MAX_FILES_PER_UPLOAD = 50;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MANUALS_DIR, { recursive: true });

// --------------------------------------------------
// LIBRARY LADEN EN OPSLAAN
// --------------------------------------------------

function loadLibrary() {
  if (!fs.existsSync(LIBRARY_FILE)) {
    const emptyLibrary = { aircraft: [] };
    fs.writeFileSync(LIBRARY_FILE, JSON.stringify(emptyLibrary, null, 2));
    return emptyLibrary;
  }

  try {
    const data = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));

    if (!Array.isArray(data.aircraft)) {
      data.aircraft = [];
    }

    return data;
  } catch (error) {
    console.error("Library kon niet worden gelezen:", error);
    return { aircraft: [] };
  }
}

function saveLibrary(library) {
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2));
}

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json({ limit: "40mb" }));
app.use(express.urlencoded({ extended: true, limit: "40mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "CHANGE-THIS-SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

// --------------------------------------------------
// PDF UPLOAD
// --------------------------------------------------

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MANUALS_DIR);
  },

  filename: function (req, file, cb) {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const uniqueName =
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 10) +
      "_" +
      safeName;

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024,
    files: MAX_FILES_PER_UPLOAD
  },

  fileFilter: function (req, file, cb) {
    const isPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
      return cb(new Error("Alleen PDF-bestanden zijn toegestaan."));
    }

    cb(null, true);
  }
});

// --------------------------------------------------
// ADMIN AUTH
// --------------------------------------------------

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  res.status(401).json({ error: "Niet ingelogd als admin." });
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (
    username === adminUsername &&
    password === adminPassword &&
    adminUsername &&
    adminPassword
  ) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  res.status(401).json({
    error: "Verkeerde gebruikersnaam of wachtwoord."
  });
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// --------------------------------------------------
// CHECK LOGIN
// --------------------------------------------------

app.get("/api/me", (req, res) => {
  res.json({
    loggedIn: !!(req.session && req.session.isAdmin)
  });
});

// --------------------------------------------------
// PUBLIC LIBRARY
// --------------------------------------------------

app.get("/api/library", (req, res) => {
  res.json(loadLibrary());
});

// --------------------------------------------------
// PDF SERVER
// --------------------------------------------------

app.get("/manuals/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(MANUALS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Manual niet gevonden.");
  }

  res.sendFile(filePath);
});

// --------------------------------------------------
// AIRCRAFT TOEVOEGEN
// --------------------------------------------------

app.post("/api/admin/aircraft", requireAdmin, (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "Aircraft naam ontbreekt."
    });
  }

  const library = loadLibrary();

  const aircraft = {
    id: Date.now().toString(),
    name: name.trim(),
    manuals: []
  };

  library.aircraft.push(aircraft);
  saveLibrary(library);

  res.json({ success: true, aircraft });
});

// --------------------------------------------------
// AIRCRAFT WIJZIGEN
// --------------------------------------------------

app.put("/api/admin/aircraft/:id", requireAdmin, (req, res) => {
  const library = loadLibrary();

  const aircraft = library.aircraft.find(
    a => String(a.id) === String(req.params.id)
  );

  if (!aircraft) {
    return res.status(404).json({ error: "Aircraft niet gevonden." });
  }

  if (typeof req.body.name === "string" && req.body.name.trim()) {
    aircraft.name = req.body.name.trim();
  }

  saveLibrary(library);
  res.json({ success: true, aircraft });
});

// --------------------------------------------------
// AIRCRAFT VERWIJDEREN
// --------------------------------------------------

app.delete("/api/admin/aircraft/:id", requireAdmin, (req, res) => {
  const library = loadLibrary();

  const index = library.aircraft.findIndex(
    a => String(a.id) === String(req.params.id)
  );

  if (index === -1) {
    return res.status(404).json({ error: "Aircraft niet gevonden." });
  }

  const aircraft = library.aircraft[index];

  for (const manual of aircraft.manuals || []) {
    if (manual.filename) {
      const filePath = path.join(
        MANUALS_DIR,
        path.basename(manual.filename)
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  library.aircraft.splice(index, 1);
  saveLibrary(library);

  res.json({ success: true });
});

// --------------------------------------------------
// MANUALS UPLOADEN
// MAXIMAAL 50 BESTANDEN PER UPLOAD
// MAXIMAAL 50 MANUALS PER AIRCRAFT
// --------------------------------------------------

app.post(
  "/api/admin/manuals",
  requireAdmin,
  upload.array("manuals", MAX_FILES_PER_UPLOAD),
  (req, res) => {
    const aircraftId = req.query.aircraftId;

    const type = String(
      req.query.type || req.body.type || "AMM"
    ).toUpperCase();

    if (type !== "AMM" && type !== "IPC") {
      for (const file of req.files || []) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }

      return res.status(400).json({
        error: "Manual type moet AMM of IPC zijn."
      });
    }

    const library = loadLibrary();

    const aircraft = library.aircraft.find(
      a => String(a.id) === String(aircraftId)
    );

    if (!aircraft) {
      for (const file of req.files || []) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }

      return res.status(404).json({
        error: "Aircraft niet gevonden."
      });
    }

    if (!Array.isArray(aircraft.manuals)) {
      aircraft.manuals = [];
    }

    const incomingFiles = req.files || [];

    if (incomingFiles.length === 0) {
      return res.status(400).json({
        error: "Selecteer minstens één PDF-bestand."
      });
    }

    if (
      aircraft.manuals.length + incomingFiles.length >
      MAX_MANUALS_PER_AIRCRAFT
    ) {
      for (const file of incomingFiles) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }

      return res.status(400).json({
        error:
          `Je kunt maximaal ${MAX_MANUALS_PER_AIRCRAFT} manuals per aircraft opslaan. ` +
          `Dit aircraft heeft al ${aircraft.manuals.length} manuals. ` +
          `Je probeert ${incomingFiles.length} bestanden toe te voegen.`
      });
    }

    const added = [];

    for (const file of incomingFiles) {
      const manual = {
        id:
          Date.now().toString() +
          "_" +
          Math.random().toString(36).substring(2, 8),

        name: path.basename(
          file.originalname,
          path.extname(file.originalname)
        ),

        filename: path.basename(file.filename),
        type,

        url:
          "/manuals/" +
          encodeURIComponent(path.basename(file.filename))
      };

      aircraft.manuals.push(manual);
      added.push(manual);
    }

    saveLibrary(library);

    res.json({
      success: true,
      type,
      uploaded: added.length,
      manuals: added
    });
  }
);

// --------------------------------------------------
// MANUAL VERWIJDEREN
// --------------------------------------------------

app.delete("/api/admin/manuals/:id", requireAdmin, (req, res) => {
  const library = loadLibrary();

  let foundManual = null;
  let foundAircraft = null;

  for (const aircraft of library.aircraft) {
    const index = (aircraft.manuals || []).findIndex(
      manual => String(manual.id) === String(req.params.id)
    );

    if (index !== -1) {
      foundAircraft = aircraft;
      foundManual = aircraft.manuals[index];
      aircraft.manuals.splice(index, 1);
      break;
    }
  }

  if (!foundManual || !foundAircraft) {
    return res.status(404).json({
      error: "Manual niet gevonden."
    });
  }

  if (foundManual.filename) {
    const filePath = path.join(
      MANUALS_DIR,
      path.basename(foundManual.filename)
    );

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  saveLibrary(library);
  res.json({ success: true });
});

// --------------------------------------------------
// AI PART FINDER
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post("/api/identify-part", async (req, res, next) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error:
          "AI is nog niet ingesteld. Voeg OPENAI_API_KEY toe bij Render Environment."
      });
    }

    const {
      aircraft = "",
      photo = "",
      sheets = [],
      pageCount = 0,
      ipcName = ""
    } = req.body || {};

    if (
      typeof photo !== "string" ||
      !photo.startsWith("data:image/")
    ) {
      return res.status(400).json({
        error: "Voeg eerst een geldige foto van het onderdeel toe."
      });
    }

    if (
      !Array.isArray(sheets) ||
      sheets.length < 1 ||
      sheets.length > 15
    ) {
      return res.status(400).json({
        error: "Stuur tussen 1 en 15 IPC-pagina-afbeeldingen mee."
      });
    }

    if (Number(pageCount) > 60) {
      return res.status(400).json({
        error: "Per analyse mogen maximaal 60 IPC-pagina's worden bekeken."
      });
    }

    const validSheets = sheets.filter(
      sheet =>
        typeof sheet === "string" &&
        sheet.startsWith("data:image/") &&
        sheet.length <= 8 * 1024 * 1024
    );

    if (validSheets.length !== sheets.length) {
      return res.status(400).json({
        error:
          "Een of meer IPC-afbeeldingen zijn ongeldig of groter dan 8 MB."
      });
    }

    const content = [
      {
        type: "input_text",
        text:
          `Je helpt bij het zoeken naar een vliegtuigonderdeel in een Illustrated Parts Catalog (IPC).\n` +
          `Aircraft type: ${String(aircraft).slice(0, 200) || "niet opgegeven"}\n` +
          `IPC-bestand: ${String(ipcName).slice(0, 200) || "niet opgegeven"}\n` +
          `Aantal IPC-pagina's: ${Number(pageCount) || "onbekend"}.\n\n` +
          `Vergelijk de foto met de meegestuurde IPC-pagina's. Geef alleen mogelijke overeenkomsten die door de afbeeldingen worden ondersteund. Verzin geen partnummers, paginanummers, figuren of itemnummers. Als tekst onleesbaar is of er geen betrouwbare overeenkomst is, zeg dat duidelijk.\n\n` +
          `Antwoord in het Nederlands als JSON-object met deze structuur:\n` +
          `{"matches":[{"partNumber":"...","description":"...","pageNumber":"...","figureItem":"...","confidence":"laag|gemiddeld|hoog","reason":"..."}],"notes":"..."}\n` +
          `Geef maximaal 5 mogelijke overeenkomsten. De resultaten moeten gecontroleerd worden in de officiële IPC.`
      },
      {
        type: "input_image",
        image_url: photo
      }
    ];

    for (const sheet of validSheets) {
      content.push({
        type: "input_image",
        image_url: sheet
      });
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
          input: [{ role: "user", content }],
          max_output_tokens: 1800
        })
      }
    );

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("OpenAI API-fout:", result);

      return res.status(502).json({
        error:
          "De AI kon de afbeelding niet analyseren. Controleer de API-sleutel en het API-tegoed bij OpenAI."
      });
    }

    const outputText =
      result.output_text ||
      (result.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n");

    if (!outputText) {
      return res.status(502).json({
        error: "De AI gaf geen herkenbaar antwoord terug."
      });
    }

    let parsed;

    try {
      const cleaned = outputText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { matches: [], notes: outputText };
    }

    res.json({
      success: true,
      ...parsed,
      warning:
        "AI-resultaten zijn suggesties. Controleer elk onderdeel, partnummer en itemnummer in de officiële IPC voordat je het gebruikt."
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// ADMIN PAGE
// --------------------------------------------------

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// --------------------------------------------------
// ROBOTS.TXT
// --------------------------------------------------

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
    "User-agent: *\nAllow: /\nDisallow: /api/\n"
  );
});

// --------------------------------------------------
// PUBLIC WEBSITE
// --------------------------------------------------

app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------
// ALLE ANDERE PAGINA'S
// --------------------------------------------------

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------------------------------
// FOUTAFHANDELING
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: `Je kunt maximaal ${MAX_FILES_PER_UPLOAD} bestanden per upload selecteren.`
      });
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Een bestand overschrijdt de maximale bestandsgrootte van 5 GB."
      });
    }

    return res.status(400).json({
      error: error.message || "Uploadfout."
    });
  }

  res.status(500).json({
    error: error.message || "Server error."
  });
});

// --------------------------------------------------
// SERVER STARTEN
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`AeroNex draait op poort ${PORT}`);
});
