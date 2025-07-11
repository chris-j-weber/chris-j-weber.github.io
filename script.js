document.addEventListener("DOMContentLoaded", () => {
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
        <div class="ms-4">
          <div class="row g-3 align-items-start">
            <div class="col-md-8">
              ${pub.journal ? `<p class="mb-1"><strong>Journal:</strong> ${pub.journal}</p>` : ""}
              ${pub.conference ? `<p class="mb-1"><strong>Conference:</strong> ${pub.conference}</p>` : ""}
              ${pub.abstract ? `<p class="mb-2"><strong>Abstract:</strong> ${pub.abstract}</p>` : ""}
              <div class="d-flex gap-2 flex-wrap">
                ${pub.link ? `<a href="${pub.link}" class="btn btn-outline-primary btn-sm" target="_blank">📄 PDF</a>` : ""}
                ${pub.doi ? `<a href="${pub.doi}" class="btn btn-outline-primary btn-sm" target="_blank">DOI</a>` : ""}
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
      <div class="publication-entry border-top pt-3 mt-3">
        ${collapsedHeader}
        ${expandedContent}
      </div>
    `;
  };

  

  // Load publications
  fetch("publications.json")
    .then((response) => response.json())
    .then((data) => {
      const firstAuthorContainer = document.getElementById("accordionFirstAuthor");
      const coAuthorContainer = document.getElementById("accordionCoAuthor");
      const allAuthorContainer = document.getElementById("accordionAllAuthor");

      // Sortierte Subsets
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

      // Add toggle functionality
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
});

  
// Load talks
fetch("talks.json")
  .then((response) => response.json())
  .then((data) => {
    const container = document.getElementById("talks-container");
    data.forEach((talk) => {
      const talkDiv = document.createElement("div");
      talkDiv.classList.add("timeline-entry", "mb-4");  // changed from talk-entry
      talkDiv.innerHTML = `
        <h5 class="title">
          ${talk.link ? `<a href="${talk.link}" target="_blank">${talk.title}</a>` : `${talk.title}`}
        </h5>
        <div class="context">${talk.location} · ${talk.date}</div>
        <p>${talk.description}</p>
      `;
      container.appendChild(talkDiv);
    });
  });

// Load experience
fetch("experience.json")
  .then((response) => response.json())
  .then((data) => {
    const container = document.getElementById("experience-container");

    data.forEach((exp, index) => {
      const expDiv = document.createElement("div");
      expDiv.classList.add("timeline-entry");

      expDiv.innerHTML = `
        <h5 class="title mb-1 fw-semibold">${exp.role}</h5>
        <div class="context">${exp.organization} · ${exp.duration}</div>
        ${exp.description ? `<p class="mb-0">${exp.description}</p>` : ""}
      `;

      container.appendChild(expDiv);

      const next = data[index + 1];
      if (exp.type === "work" && (!next || next.type === "education")) {
        const divider = document.createElement("hr");
        divider.className = "my-4";
        container.appendChild(divider);
      }
    });
  });

fetch("skills.json")
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
      catWrapper.classList.add("mb-3");

      // Skill-Gruppierung nach Level, dann alphabetisch (absteigend) sortiert
      const groupedSkills = cat.skills
        .reduce((groups, skill) => {
          if (!groups[skill.level]) groups[skill.level] = [];
          groups[skill.level].push(skill.name);
          return groups;
        }, {});

      const sortedSkillBlocks = Object.entries(groupedSkills)
        .sort((a, b) => b[0] - a[0]) // Level absteigend
        .map(([level, names]) => {
          names.sort((a, b) => b.localeCompare(a)); // Alphabetisch absteigend

          const dots = Array.from({ length: 5 }, (_, i) => {
            const filled = i < level ? "dot filled" : "dot";
            return `<span class="${filled}"></span>`;
          }).join("");

          return `
            <div class="skill-row d-flex justify-content-between align-items-center mb-2 ps-5">
              <span class="skill-name">${names.join(", ")}</span>
              <span class="skill-dots d-flex">${dots}</span>
            </div>
          `;
        }).join("");

      catWrapper.innerHTML = `
        <div class="d-flex justify-content-between align-items-center category-header" role="button"
             data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false"
             aria-controls="${collapseId}" onclick="toggleIcon('${iconId}')">
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
    });
  });

// Umschaltfunktion für ▸ / ▾
window.toggleIcon = function(id) {
  const icon = document.getElementById(id);
  if (!icon) return;
  icon.textContent = icon.textContent === "▸" ? "▾" : "▸";
};




