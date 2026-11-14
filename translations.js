/* ==========================================================================
   Multilanguage support (EN / FR), no external libraries.

   1. `translations` object: `en` strings extracted from index.html plus
      idiomatic `fr` translations.
   2. Detection priority: `?lang=` URL parameter → localStorage →
      navigator.language → default `en`.
   3. On every set/toggle: persist to localStorage, update `<html lang>`,
      and sync the `?lang=` parameter via history.replaceState (no reload),
      so links can be shared directly in either language.
   4. Markup contract (see index.html):
        data-i18n            → textContent (plain text)
        data-i18n-html       → innerHTML (elements with inline tags)
        data-i18n-aria       → aria-label attribute
        data-i18n-title      → title attribute
        data-i18n-placeholder→ placeholder attribute
        data-i18n-alt        → alt attribute (images)
        data-i18n-role       → aria-roledescription attribute
        data-i18n-content    → content attribute (meta tags)
   5. Exposes `window.PortfolioI18N` (t / getLang / setLang) and dispatches a
      `portfolio:languagechange` event so script.js can refresh its own
      dynamic strings (theme aria-labels, copy-button feedback).
   ========================================================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "preferred-lang";
  const SUPPORTED = ["en", "fr"];

  const translations = {
    en: {
      "meta.title": "Dhia Sabri | Game Designer & Developer",
      "meta.description":
        "Portfolio of Dhia Sabri, a game designer and developer working across Unreal Engine and Unity, with a focus on mechanical and level design, 3D art, and interactive simulations.",

      "nav.aria": "Primary navigation",
      "nav.about": "About",
      "nav.projects": "Projects",
      "nav.contact": "Contact",

      "lang.aria": "Language",

      "theme.title": "Toggle light / dark theme",
      "theme.aria.light": "Switch to light theme",
      "theme.aria.dark": "Switch to dark theme",

      "menu.aria": "Menu",
      "menu.title": "Menu",
      "menu.open": "Open menu",
      "menu.close": "Close menu",

      "hero.card1.eyebrow": "Player one",
      "hero.card1.title": "The Game of Life",
      "hero.card1.class": "Class",
      "hero.card1.classValue": "Game Designer & Dev",
      "hero.card1.loadout": "Loadout",
      "hero.card1.loadoutValue": "Code and 3D",
      "hero.card1.perks": "Perks",
      "hero.card1.perksValue": "Jack Of All Trades",

      "hero.card2.eyebrow": "Current quest",
      "hero.card2.title": "How can you make it better?",
      "hero.card2.note": "I'm always open to research how...",

      "hero.badge": "🎮 Game Designer & Developer",
      "hero.title": "Hi, I'm <span class=\"grad\">Dhia Sabri</span>.<br>I make games.",
      "hero.bio":
        "Game Designer and Developer specializing in C# and C++ across Unity and Unreal Engine backed by 3D skills like modeling, texturing, and animation in Blender and Cascadeur. Experienced in building interactive simulations for training and research, managing projects, and utilizing Git version control. Adept at staying up to date, and integrating modern workflows, including running local AI tools, to bring technical and creative visions to life for freelance, part-time, and full-time roles.",
      "hero.cta": "View My Projects",

      "projects.title": "Projects",
      "projects.carouselAria": "Project showcase",
      "projects.carouselRole": "carousel",

      "project1.title": "TwinLight, Third-Person RPG Demo",
      "project1.desc":
        "A vertical-slice action RPG with parkour, combat, and cinematic cutscenes, built as a two-person bachelor capstone project (PFE) at Lanterns Studio and ISAMM. I designed the level layouts, modeled every building in Blender, programmed behavior trees for the enemy NPCs and the final boss, and directed motion-captured narrative sequences.",
      "project1.imgAlt": "TwinLight screenshot",

      "project2.title": "Board Game, Master's Semester Project",
      "project2.desc":
        "A tabletop project built with a team of five in my first Master's semester. I co-designed the core mechanics, rules, and thematic development, and created the 3D models that became the printed game tokens for the final prototype.",
      "project2.imgAlt": "Board Game screenshot",

      "project3.title": "Hemocrypt, Dungeon Bullet Hell",
      "project3.desc":
        "A four-person dungeon crawler where I picked up Godot mid-project and put it straight to work. I helped shape the core gameplay mechanics and rulesets, then produced the 3D assets end to end, from character models to environment design.",
      "project3.imgAlt": "Hemocrypt screenshot",

      "project4.title": "Consumerism-Satire Game Jam",
      "project4.desc":
        "A satirical, deliberately unclosable game about consumerism, made with a team of four. I co-designed the core gimmick, a gauntlet of hyper-casual games that transitions every time you fail, wrote VHS/VCR shaders in Godot for the retro sequences, built the endless-runner's 3D assets, and designed the parody ads in Photoshop.",
      "project4.imgAlt": "Game Jam screenshot",

      "project5.title": "World Generation, Master's Thesis",
      "project5.desc":
        "My thesis at Bahçeşehir University: an analytical prototype that switches level design between handcrafted and procedural generation inside a stylized 3D dungeon crawler. I built the game and custom camera occlusion in Unreal Engine 5, logged every playtest session through a REST-API pipeline, and validated findings with the GUESS questionnaires.",
      "project5.imgAlt": "Escape the Dungeon screenshot",

      "contact.title": "Let's make something players remember.",
      "contact.note":
        "I'm always up for collaborating on new concepts, game jams, or trading detailed playtesting feedback, and I'm open to freelance, part-time, and full-time opportunities. Whether you need systems tuned, levels paced, or 3D assets hand-built to fit a vision, send me a message and let's talk!",
      "contact.emailTitle": "Email address",
      "contact.copyTitle": "Copy email address to clipboard",
      "contact.copyEmail": "Copy Email",
      "contact.copied": "Copied!",
      "contact.selectCopy": "Select & copy above",
      "contact.sendTitle": "Open your email client",
      "contact.send": "Send Email",

      "footer.linkedinAria": "Dhia Sabri on LinkedIn (opens in a new tab)",
      "footer.discordAria": "Dhia Sabri's Discord server (opens in a new tab)",
    },

    fr: {
      "meta.title": "Dhia Sabri | Game Designer & Développeur",
      "meta.description":
        "Portfolio de Dhia Sabri, game designer et développeur de jeux travaillant sur Unreal Engine et Unity, avec un focus sur le design de mécaniques et de niveaux, la 3D et les simulations interactives.",

      "nav.aria": "Navigation principale",
      "nav.about": "À propos",
      "nav.projects": "Projets",
      "nav.contact": "Contact",

      "lang.aria": "Langue",

      "theme.title": "Basculer entre thème clair et sombre",
      "theme.aria.light": "Passer au thème clair",
      "theme.aria.dark": "Passer au thème sombre",

      "menu.aria": "Menu",
      "menu.title": "Menu",
      "menu.open": "Ouvrir le menu",
      "menu.close": "Fermer le menu",

      "hero.card1.eyebrow": "Joueur 1",
      "hero.card1.title": "Le Jeu de la Vie",
      "hero.card1.class": "Classe",
      "hero.card1.classValue": "Game Designer & Dév",
      "hero.card1.loadout": "Équipement",
      "hero.card1.loadoutValue": "Code et 3D",
      "hero.card1.perks": "Atouts",
      "hero.card1.perksValue": "Touche-à-tout",

      "hero.card2.eyebrow": "Quête en cours",
      "hero.card2.title": "Comment peux-tu l'améliorer ?",
      "hero.card2.note": "Toujours partant pour creuser la question…",

      "hero.badge": "🎮 Game Designer & Développeur",
      "hero.title": "Salut, moi c'est <span class=\"grad\">Dhia Sabri</span>.<br>Je crée des jeux.",
      "hero.bio":
        "Game designer et développeur spécialisé en C# et C++ sur Unity et Unreal Engine, doublé de compétences 3D : modélisation, texturing et animation dans Blender et Cascadeur. Expérimenté dans la création de simulations interactives pour la formation et la recherche, la gestion de projets et l'utilisation de Git pour le versioning. Toujours à l'affût des nouveautés, j'intègre des flux de travail modernes, dont l'usage d'outils d'IA en local, pour donner vie aux visions techniques et créatives, en freelance, à temps partiel ou à temps plein.",
      "hero.cta": "Voir mes projets",

      "projects.title": "Projets",
      "projects.carouselAria": "Vitrine de projets",
      "projects.carouselRole": "carrousel",

      "project1.title": "TwinLight, démo RPG à la troisième personne",
      "project1.desc":
        "Un RPG d'action en tranche verticale avec parkour, combat et cinématiques, réalisé comme projet de fin d'études (PFE) à deux chez Lanterns Studio et ISAMM. J'ai conçu les layouts de niveaux, modélisé chaque bâtiment dans Blender, programmé les arbres de comportement des PNJ ennemis et du boss final, et dirigé les séquences narratives en motion capture.",
      "project1.imgAlt": "Capture d'écran de TwinLight",

      "project2.title": "Jeu de société, projet de semestre de Master",
      "project2.desc":
        "Un projet de jeu de société mené à cinq dès mon premier semestre de Master. J'ai co-conçu les mécaniques centrales, les règles et le développement thématique, et créé les modèles 3D devenus les jetons imprimés du prototype final.",
      "project2.imgAlt": "Capture d'écran du jeu de société",

      "project3.title": "Hemocrypt, bullet hell en donjon",
      "project3.desc":
        "Un donjon crawler à quatre où j'ai pris Godot en main en plein projet et l'ai mis au travail immédiatement. J'ai contribué à façonner les mécaniques de jeu et les règles, puis produit les assets 3D de bout en bout, des modèles de personnages au design d'environnement.",
      "project3.imgAlt": "Capture d'écran d'Hemocrypt",

      "project4.title": "Game jam satire du consumérisme",
      "project4.desc":
        "Un jeu satirique et volontairement incassable sur le consumérisme, réalisé à quatre. J'ai co-conçu le gimmick central, un enchaînement de jeux hyper-casual qui change à chaque échec, écrit les shaders VHS/VCR dans Godot pour les séquences rétro, créé les assets 3D du runner sans fin et conçu les fausses publicités dans Photoshop.",
      "project4.imgAlt": "Capture d'écran du game jam",

      "project5.title": "Génération de monde, mémoire de Master",
      "project5.desc":
        "Mon mémoire à l'université Bahçeşehir : un prototype analytique qui fait basculer le level design entre création à la main et génération procédurale dans un donjon crawler 3D stylisé. J'ai développé le jeu et une occlusion de caméra sur mesure dans Unreal Engine 5, journalisé chaque session de playtest via un pipeline REST-API et validé les résultats avec les questionnaires GUESS.",
      "project5.imgAlt": "Capture d'écran d'Escape the Dungeon",

      "contact.title": "Créons quelque chose dont les joueurs se souviendront.",
      "contact.note":
        "Toujours partant pour collaborer sur de nouveaux concepts, des game jams ou échanger des retours de playtest détaillés, et ouvert aux opportunités en freelance, à temps partiel ou à temps plein. Que vous ayez besoin de systèmes équilibrés, de niveaux bien rythmés ou d'assets 3D façonnés à la main pour coller à une vision, écrivez-moi et discutons !",
      "contact.emailTitle": "Adresse e-mail",
      "contact.copyTitle": "Copier l'adresse e-mail dans le presse-papiers",
      "contact.copyEmail": "Copier l'e-mail",
      "contact.copied": "Copié !",
      "contact.selectCopy": "Sélectionnez et copiez ci-dessus",
      "contact.sendTitle": "Ouvrir votre client e-mail",
      "contact.send": "Envoyer un e-mail",

      "footer.linkedinAria": "Dhia Sabri sur LinkedIn (s'ouvre dans un nouvel onglet)",
      "footer.discordAria": "Serveur Discord de Dhia Sabri (s'ouvre dans un nouvel onglet)",
    },
  };

  /* ---------- Storage (same defensive style as script.js) ---------- */
  const readStoredLang = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null; // storage unavailable (private mode, file:// restrictions, …)
    }
  };

  const storeLang = (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* non-fatal */
    }
  };

  /* ---------- Detection: ?lang= → localStorage → navigator.language ---------- */
  const detectLang = () => {
    try {
      const param = new URLSearchParams(window.location.search).get("lang");
      if (param && SUPPORTED.includes(param.toLowerCase())) {
        return param.toLowerCase();
      }
    } catch {
      /* non-fatal */
    }

    const stored = readStoredLang();
    if (stored && SUPPORTED.includes(stored)) return stored;

    const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    return SUPPORTED.find((code) => preferred.toLowerCase().startsWith(code)) || "en";
  };

  let current = detectLang();

  /* ---------- Lookup (falls back to English, then the key itself) ---------- */
  const t = (key) => {
    const dict = translations[current] || translations.en;
    if (key in dict) return dict[key];
    return key in translations.en ? translations.en[key] : key;
  };

  /* ---------- Apply the current language to the whole document ---------- */
  const applyTranslations = () => {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      el.setAttribute("alt", t(el.dataset.i18nAlt));
    });
    document.querySelectorAll("[data-i18n-role]").forEach((el) => {
      el.setAttribute("aria-roledescription", t(el.dataset.i18nRole));
    });
    document.querySelectorAll("[data-i18n-content]").forEach((el) => {
      el.setAttribute("content", t(el.dataset.i18nContent));
    });

    // Keep both toggles (header + drawer) in sync with the active language.
    document.querySelectorAll(".lang-toggle .lang-btn").forEach((btn) => {
      const active = btn.dataset.lang === current;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  };

  /* ---------- Keep ?lang= shareable without reloading ---------- */
  const syncUrl = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", current);
      window.history.replaceState(null, "", url.href);
    } catch {
      /* non-fatal */
    }
  };

  const setLang = (lang) => {
    if (!SUPPORTED.includes(lang)) return;

    current = lang;
    storeLang(lang);
    document.documentElement.lang = lang;

    applyTranslations();
    syncUrl();

    // script.js listens to this to refresh its own dynamic strings.
    document.dispatchEvent(new CustomEvent("portfolio:languagechange", { detail: { lang } }));
  };

  /* ---------- Toggle buttons (header + drawer) ---------- */
  document.querySelectorAll(".lang-toggle .lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  // Deferred scripts run after the DOM is parsed: apply right away.
  document.documentElement.lang = current;
  applyTranslations();
  syncUrl();

  // Tiny API for script.js (theme aria-labels, copy-button labels).
  window.PortfolioI18N = { t, getLang: () => current, setLang };
})();
