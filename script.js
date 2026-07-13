// Bump this when data/assets change so browsers fetch fresh files.
const ASSET_VERSION = "4";
const dataUrl = (name) => `${name}?v=${ASSET_VERSION}`;

// --- UI enhancements: reveal-on-scroll, subtle parallax, scrollspy ---
const initUiEnhancements = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  const navLinks = Array.from(document.querySelectorAll(".navbar .nav-link"));

  // Map each nav link to the section element it points at (#top => hero/about).
  const spyTargets = navLinks
    .map((link) => {
      const hash = (link.getAttribute("href") || "").replace("#", "");
      const id = hash === "top" ? "about" : hash;
      const section = document.getElementById(id);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  const setActiveLink = () => {
    if (!spyTargets.length) return;
    const marker = window.scrollY + 120; // just below the sticky navbar
    let current = spyTargets[0];
    for (const target of spyTargets) {
      if (target.section.offsetTop <= marker) current = target;
    }
    navLinks.forEach((l) => l.classList.remove("active-section"));
    if (current) current.link.classList.add("active-section");
  };

  const onScroll = () => {
    if (!prefersReducedMotion) {
      const y = window.scrollY;
      for (const el of parallaxEls) {
        const factor = parseFloat(el.dataset.parallax) || 0;
        el.style.transform = `translate3d(0, ${(y * factor).toFixed(1)}px, 0)`;
      }
    }
    setActiveLink();
  };

  // rAF-throttled scroll listener
  let ticking = false;
  const requestTick = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick, { passive: true });
  onScroll();

  // Reveal-on-scroll with a gentle per-group stagger.
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    // Stagger siblings that share a parent so groups cascade in.
    const groupCounters = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      const n = groupCounters.get(parent) || 0;
      groupCounters.set(parent, n + 1);
      el.style.transitionDelay = `${Math.min(n * 90, 360)}ms`;
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // Close the mobile menu after tapping a nav link.
  const navCollapse = document.getElementById("navbarNav");
  if (navCollapse) {
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (navCollapse.classList.contains("show") && window.bootstrap) {
          window.bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
        }
      });
    });
  }
};

// --- Fit a timeline's rail so it spans only from the first dot to the last ---
const fitTimelineRail = (container) => {
  if (!container) return;
  const apply = () => {
    const entries = container.querySelectorAll(".timeline-entry");
    if (!entries.length) return;
    const dotCenter = 11; // dot top (7px) + ~half the 9px dot
    const top = entries[0].offsetTop + dotCenter;
    // Anchor the rail at the first dot (closed top); let it run open to the bottom.
    const height = Math.max(0, container.clientHeight - top);
    container.style.setProperty("--rail-top", `${top}px`);
    container.style.setProperty("--rail-height", `${height}px`);
  };
  apply();
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(apply, 150);
  }, { passive: true });
};

// --- Scroll-linked motion for project images (top-left stays pinned) ---
const initImageParallax = (images) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!images.length) return;

  let ticking = false;
  const update = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    images.forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return; // skip off-screen
      // progress 0 (entering from bottom) -> 1 (leaving past top)
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const scale = (1 + p * 0.07).toFixed(4);
      img.style.transform = `scale(${scale})`;
    });
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
};

// --- Horizontal project carousel: arrows, dots, swipe, gentle auto-rotate ---
const initProjectCarousel = ({ carousel, track, prevBtn, nextBtn, dots }) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cards = Array.from(track.children);
  if (!cards.length) return;

  const AUTO_MS = 6500;
  let autoTimer = null;
  let step = track.clientWidth;   // width of one card incl. gap
  let perView = 1;
  let pageCount = 1;

  const measure = () => {
    step = cards.length > 1 ? Math.round(cards[1].offsetLeft - cards[0].offsetLeft) : track.clientWidth;
    if (step < 1) step = track.clientWidth;
    perView = Math.max(1, Math.round(track.clientWidth / step));
    pageCount = Math.max(1, Math.ceil(cards.length / perView));
  };

  const currentPage = () => Math.round(track.scrollLeft / (perView * step));

  const goToPage = (page) => {
    const p = ((page % pageCount) + pageCount) % pageCount; // wrap both ways
    track.scrollTo({ left: p * perView * step, behavior: "smooth" });
  };

  const buildDots = () => {
    dots.innerHTML = "";
    for (let i = 0; i < pageCount; i++) {
      const dot = document.createElement("button");
      dot.className = "carousel-dot";
      dot.setAttribute("aria-label", `Go to project group ${i + 1}`);
      dot.addEventListener("click", () => { goToPage(i); restartAuto(); });
      dots.appendChild(dot);
    }
    updateUI();
  };

  const updateUI = () => {
    const cur = currentPage();
    Array.from(dots.children).forEach((d, i) => d.classList.toggle("active", i === cur));
    const single = pageCount <= 1;
    carousel.classList.toggle("is-single", single);
  };

  const stopAuto = () => { clearInterval(autoTimer); autoTimer = null; };
  const startAuto = () => {
    if (prefersReducedMotion || pageCount <= 1) return;
    stopAuto();
    autoTimer = setInterval(() => goToPage(currentPage() + 1), AUTO_MS);
  };
  const restartAuto = () => { if (autoTimer) startAuto(); };

  prevBtn.addEventListener("click", () => { goToPage(currentPage() - 1); restartAuto(); });
  nextBtn.addEventListener("click", () => { goToPage(currentPage() + 1); restartAuto(); });

  // Reflect scroll position in dots (throttled)
  let ticking = false;
  track.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => { updateUI(); ticking = false; });
  }, { passive: true });

  // Pause auto-rotation while the user is engaging with it
  ["mouseenter", "focusin", "touchstart", "pointerdown"].forEach((ev) =>
    carousel.addEventListener(ev, stopAuto, { passive: true }));
  ["mouseleave", "focusout"].forEach((ev) =>
    carousel.addEventListener(ev, startAuto, { passive: true }));

  const setup = () => { measure(); buildDots(); };
  setup();
  startAuto();

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const page = currentPage();
      setup();
      track.scrollTo({ left: page * perView * step });
    }, 150);
  }, { passive: true });
};

const init = () => {
  initUiEnhancements();

  // Helper to create one publication block with image + optional toggle
  const createPublicationBlock = (pub, index) => {
    const idSuffix = `${pub.type.replace("-", "")}${index}`;
    const awardBadge = pub.bestPaperAward
      ? '<span class="badge bg-warning text-dark ms-2">🏆 Best Paper Award</span>'
      : '';

    const collapsedHeader = `
      <div class="d-flex align-items-start publication-header collapsed"
          data-bs-toggle="collapse" data-bs-target="#details-${idSuffix}" 
          aria-expanded="false" aria-controls="details-${idSuffix}">
        <span class="collapse-icon mt-1">▸</span>
        <div class="ms-2">
          <span class="fw-semibold">${pub.title}</span> ${awardBadge}
          <div class="text-muted small mt-1">${pub.published || pub.date} • ${pub.category || "Article"}</div>
        </div>
      </div>
    `;

    const expandedContent = `
      <div class="collapse mt-3" id="details-${idSuffix}">
        <div class="publication-details-box">
          <div class="row g-3 align-items-start">
            <div class="col-md-8">
              ${pub.journal ? `<p class="mb-2"><strong>Journal:</strong> ${pub.journal}</p>` : ""}
              ${pub.conference ? `<p class="mb-2"><strong>Conference:</strong> ${pub.conference}</p>` : ""}
              ${pub.abstract ? `<p class="mb-3"><strong>Abstract:</strong> ${pub.abstract}</p>` : ""}
              <div class="d-flex gap-2 flex-wrap mt-3">
                ${pub.link ? `<a href="${pub.link}" class="btn btn-outline-primary btn-sm px-3" target="_blank">📄 PDF</a>` : ""}
                ${pub.doi ? `<a href="${pub.doi}" class="btn btn-outline-primary btn-sm px-3" target="_blank">DOI</a>` : ""}
              </div>
            </div>
            <div class="col-md-4">
              ${pub.img ? `<img src="${pub.img}" class="img-fluid project-img-main" alt="${pub.title}">` : ""}
            </div>
          </div>
        </div>
      </div>
    `;

    return `
      <div class="publication-entry">
        ${collapsedHeader}
        ${expandedContent}
      </div>
    `;
  };

  // Load projects — rendered as a horizontal, rotating carousel
  fetch(dataUrl("projects.json"))
    .then((response) => response.json())
    .then((projects) => {
      const container = document.getElementById("project-grid-container");
      if (!container) return;

      const track = document.createElement("div");
      track.className = "carousel-track";

      projects.forEach((proj) => {
        const tagsHtml = proj.tags.map(t => `<span class="badge tag-badge">${t}</span>`).join("");

        let logoMarkup;
        if (proj.useSvgLogo) {
          logoMarkup = `
            <span class="project-logo-mark asset-hub-mark">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="225 260 600 600" width="20" height="20">
                <defs>
                  <linearGradient id="g-logo-${proj.id}" x1="150" y1="210" x2="780" y2="210" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#7a2cff"/>
                    <stop offset="25%" stop-color="#8c7bff"/>
                    <stop offset="52%" stop-color="#1ec8e8"/>
                    <stop offset="65%" stop-color="#46d17a"/>
                    <stop offset="78%" stop-color="#f0cf4c"/>
                    <stop offset="90%" stop-color="#ff9540"/>
                    <stop offset="100%" stop-color="#ff4338"/>
                  </linearGradient>
                </defs>
                <g transform="translate(110,100) scale(0.9)">
                  <polygon fill="url(#g-logo-${proj.id})" points="150,810 370,210 500,210 280,810"/>
                  <polygon fill="url(#g-logo-${proj.id})" points="430,210 650,810 780,810 560,210"/>
                </g>
              </svg>
            </span>
          `;
        } else {
          logoMarkup = `<span class="project-logo-mark vr-setdesigner-mark">${proj.logoText}</span>`;
        }

        const card = document.createElement("article");
        card.className = "project-card";
        card.innerHTML = `
          <div class="project-visual-wrapper">
            <img src="${proj.image}" class="project-card-image" alt="${proj.title} Preview" loading="lazy">
            <span class="project-visual-scrim"></span>
            <span class="badge project-badge ${proj.status === 'Live' ? 'bg-live' : 'bg-research'}">${proj.status}</span>
          </div>
          <div class="project-card-inner">
            <div class="project-brand mb-2">
              ${logoMarkup}
              <h3 class="project-card-title mb-0">${proj.title}</h3>
            </div>
            <p class="project-card-subtitle">${proj.subtitle}</p>
            <p class="project-card-description">${proj.description}</p>
            <div class="project-tags mb-3">${tagsHtml}</div>
            <div class="project-links mt-auto">
              <a href="${proj.link}" class="btn btn-project-primary w-100" target="_blank">
                Visit Project <i class="fas fa-external-link-alt ms-1"></i>
              </a>
            </div>
          </div>
        `;
        track.appendChild(card);
      });

      // Assemble carousel shell
      const carousel = document.createElement("div");
      carousel.className = "project-carousel";

      const prevBtn = document.createElement("button");
      prevBtn.className = "carousel-arrow carousel-prev";
      prevBtn.setAttribute("aria-label", "Previous projects");
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

      const nextBtn = document.createElement("button");
      nextBtn.className = "carousel-arrow carousel-next";
      nextBtn.setAttribute("aria-label", "Next projects");
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

      const dots = document.createElement("div");
      dots.className = "carousel-dots";

      const controls = document.createElement("div");
      controls.className = "carousel-controls";
      controls.appendChild(prevBtn);
      controls.appendChild(dots);
      controls.appendChild(nextBtn);

      carousel.appendChild(track);
      carousel.appendChild(controls);
      container.appendChild(carousel);

      initProjectCarousel({ carousel, track, prevBtn, nextBtn, dots });
      initImageParallax(Array.from(track.querySelectorAll(".project-card-image")));
    });

  // Load publications
  fetch(dataUrl("publications.json"))
    .then((response) => response.json())
    .then((data) => {
      const firstAuthorContainer = document.getElementById("accordionFirstAuthor");
      const coAuthorContainer = document.getElementById("accordionCoAuthor");
      const allAuthorContainer = document.getElementById("accordionAllAuthor");

      // Sort subsets
      const firstPubs = data.filter(p => p.type === "first-author").sort((a, b) => b.sortDate.localeCompare(a.sortDate));
      const coPubs = data.filter(p => p.type === "co-author").sort((a, b) => b.sortDate.localeCompare(a.sortDate));
      const allPubs = [...data].sort((a, b) => b.sortDate.localeCompare(a.sortDate));

      firstPubs.forEach((pub, i) => {
        firstAuthorContainer.innerHTML += createPublicationBlock(pub, i, firstPubs.length);
      });

      coPubs.forEach((pub, i) => {
        coAuthorContainer.innerHTML += createPublicationBlock(pub, i, coPubs.length);
      });

      allPubs.forEach((pub, i) => {
        allAuthorContainer.innerHTML += createPublicationBlock(pub, i, allPubs.length);
      });

      // Add collapse event listeners for rotation
      document.querySelectorAll('.publication-header').forEach(header => {
        const icon = header.querySelector('.collapse-icon');
        const collapseId = header.getAttribute('data-bs-target');
        const collapseEl = document.querySelector(collapseId);
        
        if (!collapseEl) return;

        collapseEl.addEventListener('show.bs.collapse', () => {
          icon.classList.add('rotate');
        });
        collapseEl.addEventListener('hide.bs.collapse', () => {
          icon.classList.remove('rotate');
        });
      });

      // Add toggle button functionality (if any exist)
      document.querySelectorAll(".toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          setTimeout(() => {
            const target = document.getElementById(btn.getAttribute("data-bs-target").replace("#", ""));
            const expanded = target.classList.contains("show");
            btn.innerHTML = expanded ? "🔼 Hide Info" : "🔽 More Info";
          }, 350);
        });
      });
    });

  // Load talks
  fetch(dataUrl("talks.json"))
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("talks-container");
      data.forEach((talk) => {
        const talkDiv = document.createElement("div");
        talkDiv.classList.add("timeline-entry");
        talkDiv.innerHTML = `
          <h5 class="title">
            ${talk.link ? `<a href="${talk.link}" target="_blank">${talk.title}</a>` : `${talk.title}`}
          </h5>
          <div class="context">${talk.location} · ${talk.date}</div>
          <p>${talk.description}</p>
        `;
        container.appendChild(talkDiv);
      });
      fitTimelineRail(container);
    });

  // Load experience
  fetch(dataUrl("experience.json"))
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("experience-container");

      // Group into Work vs Education for clean timeline representation
      const workLabel = document.createElement("div");
      workLabel.className = "timeline-section-header mb-4 fw-bold text-uppercase";
      workLabel.style.fontSize = "0.75rem";
      workLabel.style.letterSpacing = "0.08em";
      workLabel.style.color = "var(--text-faint)";
      workLabel.style.paddingLeft = "0.15rem";
      workLabel.innerText = "Work Experience";
      container.appendChild(workLabel);

      data.forEach((exp, index) => {
        const expDiv = document.createElement("div");
        expDiv.classList.add("timeline-entry");

        expDiv.innerHTML = `
          <h5 class="title mb-1">${exp.role}</h5>
          <div class="context">${exp.organization} · ${exp.duration}</div>
          ${exp.description ? `<p class="mb-0">${exp.description}</p>` : ""}
        `;

        container.appendChild(expDiv);

        const next = data[index + 1];
        if (exp.type === "work" && next && next.type === "education") {
          const eduLabel = document.createElement("div");
          eduLabel.className = "timeline-section-header my-4 pt-2 fw-bold text-uppercase";
          eduLabel.style.fontSize = "0.75rem";
          eduLabel.style.letterSpacing = "0.08em";
          eduLabel.style.color = "var(--text-faint)";
          eduLabel.style.paddingLeft = "0.15rem";
          eduLabel.innerText = "Education";
          container.appendChild(eduLabel);
        }
      });
      fitTimelineRail(container);
    });

  // Load skills
  fetch(dataUrl("skills.json"))
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("skills-container");
      if (!container) return;

      data.forEach((cat, index) => {
        const catLevel = cat.level ?? 0;
        const avgDots = Array.from({ length: 5 }, (_, i) => {
          const filled = i < catLevel ? "dot filled" : "dot";
          return `<span class="${filled}"></span>`;
        }).join("");

        const collapseId = `skills-collapse-${index}`;
        const iconId = `icon-${index}`;

        const catWrapper = document.createElement("div");
        catWrapper.classList.add("mb-2");

        // Group skills by level, sorted descending
        const groupedSkills = cat.skills
          .reduce((groups, skill) => {
            if (!groups[skill.level]) groups[skill.level] = [];
            groups[skill.level].push(skill.name);
            return groups;
          }, {});

        const sortedSkillBlocks = Object.entries(groupedSkills)
          .sort((a, b) => b[0] - a[0]) // Level descending
          .map(([level, names]) => {
            names.sort((a, b) => b.localeCompare(a)); // Alphabetical descending

            const dots = Array.from({ length: 5 }, (_, i) => {
              const filled = i < level ? "dot filled" : "dot";
              return `<span class="${filled}"></span>`;
            }).join("");

            return `
              <div class="skill-row d-flex justify-content-between align-items-center mb-2">
                <span class="skill-name">${names.join(", ")}</span>
                <span class="skill-dots d-flex">${dots}</span>
              </div>
            `;
          }).join("");

        catWrapper.innerHTML = `
          <div class="d-flex justify-content-between align-items-center category-header" role="button"
               data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false"
               aria-controls="${collapseId}">
            <div class="d-flex align-items-center gap-2">
              <span id="${iconId}" class="collapse-icon">▸</span>
              <h5 class="fw-semibold mb-0">${cat.category}</h5>
            </div>
            <div class="skill-dots d-flex">${avgDots}</div>
          </div>

          <div class="collapse mt-2" id="${collapseId}">
            ${sortedSkillBlocks}
          </div>
        `;

        container.appendChild(catWrapper);

        // Add event listener for skills chevron rotation
        const collapseEl = catWrapper.querySelector(`#${collapseId}`);
        const iconEl = catWrapper.querySelector(`#${iconId}`);
        if (collapseEl && iconEl) {
          collapseEl.addEventListener('show.bs.collapse', () => {
            iconEl.classList.add('rotate');
          });
          collapseEl.addEventListener('hide.bs.collapse', () => {
            iconEl.classList.remove('rotate');
          });
        }
      });
    });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
