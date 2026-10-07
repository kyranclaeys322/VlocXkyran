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


// --------------------------------------------------
// MAPPEN AANMAKEN
// --------------------------------------------------

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MANUALS_DIR, { recursive: true });


// --------------------------------------------------
// LIBRARY LADEN
// --------------------------------------------------

function loadLibrary() {

  if (!fs.existsSync(LIBRARY_FILE)) {

    const emptyLibrary = {
      aircraft: []
    };

    fs.writeFileSync(
      LIBRARY_FILE,
      JSON.stringify(emptyLibrary, null, 2)
    );

    return emptyLibrary;
  }


  try {

    const data =
      JSON.parse(
        fs.readFileSync(
          LIBRARY_FILE,
          "utf8"
        )
      );


    if (!data.aircraft) {
      data.aircraft = [];
    }


    return data;

  } catch (error) {

    console.error(
      "Library kon niet worden gelezen:",
      error
    );

    return {
      aircraft: []
    };

  }

}


// --------------------------------------------------
// LIBRARY OPSLAAN
// --------------------------------------------------

function saveLibrary(library) {

  fs.writeFileSync(
    LIBRARY_FILE,
    JSON.stringify(
      library,
      null,
      2
    )
  );

}


// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


app.use(
  session({

    secret:
      process.env.SESSION_SECRET ||
      "CHANGE-THIS-SECRET",

    resave: false,

    saveUninitialized: false,

    cookie: {

      secure:
        process.env.NODE_ENV === "production",

      httpOnly: true,

      sameSite: "lax"

    }

  })
);


// --------------------------------------------------
// PDF UPLOAD
// --------------------------------------------------

const storage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {

        cb(
          null,
          MANUALS_DIR
        );

      },


    filename:
      function (
        req,
        file,
        cb
      ) {

        const safeName =
          path.basename(
            file.originalname
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


        const uniqueName =
          Date.now() +
          "_" +
          safeName;


        cb(
          null,
          uniqueName
        );

      }

  });


const upload =
  multer({

    storage,

    limits: {

      fileSize:
        5 * 1024 * 1024 * 1024

    },


    fileFilter:
      function (
        req,
        file,
        cb
      ) {

        const isPdf =
          file.mimetype ===
          "application/pdf"
          ||
          path
            .extname(
              file.originalname
            )
            .toLowerCase() ===
          ".pdf";


        if (!isPdf) {

          return cb(
            new Error(
              "Alleen PDF-bestanden zijn toegestaan."
            )
          );

        }


        cb(
          null,
          true
        );

      }

  });


// --------------------------------------------------
// ADMIN AUTH
// --------------------------------------------------

function requireAdmin(
  req,
  res,
  next
) {

  if (
    req.session &&
    req.session.isAdmin
  ) {

    return next();

  }


  res
    .status(401)
    .json({
      error:
        "Niet ingelogd als admin."
    });

}


// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post(
  "/api/login",
  (req, res) => {

    const {
      username,
      password
    } = req.body;


    const adminUsername =
      process.env.ADMIN_USERNAME;

    const adminPassword =
      process.env.ADMIN_PASSWORD;


    if (
      username ===
        adminUsername
      &&
      password ===
        adminPassword
    ) {

      req.session.isAdmin =
        true;


      return res.json({
        success: true
      });

    }


    res
      .status(401)
      .json({
        error:
          "Verkeerde gebruikersnaam of wachtwoord."
      });

  }
);


// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

app.post(
  "/api/logout",
  (req, res) => {

    req.session.destroy(
      () => {

        res.json({
          success: true
        });

      }
    );

  }
);


// --------------------------------------------------
// CHECK LOGIN
// --------------------------------------------------

app.get(
  "/api/me",
  (req, res) => {

    res.json({

      loggedIn:
        !!(
          req.session &&
          req.session.isAdmin
        )

    });

  }
);


// --------------------------------------------------
// PUBLIC LIBRARY
// --------------------------------------------------

app.get(
  "/api/library",
  (req, res) => {

    const library =
      loadLibrary();


    res.json(
      library
    );

  }
);


// --------------------------------------------------
// PDF SERVER
// --------------------------------------------------

app.get(
  "/manuals/:filename",
  (req, res) => {

    const filename =
      path.basename(
        req.params.filename
      );


    const filePath =
      path.join(
        MANUALS_DIR,
        filename
      );


    if (
      !fs.existsSync(
        filePath
      )
    ) {

      return res
        .status(404)
        .send(
          "Manual niet gevonden."
        );

    }


    res.sendFile(
      filePath
    );

  }
);


// --------------------------------------------------
// AIRCRAFT TOEVOEGEN
// --------------------------------------------------

app.post(
  "/api/admin/aircraft",
  requireAdmin,
  (req, res) => {

    const {
      name
    } = req.body;


    if (!name || !name.trim()) {

      return res
        .status(400)
        .json({
          error:
            "Aircraft naam ontbreekt."
        });

    }


    const library =
      loadLibrary();


    const aircraft = {

      id:
        Date.now().toString(),

      name:
        name.trim(),

      manuals: []

    };


    library.aircraft.push(
      aircraft
    );


    saveLibrary(
      library
    );


    res.json({
      success: true,
      aircraft
    });

  }
);


// --------------------------------------------------
// AIRCRAFT WIJZIGEN
// --------------------------------------------------

app.put(
  "/api/admin/aircraft/:id",
  requireAdmin,
  (req, res) => {

    const library =
      loadLibrary();


    const aircraft =
      library.aircraft.find(
        a =>
          String(a.id) ===
          String(req.params.id)
      );


    if (!aircraft) {

      return res
        .status(404)
        .json({
          error:
            "Aircraft niet gevonden."
        });

    }


    if (
      req.body.name &&
      req.body.name.trim()
    ) {

      aircraft.name =
        req.body.name.trim();

    }


    saveLibrary(
      library
    );


    res.json({
      success: true,
      aircraft
    });

  }
);


// --------------------------------------------------
// AIRCRAFT VERWIJDEREN
// --------------------------------------------------

app.delete(
  "/api/admin/aircraft/:id",
  requireAdmin,
  (req, res) => {

    const library =
      loadLibrary();


    const index =
      library.aircraft.findIndex(
        a =>
          String(a.id) ===
          String(req.params.id)
      );


    if (index === -1) {

      return res
        .status(404)
        .json({
          error:
            "Aircraft niet gevonden."
        });

    }


    const aircraft =
      library.aircraft[index];


    /*
      Alle bijhorende PDF's verwijderen.
    */

    for (
      const manual of
      aircraft.manuals || []
    ) {

      if (
        manual.filename
      ) {

        const filePath =
          path.join(
            MANUALS_DIR,
            path.basename(
              manual.filename
            )
          );


        if (
          fs.existsSync(
            filePath
          )
        ) {

          fs.unlinkSync(
            filePath
          );

        }

      }

    }


    library.aircraft.splice(
      index,
      1
    );


    saveLibrary(
      library
    );


    res.json({
      success: true
    });

  }
);


// --------------------------------------------------
// MANUALS UPLOADEN
// --------------------------------------------------

app.post(
  "/api/admin/manuals",
  requireAdmin,
  upload.array(
    "manuals",
    4
  ),
  (req, res) => {

    const aircraftId =
      req.query.aircraftId;


    const type =
      String(
        req.query.type ||
        req.body.type ||
        "AMM"
      ).toUpperCase();


    if (
      type !== "AMM" &&
      type !== "IPC"
    ) {

      return res
        .status(400)
        .json({
          error:
            "Manual type moet AMM of IPC zijn."
        });

    }


    const library =
      loadLibrary();


    const aircraft =
      library.aircraft.find(
        a =>
          String(a.id) ===
          String(aircraftId)
      );


    if (!aircraft) {

      return res
        .status(404)
        .json({
          error:
            "Aircraft niet gevonden."
        });

    }


    if (!aircraft.manuals) {

      aircraft.manuals = [];

    }


    /*
      Maximaal 4 manuals per aircraft.
    */

    if (
      aircraft.manuals.length +
      (req.files || []).length >
      4
    ) {

      /*
        Uploads die niet mogen blijven,
        verwijderen.
      */

      for (
        const file of
        req.files || []
      ) {

        if (
          fs.existsSync(
            file.path
          )
        ) {

          fs.unlinkSync(
            file.path
          );

        }

      }


      return res
        .status(400)
        .json({
          error:
            "Maximum 4 manuals per aircraft."
        });

    }


    const added =
      [];


    for (
      const file of
      req.files || []
    ) {

      const manual = {

        id:
          Date.now().toString() +
          "_" +
          Math.random()
            .toString(36)
            .substring(2, 8),

        name:
          path
            .basename(
              file.originalname,
              path.extname(
                file.originalname
              )
            ),

        filename:
          path.basename(
            file.filename
          ),

        type:

          type,

        url:
          "/manuals/" +
          encodeURIComponent(
            path.basename(
              file.filename
            )
          )

      };


      aircraft.manuals.push(
        manual
      );


      added.push(
        manual
      );

    }


    saveLibrary(
      library
    );


    res.json({

      success: true,

      type,

      manuals:
        added

    });

  }
);


// --------------------------------------------------
// MANUAL VERWIJDEREN
// --------------------------------------------------

app.delete(
  "/api/admin/manuals/:id",
  requireAdmin,
  (req, res) => {

    const library =
      loadLibrary();


    let foundManual =
      null;


    let foundAircraft =
      null;


    for (
      const aircraft of
      library.aircraft
    ) {

      const index =
        (aircraft.manuals || [])
          .findIndex(
            manual =>
              String(manual.id) ===
              String(req.params.id)
          );


      if (index !== -1) {

        foundAircraft =
          aircraft;

        foundManual =
          aircraft.manuals[index];

        aircraft.manuals.splice(
          index,
          1
        );

        break;

      }

    }


    if (
      !foundManual ||
      !foundAircraft
    ) {

      return res
        .status(404)
        .json({
          error:
            "Manual niet gevonden."
        });

    }


    if (
      foundManual.filename
    ) {

      const filePath =
        path.join(
          MANUALS_DIR,
          path.basename(
            foundManual.filename
          )
        );


      if (
        fs.existsSync(
          filePath
        )
      ) {

        fs.unlinkSync(
          filePath
        );

      }

    }


    saveLibrary(
      library
    );


    res.json({
      success: true
    });

  }
);


// --------------------------------------------------
// ADMIN PAGE
// --------------------------------------------------

app.get(
  "/admin",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "admin.html"
      )
    );

  }
);


// --------------------------------------------------
// PUBLIC WEBSITE
// --------------------------------------------------

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


// --------------------------------------------------
// ALLE ANDERE PAGINA'S
// --------------------------------------------------

app.get(
  "*",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


// --------------------------------------------------
// FOUTAFHANDELING
// --------------------------------------------------

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      error
    );


    res
      .status(500)
      .json({
        error:
          error.message ||
          "Server error."
      });

  }
);


// --------------------------------------------------
// SERVER STARTEN
// --------------------------------------------------

app.listen(
  PORT,
  () => {

    console.log(
      `VlocX Kyran draait op poort ${PORT}`
    );

  }
);
