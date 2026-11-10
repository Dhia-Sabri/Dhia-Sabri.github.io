/* ==========================================================================
   Portfolio interactions:
   1. Dark/light theme toggle (persisted in localStorage, dark = default)
   2. Smooth scrolling for all in-page anchor links
   3. Active nav-link highlighting while scrolling
   4. "Copy Email" button with clipboard fallback
   5. Projects carousel: infinite looping hero slider (wheel, swipe, click, arrow keys)
   6. Mobile drawer menu: hamburger toggle; backdrop, Escape, and link picks close it
   ========================================================================== */

(() => {
  "use strict";

  const body = document.body;
  const THEME_KEY = "preferred-theme";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Theme switching ---------- */
  // Both the nav bar and the mobile drawer have a toggle.
  const themeToggles = Array.from(document.querySelectorAll(".theme-toggle"));
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  const readStoredTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null; // storage unavailable (private mode, file:// restrictions, …)
    }
  };

  const storeTheme = (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* non-fatal */
    }
  };

  const applyTheme = (theme) => {
    const isLight = theme === "light";
    body.classList.toggle("light-theme", isLight);
    themeToggles.forEach((toggle) => {
      toggle.setAttribute("aria-pressed", String(isLight));
      toggle.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    });
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", isLight ? "#e2e8f0" : "#1e1b4b");
    }
  };

  // Dark mode is the default whenever nothing (or something invalid) is stored.
  let currentTheme = readStoredTheme() === "light" ? "light" : "dark";
  applyTheme(currentTheme);

  themeToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      currentTheme = body.classList.contains("light-theme") ? "dark" : "light";
      applyTheme(currentTheme);
      storeTheme(currentTheme);
    });
  });

  /* ---------- 2. Smooth scrolling for all in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.hash;
      if (!hash || hash.length < 2) return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });

      // Keep the URL shareable without triggering a native jump.
      try {
        history.replaceState(null, "", hash);
      } catch {
        /* non-fatal */
      }
    });
  });

  /* ---------- 3. Active nav link while scrolling ---------- */
  // Both the inline nav and the mobile drawer highlight the current section.
  const navLinks = new Map();
  document.querySelectorAll(".nav-links a, .drawer-links a").forEach((link) => {
    const links = navLinks.get(link.hash) || [];
    links.push(link);
    navLinks.set(link.hash, links);
  });

  const setActive = (hash) => {
    if (!navLinks.has(hash)) return;
    navLinks.forEach((links, key) => {
      links.forEach((link) => link.classList.toggle("is-active", key === hash));
    });
  };

  if ("IntersectionObserver" in window && navLinks.size > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      // A narrow band around the viewport middle decides the "current" section.
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    navLinks.forEach((_link, hash) => {
      const section = document.querySelector(hash);
      if (section) observer.observe(section);
    });
  }

  // Bottom of the page: make sure Contact stays highlighted.
  window.addEventListener(
    "scroll",
    () => {
      const scrollBottom = window.innerHeight + Math.ceil(window.scrollY);
      if (scrollBottom >= document.documentElement.scrollHeight - 32) {
        setActive("#contact");
      }
    },
    { passive: true }
  );

  /* ---------- 4. Copy Email button ---------- */
  const copyButton = document.getElementById("copy-email");
  const emailText = document.getElementById("email-text");
  const copyLabel = document.getElementById("copy-label");

  if (copyButton && emailText && copyLabel) {
    const originalLabel = copyLabel.textContent;
    let resetTimer = null;

    const flashLabel = (message) => {
      copyLabel.textContent = message;
      copyButton.classList.add("is-copied");
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        copyLabel.textContent = originalLabel;
        copyButton.classList.remove("is-copied");
      }, 2000);
    };

    const copyViaExecCommand = (email) => {
      const scratch = document.createElement("textarea");
      scratch.value = email;
      scratch.setAttribute("readonly", "");
      scratch.style.position = "fixed";
      scratch.style.opacity = "0";
      document.body.appendChild(scratch);
      scratch.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      scratch.remove();
      return ok;
    };

    copyButton.addEventListener("click", async () => {
      const email = emailText.textContent.trim();
      if (!email) return;

      try {
        await navigator.clipboard.writeText(email);
        flashLabel("Copied!");
      } catch {
        // Clipboard API can be blocked (e.g. insecure context), so fall back.
        if (copyViaExecCommand(email)) {
          flashLabel("Copied!");
        } else {
          flashLabel("Select & copy above");
        }
      }
    });
  }

  /* ---------- 5. Projects carousel: infinite looping hero slider ---------- */
  const carousel = document.querySelector(".carousel");

  if (carousel) {
    const cards = Array.from(carousel.querySelectorAll(".project-card"));
    const count = cards.length;

    let activeIndex = 0;
    let wheelLock = null; // one card per wheel gesture
    let dragged = false;  // suppress the click that follows a swipe/drag

    const mod = (value, n) => ((value % n) + n) % n;

    // Shortest signed loop distance from the active card (-2..2 for five).
    // This is what makes the carousel infinite: "past the end" simply
    // becomes "+1 step from the other side", in either direction.
    const signedOffset = (index) => {
      const rel = mod(index - activeIndex, count);
      return rel > count / 2 ? rel - count : rel;
    };

    // Only the focused card is fully visible; neighbours fade hard and the
    // far cards stay faint at the screen edges. A card that wraps around
    // slides off past the screen edge while fading out and, at the same
    // time, a ghost double of it slides in from beyond the opposite edge,
    // fading in. Both sides share the deck's glide duration and curve, so
    // exit and entrance are perfectly mirrored and in rhythm with the deck.
    const opacityFor = (distance) =>
      distance === 0 ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.2 : 0;
    const scaleFor = (distance) => (distance === 0 ? 1 : distance === 1 ? 0.8 : 0.7);

    // Each card's last known slot, used to detect side-switching wraps.
    const offsets = new Map();
    // Wraps still in flight (index -> { anims, ghost }).
    const wrapAnims = new Map();

    // Keep these in sync with .project-card's transition in styles.css
    // (--slide-time and its curves): wraps must move exactly like normal
    // slot glides, or the wrap entrance reads out of rhythm with the deck.
    const SLIDE_MS = 550; // = --slide-time
    const SLIDE_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)"; // deck's glide curve

    // Non-geometry state: stacking, active/ghost flags, screen-reader hidden.
    const setState = (card, distance) => {
      card.style.setProperty("--z", String(count - distance));
      card.classList.toggle("is-active", distance === 0);
      card.classList.toggle("is-ghost", distance >= 3);
      card.setAttribute("aria-hidden", String(distance !== 0));
    };

    // Geometry: slot position + scale (the parts that glide between slots).
    const setGeometry = (card, offset, distance) => {
      card.style.setProperty("--offset", String(offset));
      card.style.setProperty("--scale", String(scaleFor(distance)));
    };

    // Jump the card to its new slot in a single unanimated frame.
    const teleport = (card, offset, distance) => {
      card.classList.add("is-teleporting");
      setGeometry(card, offset, distance);
      void card.offsetWidth; // flush so the jump happens instantly
      card.classList.remove("is-teleporting");
    };

    // Distance (px) a far card must travel past its slot to be fully outside
    // the viewport, so wraps always exit toward and enter in from beyond
    // the screen edge, whatever the screen size. (0.85 = the --slide-gap
    // factor in styles.css; 0.7 = scaleFor(2).)
    const slideDistance = (card) => {
      const cardW = card.getBoundingClientRect().width / scaleFor(2);
      const gap = cardW * 0.85;
      const beyond = Math.max(0, window.innerWidth / 2 + cardW / 2 - 2 * gap);
      return beyond + cardW * 0.12;
    };

    const render = () => {
      cards.forEach((card, index) => {
        const offset = signedOffset(index);
        const distance = Math.abs(offset);
        const prev = offsets.get(index);
        const pending = wrapAnims.get(index);

        if (pending) {
          // A wrap is still animating: cancel it, drop the ghost double, and
          // teleport the real card invisibly to its new slot, letting the
          // stylesheet transition fade it back in.
          pending.anims.forEach((anim) => anim && anim.cancel());
          pending.ghost.remove();
          wrapAnims.delete(index);
          card.classList.add("is-teleporting");
          card.style.setProperty("--opacity", "0");
          setGeometry(card, offset, distance);
          setState(card, distance);
          void card.offsetWidth; // flush styles so the jump isn't animated
          card.classList.remove("is-teleporting");
          card.style.setProperty("--opacity", String(opacityFor(distance)));
          offsets.set(index, offset);
          return;
        }

        // A normal step moves a card by one slot; a wrap switches sides
        // (e.g. -2 -> +2), which is a jump of more than half the deck.
        const wrapped = prev !== undefined && Math.abs(offset - prev) > count / 2 + 0.5;

        if (wrapped) {
          setState(card, distance);

          if (prefersReducedMotion) {
            // Reduced motion: everything is instant anyway.
            teleport(card, offset, distance);
            card.style.setProperty("--opacity", String(opacityFor(distance)));
            offsets.set(index, offset);
            return;
          }

          // One card can't be on both edges at once, so a ghost double plays
          // the entrance on the far side while the real card plays the exit,
          // two mirrored animations running at the same time.
          const exitX = slideDistance(card) * Math.sign(prev);
          const enterX = slideDistance(card) * Math.sign(offset);
          const target = opacityFor(distance);
          const from = parseFloat(getComputedStyle(card).opacity) || 0;

          const ghost = card.cloneNode(true);
          ghost.setAttribute("aria-hidden", "true");
          ghost.classList.add("is-ghost"); // never catches clicks
          ghost.style.setProperty("--offset", String(offset));
          ghost.style.setProperty("--scale", String(scaleFor(distance)));
          ghost.style.setProperty("--z", String(count - distance));
          carousel.appendChild(ghost);

          // Movement and fade are separate animations so each uses the exact
          // curve the deck uses for it: the slide glides on the decelerating
          // slot curve, the opacity fades on plain ease, mirrored both sides.
          // Real card: glide out toward (and past) the screen edge while
          // dissolving…
          const outMove = card.animate(
            [{ translate: "0px 0" }, { translate: `${exitX}px 0` }],
            { duration: SLIDE_MS, easing: SLIDE_EASING, fill: "forwards" }
          );
          const outFade = card.animate(
            [{ opacity: from }, { opacity: 0 }],
            { duration: SLIDE_MS, easing: "ease", fill: "forwards" }
          );

          // …while the ghost glides in from beyond the opposite edge,
          // materializing and landing exactly like a normal slot glide.
          const inMove = ghost.animate(
            [{ translate: `${enterX}px 0` }, { translate: "0px 0" }],
            { duration: SLIDE_MS, easing: SLIDE_EASING, fill: "forwards" }
          );
          const inFade = ghost.animate(
            [{ opacity: 0 }, { opacity: target }],
            { duration: SLIDE_MS, easing: "ease", fill: "forwards" }
          );

          outFade.onfinish = () => {
            // Both fades are done and the ghost stands exactly where the real
            // card belongs: teleport the real card in while it is still held
            // invisible, release the holds, then drop the ghost, no seam.
            teleport(card, offset, distance);
            outMove.cancel();
            outFade.cancel();
            card.style.setProperty("--opacity", String(target));
            ghost.remove();
            offsets.set(index, offset);
            wrapAnims.delete(index);
          };

          wrapAnims.set(index, { anims: [outMove, outFade, inMove, inFade], ghost });
          return;
        }

        setGeometry(card, offset, distance);
        setState(card, distance);
        card.style.setProperty("--opacity", String(opacityFor(distance)));
        offsets.set(index, offset);
      });
    };

    const step = (direction) => {
      activeIndex = mod(activeIndex + direction, count);
      render();
    };

    // Wheel: one card per gesture, in either direction, forever.
    carousel.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey) return; // let pinch-zoom through

        // Trackpads report horizontal deltas; pick the dominant axis.
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (Math.abs(delta) < 5) return;

        // The loop never ends, so the wheel always belongs to the carousel.
        event.preventDefault();

        if (wheelLock) return;
        // One gesture per animation cycle: the lock spans a full wrap
        // (SLIDE_MS) plus a little slack, so wraps complete cleanly.
        wheelLock = window.setTimeout(() => {
          wheelLock = null;
        }, 600);

        step(delta > 0 ? 1 : -1);
      },
      { passive: false } // required for preventDefault() to work
    );

    // Swipe / drag: horizontal flicks past a threshold switch cards.
    let startX = null;

    carousel.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      startX = event.clientX;
      dragged = false;
    });

    carousel.addEventListener("pointermove", (event) => {
      if (startX === null) return;
      if (Math.abs(event.clientX - startX) > 10) dragged = true;
    });

    carousel.addEventListener("pointerup", (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) {
        dragged = true;
        step(dx < 0 ? 1 : -1);
      }
    });

    carousel.addEventListener("pointercancel", () => {
      startX = null;
    });

    // Clicking a faded neighbour walks one step toward it.
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        if (dragged) {
          dragged = false;
          return;
        }
        const offset = signedOffset(cards.indexOf(card));
        if (offset !== 0) step(offset > 0 ? 1 : -1);
      });
    });

    // Keyboard: arrows while the carousel has focus.
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    });

    render();
  }

  /* ---------- 6. Mobile drawer menu ---------- */
  const navToggle = document.getElementById("nav-toggle");
  const drawer = document.getElementById("drawer-menu");

  if (navToggle && drawer) {
    const isOpen = () => body.classList.contains("nav-open");

    const openDrawer = () => {
      body.classList.add("nav-open");
      navToggle.setAttribute("aria-expanded", "true");
      drawer.querySelector(".drawer-close").focus();
    };

    const closeDrawer = (restoreFocus = false) => {
      body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) navToggle.focus();
    };

    navToggle.addEventListener("click", () => {
      isOpen() ? closeDrawer(true) : openDrawer();
    });

    // Backdrop and ✕ button close the drawer…
    drawer.querySelectorAll("[data-drawer-close]").forEach((element) => {
      element.addEventListener("click", () => closeDrawer());
    });

    // …and so does choosing a destination from it (smooth scroll keeps working).
    drawer.querySelectorAll(".drawer-links a").forEach((link) => {
      link.addEventListener("click", () => closeDrawer());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) closeDrawer(true);
    });
  }
})();
