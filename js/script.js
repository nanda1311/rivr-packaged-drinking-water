document.addEventListener('DOMContentLoaded', () => {

  /* ================= YEAR ================= */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ================= NAVBAR: shrink + shadow on scroll ================= */
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  // const onScroll = () => {
  //   const scrolled = window.scrollY > 20;
  //   navbar.classList.toggle('scrolled', scrolled);
  //   backToTop.classList.toggle('show', window.scrollY > 500);
  //   updateActiveNav();
  // };
  // window.addEventListener('scroll', onScroll, { passive: true });
  // onScroll();

  // backToTop.addEventListener('click', () => {
  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // });






  
  /* ================= MOBILE MENU TOGGLE ================= */
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  // /* ================= ACTIVE NAV LINK ON SCROLL ================= */
  // const sections = ['home', 'about', 'products', 'why', 'contact']
  //   .map(id => document.getElementById(id))
  //   .filter(Boolean);
  // const navAnchors = document.querySelectorAll('.nav-link');

  // function updateActiveNav() {
  //   let current = sections[0];
  //   const scrollPos = window.scrollY + 140;
  //   sections.forEach(sec => {
  //     if (sec.offsetTop <= scrollPos) current = sec;
  //   });
  //   navAnchors.forEach(a => {
  //     a.classList.toggle('active', a.getAttribute('href') === `#${current.id}`);
  //   });
  // }

  /* ================= SCROLL REVEAL (Intersection Observer) ================= */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));



/* ================= TESTIMONIAL CAROUSEL ================= */

const track = document.getElementById("carouselTrack");
const groups = track
  ? Array.from(track.querySelectorAll(".testimonial-group"))
  : [];

const dotsWrap = document.getElementById("carouselDots");
const prevBtn = document.getElementById("prevSlide");
const nextBtn = document.getElementById("nextSlide");

let current = 0;
let autoplayTimer = null;

if (groups.length) {

  /* Create dots */
  groups.forEach((_, i) => {

    const dot = document.createElement("span");

    dot.className = "dot" + (i === 0 ? " active" : "");

    dot.setAttribute(
      "aria-label",
      `Go to testimonial group ${i + 1}`
    );

    dot.addEventListener("click", () => {
      goToSlide(i);
    });

    dotsWrap.appendChild(dot);
  });

  const dots = Array.from(dotsWrap.children);


  /* Show group */
  function showSlide(index) {

    groups.forEach((group, i) => {
      group.classList.toggle("active", i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });

    current = index;
  }


  /* Go to group */
  function goToSlide(index) {

    const newIndex =
      (index + groups.length) % groups.length;

    showSlide(newIndex);

    restartAutoplay();
  }


  /* Next */
  function nextSlide() {
    goToSlide(current + 1);
  }


  /* Previous */
  function prevSlide() {
    goToSlide(current - 1);
  }


  /* Autoplay */
  function restartAutoplay() {

    clearInterval(autoplayTimer);

    autoplayTimer = setInterval(() => {
      nextSlide();
    }, 6000);
  }


  /* Buttons */
  nextBtn.addEventListener("click", nextSlide);
  prevBtn.addEventListener("click", prevSlide);


  /* Initial state */
  showSlide(0);
  restartAutoplay();
}

  /* ================= HERO WAVE PARALLAX ON SCROLL ================= */
  const waves = document.querySelectorAll('.hero .wave');
  const heroBottle = document.getElementById('heroBottle');

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    waves.forEach((wave, i) => {
      wave.style.transform = `translateY(${y * (0.05 + i * 0.03)}px)`;
    });
    if (heroBottle && y < 700) {
      heroBottle.style.transform = `translateY(${y * 0.08}px)`;
    }
  }, { passive: true });

  /* ================= LIFESTYLE BACKGROUND PARALLAX ================= */
  const lifestyleBg = document.querySelector('.lifestyle-bg');
  if (lifestyleBg) {
    window.addEventListener('scroll', () => {
      const rect = lifestyleBg.parentElement.getBoundingClientRect();
      const progress = 1 - Math.min(Math.max(rect.top / window.innerHeight, -1), 1);
      lifestyleBg.style.transform = `scale(1.05) translateY(${progress * 20}px)`;
    }, { passive: true });
  }

  /* ================= SMOOTH SCROLL FOR ANCHOR LINKS ================= */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const offset = 80;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

});




document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
});



//  for products page

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
});



// for why rivr page

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
});


// for contact page
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ---- FORM VALIDATION ---- */
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  const sendBtn = document.getElementById('sendBtn');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(fieldName, hasError) {
    const wrap = form.querySelector(`[data-field="${fieldName}"]`);
    wrap.classList.toggle('error', hasError);
  }

  function validate() {
    let valid = true;

    const name = document.getElementById('name').value.trim();
    if (!name) { setError('name', true); valid = false; } else { setError('name', false); }

    const email = document.getElementById('email').value.trim();
    if (!emailRe.test(email)) { setError('email', true); valid = false; } else { setError('email', false); }

    const subject = document.getElementById('subject').value;
    if (!subject) { setError('subject', true); valid = false; } else { setError('subject', false); }

    const message = document.getElementById('message').value.trim();
    if (!message) { setError('message', true); valid = false; } else { setError('message', false); }

    return valid;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.classList.remove('show');
    if (!validate()) return;

    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = 'Sending...';

    setTimeout(() => {
      sendBtn.innerHTML = originalText;
      sendBtn.disabled = false;
      status.classList.add('show');
      form.reset();
    }, 900);
  });

  // clear error state as the user types/selects
  ['name','email','phone','subject','message'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => setError(id, false));
    el.addEventListener('change', () => setError(id, false));
  });
});


// for blogs page
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ---- BLOG FILTER + SEARCH ---- */
  const cards = Array.from(document.querySelectorAll('.blog-card'));
  const tabs = document.querySelectorAll('.filter-tab');
  const searchInput = document.getElementById('searchInput');
  const noResults = document.getElementById('noResults');
  let activeFilter = 'all';

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach(card => {
      const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchesSearch = !query || card.dataset.title.includes(query);
      const show = matchesCategory && matchesSearch;
      card.classList.toggle('hidden', !show);
      if (show) visibleCount++;
    });

    noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      applyFilters();
    });
  });

  searchInput.addEventListener('input', applyFilters);

  /* ---- PAGINATION (visual demo) ---- */
  const pageButtons = document.querySelectorAll('.page-btn[data-page]');
  const prevPage = document.getElementById('prevPage');
  const nextPage = document.getElementById('nextPage');
  let currentPage = 1;
  const totalPages = pageButtons.length;

  function setPage(n) {
    currentPage = Math.min(Math.max(n, 1), totalPages);
    pageButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.page) === currentPage));
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
    document.querySelector('.blog-section .container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  pageButtons.forEach(btn => btn.addEventListener('click', () => setPage(Number(btn.dataset.page))));
  prevPage.addEventListener('click', () => setPage(currentPage - 1));
  nextPage.addEventListener('click', () => setPage(currentPage + 1));
  setPage(1);

  /* ---- NEWSLETTER FORM ---- */
  const nlForm = document.getElementById('nlForm');
  const nlEmail = document.getElementById('nlEmail');
  const nlStatus = document.getElementById('nlStatus');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  nlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = nlEmail.value.trim();
    if (!emailRe.test(val)) {
      nlForm.classList.add('error');
      nlStatus.textContent = 'Please enter a valid email address.';
      nlStatus.classList.add('show', 'err');
      return;
    }
    nlForm.classList.remove('error');
    nlStatus.classList.remove('err');
    nlStatus.textContent = "You're subscribed! Welcome to the RIVR community.";
    nlStatus.classList.add('show');
    nlForm.reset();
  });

  nlEmail.addEventListener('input', () => {
    nlForm.classList.remove('error');
    nlStatus.classList.remove('show', 'err');
  });
});


// for blog detail page
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ---- SHARE BUTTONS (toast feedback) ---- */
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  document.getElementById('topShareBtn').addEventListener('click', () => {
    showToast('Link copied to clipboard!');
  });
  document.querySelectorAll('.share-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(`Sharing to ${link.dataset.network}...`);
    });
  });

  /* ---- SIDEBAR SEARCH (filters recent posts list by title) ---- */
  const sidebarSearch = document.getElementById('sidebarSearch');
  const recentItems = document.querySelectorAll('.recent-list li');
  sidebarSearch.addEventListener('input', () => {
    const q = sidebarSearch.value.trim().toLowerCase();
    recentItems.forEach(li => {
      const title = li.querySelector('a').textContent.toLowerCase();
      li.style.display = !q || title.includes(q) ? 'flex' : 'none';
    });
  });

  /* ---- CATEGORY CLICK (visual active state) ---- */
  document.querySelectorAll('.cat-list li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.cat-list li').forEach(el => el.style.fontWeight = '');
      li.querySelector('.name').style.color = 'var(--blue)';
    });
  });
});



// This JS does NOT contain any image paths.
// All images/text live in index.html inside .qt-slide blocks.
// JS just switches which slide has the "active" class,
// and copies that slide's title/description into the footer textbox.

const slides = document.querySelectorAll(".qt-slide");
const textbox = document.getElementById("qtTextbox");
const prevBtn = document.getElementById("qtPrev");
const nextBtn = document.getElementById("qtNext");

let currentIndex = 0;

function renderTextbox(index) {
  const slide = slides[index];
  const title = slide.querySelector(".qt-title").innerHTML;
  const desc = slide.querySelector(".qt-desc").innerHTML;

  textbox.style.opacity = "0";
  setTimeout(() => {
    textbox.innerHTML = `
      <h2 class="qt-title">${title}</h2>
      <p class="qt-desc">${desc}</p>
    `;
    textbox.style.opacity = "1";
  }, 200);
}

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === index);
  });
  renderTextbox(index);
  // Bottle is untouched here — it always stays fixed in place.
}

function goNext() {
  currentIndex = (currentIndex + 1) % slides.length;
  showSlide(currentIndex);
}

function goPrev() {
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  showSlide(currentIndex);
}

nextBtn.addEventListener("click", goNext);
prevBtn.addEventListener("click", goPrev);

// Initialize textbox with the first slide's content on page load
renderTextbox(currentIndex);




// founder slider section code
/* ===== FOUNDER AUTO SLIDER ===== */

document.addEventListener("DOMContentLoaded", function () {

  const slides = document.querySelectorAll(".founder-slide");

  let currentSlide = 0;

  function showNextFounder() {

    // Remove active class from current founder
    slides[currentSlide].classList.remove("active");

    // Move to next founder
    currentSlide++;

    // Go back to first founder after the last one
    if (currentSlide >= slides.length) {
      currentSlide = 0;
    }

    // Show next founder
    slides[currentSlide].classList.add("active");
  }

  // Change founder every 5 seconds
  setInterval(showNextFounder, 5000);

});

