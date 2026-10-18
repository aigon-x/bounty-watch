(function () {
  'use strict';

  const SELECTORS = {
    navToggle: '[data-nav-toggle]',
    navMenu: '[data-nav-menu]',
    navLinks: '[data-nav-menu] a[href^="#"]',
    smoothScrollLinks: 'a[href^="#"]:not([data-no-smooth])',
    modalTriggers: '[data-modal-trigger]',
    modals: '[data-modal]',
    modalClose: '[data-modal-close]',
    modalOverlay: '[data-modal-overlay]'
  };

  const CLASSES = {
    navOpen: 'nav--open',
    navToggleActive: 'nav-toggle--active',
    modalOpen: 'modal--open',
    modalClosing: 'modal--closing',
    bodyNoScroll: 'body--no-scroll'
  };

  const STATE = {
    navOpen: false,
    activeModal: null,
    lastFocusedElement: null,
    scrollPosition: 0
  };

  function $(selector, context = document) {
    return context.querySelector(selector);
  }

  function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  function on(event, selector, handler, options) {
    document.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target) handler.call(target, e, target);
    }, options);
  }

  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function handleTab(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    element.addEventListener('keydown', handleTab);
    return () => element.removeEventListener('keydown', handleTab);
  }

  function setBodyScroll(enabled) {
    const body = document.body;
    if (enabled) {
      body.classList.remove(CLASSES.bodyNoScroll);
      body.style.top = '';
      window.scrollTo(0, STATE.scrollPosition);
    } else {
      STATE.scrollPosition = window.scrollY;
      body.style.top = `-${STATE.scrollPosition}px`;
      body.classList.add(CLASSES.bodyNoScroll);
    }
  }

  function toggleNav(force) {
    const navToggle = $(SELECTORS.navToggle);
    const navMenu = $(SELECTORS.navMenu);
    if (!navToggle || !navMenu) return;

    const nextState = typeof force === 'boolean' ? force : !STATE.navOpen;
    STATE.navOpen = nextState;

    navToggle.classList.toggle(CLASSES.navToggleActive, nextState);
    navMenu.classList.toggle(CLASSES.navOpen, nextState);
    navToggle.setAttribute('aria-expanded', nextState);
    navMenu.setAttribute('aria-hidden', !nextState);

    setBodyScroll(!nextState);
  }

  function closeNav() {
    toggleNav(false);
  }

  function smoothScroll(targetId, event) {
    const target = document.getElementById(targetId.slice(1));
    if (!target) return;

    event.preventDefault();

    const header = $('header');
    const headerHeight = header ? header.offsetHeight : 0;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });

    target.focus({ preventScroll: true });
    closeNav();

    history.pushState(null, '', targetId);
  }

  function openModal(modalId, trigger) {
    const modal = $(`[data-modal="${modalId}"]`);
    if (!modal) return;

    STATE.lastFocusedElement = trigger || document.activeElement;
    STATE.activeModal = modalId;

    modal.classList.add(CLASSES.modalOpen);
    modal.removeAttribute('aria-hidden');
    setBodyScroll(false);

    const cleanupFocusTrap = trapFocus(modal);
    modal._focusTrapCleanup = cleanupFocusTrap;

    const firstFocusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) firstFocusable.focus();

    document.addEventListener('keydown', handleModalKeydown);
  }

  function closeModal(modalId) {
    const modal = modalId ? $(`[data-modal="${modalId}"]`) : STATE.activeModal ? $(`[data-modal="${STATE.activeModal}"]`) : null;
    if (!modal) return;

    modal.classList.add(CLASSES.modalClosing);
    modal.setAttribute('aria-hidden', 'true');

    const finishClose = () => {
      modal.classList.remove(CLASSES.modalOpen, CLASSES.modalClosing);
      if (modal._focusTrapCleanup) {
        modal._focusTrapCleanup();
        modal._focusTrapCleanup = null;
      }
      setBodyScroll(true);

      if (STATE.lastFocusedElement) {
        STATE.lastFocusedElement.focus();
        STATE.lastFocusedElement = null;
      }
      STATE.activeModal = null;
    };

    const handleTransitionEnd = (e) => {
      if (e.target === modal && e.propertyName.includes('transform')) {
        modal.removeEventListener('transitionend', handleTransitionEnd);
        finishClose();
      }
    };

    modal.addEventListener('transitionend', handleTransitionEnd);

    setTimeout(finishClose, 300);
    document.removeEventListener('keydown', handleModalKeydown);
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function initNavigation() {
    const navToggle = $(SELECTORS.navToggle);
    if (!navToggle) return;

    navToggle.addEventListener('click', () => toggleNav());

    on('click', SELECTORS.navLinks, (e) => {
      const href = e.currentTarget.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        smoothScroll(href, e);
      }
    });

    document.addEventListener('click', (e) => {
      if (STATE.navOpen && !e.target.closest('[data-nav-menu], [data-nav-toggle]')) {
        closeNav();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && STATE.navOpen) {
        closeNav();
      }
    });
  }

  function initSmoothScroll() {
    on('click', SELECTORS.smoothScrollLinks, (e, link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        smoothScroll(href, e);
      }
    });
  }

  function initModals() {
    on('click', SELECTORS.modalTriggers, (e, trigger) => {
      const modalId = trigger.getAttribute('data-modal-trigger');
      if (modalId) openModal(modalId, trigger);
    });

    on('click', SELECTORS.modalClose, (e, closeBtn) => {
      const modal = closeBtn.closest('[data-modal]');
      if (modal) closeModal(modal.getAttribute('data-modal'));
    });

    on('click', SELECTORS.modalOverlay, handleOverlayClick);
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    initNavigation();
    initSmoothScroll();
    initModals();

    window.addEventListener('hashchange', () => {
      if (location.hash) {
        const target = $(location.hash);
        if (target) {
          target.focus({ preventScroll: true });
        }
      }
    });
  }

  init();

  window.BountyWatch = {
    toggleNav,
    closeNav,
    openModal,
    closeModal,
    smoothScroll
  };
})();