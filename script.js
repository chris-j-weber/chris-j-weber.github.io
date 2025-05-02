document.addEventListener("DOMContentLoaded", () => {
 // Helper to create one publication block with image + optional toggle
const createPublicationBlock = (pub, index, total) => {
    const idSuffix = `${pub.type.replace("-", "")}${index}`;
    return `
      <div class="timeline-item mb-4 ${index === 0 ? 'pt-3 mt-3' : ''}">
        <div class="timeline-label mb-2 fw-semibold">${pub.date} – ${pub.title}</div>
        <div class="row g-4 align-items-center">
          <div class="col-md-4">
            <img src="${pub.img}" class="img-fluid project-img" alt="${pub.title}">
          </div>
          <div class="col-md-8">
            <p><strong>Publication:</strong> <em>${pub.title}</em><br>
            ${pub.conference ? `<span class="text-muted">${pub.conference}</span><br>` : ""}
            ${pub.doi ? `DOI: <a href="${pub.doi}" target="_blank">${pub.doi}</a>` : ""}</p>
            <p><strong>Abstract:</strong> ${pub.abstract}</p>
            <div class="d-flex gap-2 flex-wrap">
              ${pub.additionalImages ? `
                <button class="btn btn-outline-primary toggle-btn" type="button" data-bs-toggle="collapse" data-bs-target="#details-${idSuffix}" aria-expanded="false" aria-controls="details-${idSuffix}">
                  🔽 More Info
                </button>` : ""}
              ${pub.link ? `<a href="${pub.link}" class="btn btn-outline-primary" target="_blank">📄 Read Paper</a>` : ""}
              ${pub.tool?.link ? `<a href="${pub.tool.link}" class="btn btn-outline-primary" target="_blank">🔗 Tool Page</a>` : ""}
            </div>
          </div>
        </div>
  
        ${pub.additionalImages ? `
          <div class="collapse mt-3" id="details-${idSuffix}">
            <div class="card card-body bg-light">
              <div class="row g-3">
                ${pub.additionalImages.map(img => `
                  <div class="col-md-4">
                    <img src="${img}" class="img-fluid project-img" alt="Additional image">
                  </div>`).join("")}
              </div>
              ${pub.tool ? `<p class="mt-3"><strong>Tool:</strong> ${pub.tool.description}</p>` : ""}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  };
  
    // Load publications
    fetch("publications.json")
      .then((response) => response.json())
      .then((data) => {
        const firstAuthorContainer = document.getElementById("accordionFirstAuthor");
        const coAuthorContainer = document.getElementById("accordionCoAuthor");
        
  
        const firstPubs = data.filter(p => p.type === "first-author");
        const coPubs = data.filter(p => p.type === "co-author");
  
        firstPubs.forEach((pub, i) => {
          firstAuthorContainer.innerHTML += createPublicationBlock(pub, i, firstPubs.length);
        });
  
        coPubs.forEach((pub, i) => {
          coAuthorContainer.innerHTML += createPublicationBlock(pub, i, coPubs.length);
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
          ${talk.link ? `<a href="${talk.link}" target="_blank"><em>${talk.title}</em></a>` : `<em>${talk.title}</em>`}
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

  
  