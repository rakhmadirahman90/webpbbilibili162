/* Mobile Athlete submenu compatibility fix.
 * Keeps the React navigation untouched while guaranteeing the Athlete
 * submenu is rendered on mobile even when cached/legacy navbar data is malformed.
 */
(function () {
  'use strict';

  var ITEMS = [
    { label: 'Semua Atlet', key: 'semua' },
    { label: 'Atlet Senior', key: 'senior' },
    { label: 'Atlet Muda', key: 'muda' }
  ];

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
  }

  function findAthleteButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
    return buttons.find(function (button) {
      if (!button || button.dataset.athleteSubmenuTrigger === 'true') return false;
      var text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text === 'atlet' || text.indexOf('atlet ') === 0;
    }) || null;
  }

  function findTab(key) {
    var wanted = key === 'semua' ? ['semua', 'semua atlet'] : key === 'senior' ? ['senior', 'atlet senior'] : ['muda', 'atlet muda'];
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
    return buttons.find(function (button) {
      var text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return wanted.indexOf(text) !== -1;
    }) || null;
  }

  function activateAthlete(key) {
    var target = document.getElementById('atlet-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.setTimeout(function () {
      var tab = findTab(key);
      if (tab) tab.click();
    }, 180);
  }

  function render() {
    if (!isMobile()) return;
    var athleteButton = findAthleteButton();
    if (!athleteButton) return;

    athleteButton.dataset.athleteSubmenuTrigger = 'true';
    var wrapper = athleteButton.parentElement;
    if (!wrapper) return;

    var existing = wrapper.querySelector('[data-mobile-athlete-fix="true"]');
    if (existing) return;

    var submenu = document.createElement('div');
    submenu.dataset.mobileAthleteFix = 'true';
    submenu.setAttribute('aria-label', 'Submenu Atlet');
    submenu.style.cssText = [
      'margin:4px 0 6px 10px',
      'padding:6px 8px 7px 10px',
      'border-left:2px solid rgba(59,130,246,.65)',
      'border-radius:0 10px 10px 0',
      'background:rgba(7,12,24,.88)',
      'display:flex',
      'flex-direction:column',
      'gap:3px',
      'box-sizing:border-box'
    ].join(';');

    ITEMS.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.mobileAthleteSubitem = item.key;
      button.style.cssText = [
        'width:100%',
        'min-height:38px',
        'padding:8px 12px',
        'border:0',
        'border-radius:8px',
        'background:transparent',
        'color:#cbd5e1',
        'font:600 12px/1.2 system-ui,sans-serif',
        'letter-spacing:.04em',
        'text-align:left',
        'cursor:pointer',
        'touch-action:manipulation'
      ].join(';');

      button.addEventListener('pointerdown', function (event) {
        event.stopPropagation();
      }, { passive: true });
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        activateAthlete(item.key);
      });
      button.addEventListener('pointerenter', function () {
        button.style.background = 'rgba(59,130,246,.14)';
        button.style.color = '#60a5fa';
      });
      button.addEventListener('pointerleave', function () {
        button.style.background = 'transparent';
        button.style.color = '#cbd5e1';
      });

      submenu.appendChild(button);
    });

    wrapper.appendChild(submenu);
  }

  function scheduleRender() {
    window.requestAnimationFrame(render);
  }

  document.addEventListener('DOMContentLoaded', scheduleRender, { once: true });
  window.addEventListener('load', scheduleRender, { once: true });
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!target) return;
    var text = (target.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (text === 'atlet' || text.indexOf('atlet ') === 0) {
      window.setTimeout(scheduleRender, 20);
    }
  }, true);

  var observer = new MutationObserver(function () {
    if (!isMobile()) return;
    scheduleRender();
  });

  function startObserver() {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
})();
