/* Quiz Engine (Reusable for all Units)
 * Features:
 * - Auto progress tracking
 * - Generic answer checking via data-correct
 * - Score display & performance tiers
 * - LocalStorage persistence (score + timestamp)
 * - Accessible live region for screen readers
 * - Theme toggle with saved preference
 * - Confetti effect on high scores
 * - Restart support
 */

(function() {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const body = document.body;
  const unit = body.dataset.unit || 'x';
  const progressBar = $('.progress-bar');
  const confettiCanvas = $('#confettiCanvas');
  const ctx = confettiCanvas.getContext('2d');
  const submitBtn = $('#submitQuiz');
  const restartBtn = $('#restartQuiz');
  const themeToggle = $('#themeToggle');
  const liveRegion = $('#liveRegion');
  const resultContainer = $('#resultContainer');
  let confettiPieces = [];
  let hasSubmitted = false;

  /* ========== Theme Handling ========== */
  function initTheme() {
    const saved = localStorage.getItem('quiz_theme');
    if (saved) {
      body.dataset.theme = saved;
    } else {
      body.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    updateThemeToggleLabel();
  }

  function toggleTheme() {
    body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('quiz_theme', body.dataset.theme);
    updateThemeToggleLabel();
  }

  function updateThemeToggleLabel() {
    themeToggle.innerHTML = body.dataset.theme === 'dark'
      ? '<i data-lucide="sun"></i><span>โหมดสว่าง</span>'
      : '<i data-lucide="moon-star"></i><span>โหมดมืด</span>';
    if (window.lucide) lucide.createIcons();
  }

  /* ========== Progress ========== */
  function updateProgress() {
    const total = $$('.quiz-card').length;
    const answered = $$('.quiz-card').filter(card => $('input[type="radio"]:checked', card)).length;
    const pct = (answered / total) * 100;
    progressBar.style.width = pct + '%';
  }

  /* ========== Confetti ========== */
  function launchConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiPieces = [];
    const colors = ['#f87171','#fb923c','#34d399','#60a5fa','#c084fc','#fbbf24','#f472b6'];

    for (let i = 0; i < 220; i++) {
      confettiPieces.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        r: Math.random() * 7 + 4,
        c: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: (Math.random() - .5) * 3,
        a: Math.random() * 360,
        spin: (Math.random() - .5) * .3
      });
    }
    confettiCanvas.style.display = 'block';
    requestAnimationFrame(stepConfetti);
  }

  function stepConfetti() {
    ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
      ctx.restore();
    });
    confettiPieces = confettiPieces.filter(p => p.y < confettiCanvas.height + 20);
    if (confettiPieces.length) {
      requestAnimationFrame(stepConfetti);
    } else {
      confettiCanvas.style.display = 'none';
    }
  }

  window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  });

  /* ========== Answer Checking ========== */
  function gradeQuiz() {
    if (hasSubmitted) return;
    hasSubmitted = true;
    submitBtn.classList.add('loading');
    setTimeout(processResults, 850);
  }

  function processResults() {
    const cards = $$('.quiz-card');
    let score = 0;
    const total = cards.length;
    const rows = [];

    cards.forEach((card, idx) => {
      const correct = card.dataset.correct.trim().toLowerCase();
      const name = 'q' + (idx + 1);
      const selected = $(`input[name="${name}"]:checked`, card);
      let status = '';
      let row = `Q${idx+1}: `;

      if (selected) {
        const val = selected.value.toLowerCase();
        if (val === correct) {
          status = 'correct';
          score++;
          row += `<span class="tag correct">ถูก</span>`;
        } else {
          status = 'wrong';
          row += `<span class="tag wrong">ผิด</span> (เฉลย: ${correct.toUpperCase()})`;
        }
      } else {
        status = 'wrong';
        row += `<span class="tag missed">ไม่ได้ตอบ</span> (เฉลย: ${correct.toUpperCase()})`;
      }
      card.dataset.status = status;
      // inject feedback badge if not exist
      if (!$('.feedback', card)) {
        const span = document.createElement('span');
        span.className = 'feedback';
        span.innerHTML = status === 'correct' ? '✔ ถูกต้อง' : '✖ ตรวจสอบอีกครั้ง';
        card.appendChild(span);
      }
      rows.push(`<li>${row}</li>`);
    });

    const percent = Math.round((score / total) * 100);
    const key = `quiz_unit${unit}_score`;
    const dateKey = `quiz_unit${unit}_date`;
    localStorage.setItem(key, score);
    localStorage.setItem(dateKey, new Date().toISOString());

    let performanceClass = 'bad';
    let performanceText = 'ลองทบทวนเพิ่มเติมนะ';
    if (percent === 100) {
      performanceText = 'สุดยอด! คะแนนเต็ม ✨';
      performanceClass = 'good';
      launchConfetti();
    } else if (percent >= 80) {
      performanceText = 'เยี่ยมมาก! ใกล้เต็มแล้ว';
      performanceClass = 'good';
    } else if (percent >= 60) {
      performanceText = 'ทำได้ดี! พยายามต่อไป';
      performanceClass = 'ok';
    }

    resultContainer.innerHTML = `
      <div class="result" role="region" aria-label="ผลการทำแบบฝึกหัด">
        <h2 style="margin:0;font-size:1.3rem;font-weight:700;">ผลการทำแบบทดสอบ</h2>
        <div class="score" aria-live="polite">${score}/${total}</div>
        <div class="performance ${performanceClass}">${performanceText}</div>
        <ul class="answers-list">${rows.join('')}</ul>
        <div class="actions" style="margin-top:1.4rem;">
          <a class="button secondary" href="Profile.html?score=${score}&unit=${unit}" aria-label="เปิดโปรไฟล์ของคุณ">
            <i data-lucide="user"></i> โปรไฟล์
          </a>
          <a class="button outline" href="gradebook.html?score=${score}&unit=${unit}" aria-label="ดูสมุดคะแนน">
            <i data-lucide="bar-chart-3"></i> เกรดรวม
          </a>
          <button id="restartBtnInner" class="button" aria-label="ทำแบบทดสอบใหม่">
            <i data-lucide="refresh-ccw"></i> ทำใหม่
          </button>
        </div>
      </div>
    `;

    // Live region update
    liveRegion.textContent = `คุณได้ ${score} คะแนน จาก ${total} ข้อ คิดเป็น ${percent} เปอร์เซ็นต์`;

    // Rebind restart inside result
    $('#restartBtnInner')?.addEventListener('click', restartQuiz);

    submitBtn.classList.remove('loading');
    if (window.lucide) lucide.createIcons();
  }

  function restartQuiz() {
    hasSubmitted = false;
    confettiPieces = [];
    progressBar.style.width = '0%';
    $$('.quiz-card').forEach((card, idx) => {
      card.removeAttribute('data-status');
      const name = 'q' + (idx + 1);
      $$(`input[name="${name}"]`).forEach(r => r.checked = false);
      const feed = $('.feedback', card);
      feed?.remove();
    });
    resultContainer.innerHTML = '';
    liveRegion.textContent = 'เริ่มทำใหม่';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  /* ========== Initialization ========== */
  function bindEvents() {
    $$('.quiz-card').forEach((card, idx) => {
      card.dataset.number = idx + 1;
      const name = 'q' + (idx + 1);
      $$(`input[name="${name}"]`, card).forEach(radio => {
        radio.addEventListener('change', updateProgress);
      });
    });
    submitBtn?.addEventListener('click', gradeQuiz);
    restartBtn?.addEventListener('click', restartQuiz);
    themeToggle?.addEventListener('click', toggleTheme);

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !hasSubmitted && e.target.tagName !== 'BUTTON') {
        gradeQuiz();
      }
    });
  }

  function setupLucide() {
    if (window.lucide) {
      lucide.createIcons();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
      script.onload = () => lucide.createIcons();
      document.head.appendChild(script);
    }
  }

  function init() {
    initTheme();
    bindEvents();
    setupLucide();
    updateProgress();
  }

  document.addEventListener('DOMContentLoaded', init);
})();