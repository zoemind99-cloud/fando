(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ReaddyAnim = factory());
})(this, (function () { 'use strict';

  /**
   * @readdy/anim/shared/constants.js
   *
   * Shared constants - animation ID prefix, class prefix, and ID builders.
   * Keeps animation ID prefixes consistent across the library.
   */

  /** Shared animation ID prefix. */
  const ANIM_ID_PREFIX = 'readdy-anim-';

  /** Shared CSS class prefix. */
  const ANIM_CLASS_PREFIX = 'readdy-anim-';

  /**
   * Builds a namespaced animation CSS class.
   * @param {string} name - Class suffix, for example 'text-type'.
   * @returns {string} Full class name, for example 'readdy-anim-text-type'.
   */
  function buildAnimClass(name) {
    return ANIM_CLASS_PREFIX + name
  }

  /**
   * Builds a namespaced DOM id for animation-related nodes.
   * It currently shares the same prefix as CSS classes so SVG filters and
   * portal nodes stay in the same namespace.
   *
   * @param {string} name - ID suffix, for example 'bubble-goo'.
   * @returns {string} Full id, for example 'readdy-anim-bubble-goo'.
   */
  function buildAnimDomId(name) {
    return ANIM_CLASS_PREFIX + name
  }

  /**
   * Builds the canonical animation ID.
   * Accepts an animation slug, for example:
   * - buildAnimId('letter-bounce') => 'readdy-anim-letter-bounce'
   * - buildAnimId('bubble-button') => 'readdy-anim-bubble-button'
   *
   * @param {string} name - Animation slug.
   * @returns {string} Canonical animation ID.
   */
  function buildAnimId(name) {
    const slug = String(name).trim();

    if (!slug) {
      throw new Error('buildAnimId(name) requires a non-empty animation slug')
    }

    if (slug.includes('/')) {
      throw new Error(`buildAnimId(name) only accepts animation slugs, received path-like value: ${slug}`)
    }

    const normalizedSlug = slug
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    if (!normalizedSlug) {
      throw new Error(`buildAnimId(name) could not derive a valid animation slug from: ${slug}`)
    }

    return ANIM_ID_PREFIX + normalizedSlug
  }

  /**
   * @readdy/anim/shared/text-split.js
   *
   * Text split helper - splits element text into spans with staggered delays.
   * Used by text-split style animations such as letter-bounce, split-text,
   * and fly-in-chars.
   *
   * `init(el)` uses this helper and `destroy(el)` restores
   * `el.dataset.originalText`.
   *
   * Rules:
   * - Split text nodes only and leave element nodes untouched
   *   (`<em>`, `<strong>`, `<span class="icon">`, etc.).
   * - Preserve whitespace characters as-is.
   * - Fallback to word splitting when the text exceeds `maxChars`.
   * - Save the original innerHTML to `el.dataset.originalText` before splitting
   *   and only do this once internally.
   */


  // ─────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────

  /**
   * Splits text inside an element into per-character spans, each with its own
   * animation delay.
   *
   * @param el       Target element.
   * @param options  Configuration object.
   * @param options.stagger    Delay increment per character in milliseconds. Default: 60.
   * @param options.charClass  Class name for generated spans. Default: 'readdy-anim-char'.
   * @param options.maxChars   Character count threshold before falling back. Default: 200.
   */
  function splitTextIntoChars(el, options = {}) {
    const {
      stagger = 60,
      charClass = buildAnimClass('char'),
      maxChars = 200,
    } = options;

    // Preserve the original markup for destroy. This is stored internally once.
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.innerHTML;
    }

    const textLength = el.textContent.trim().length;

    // Fallback to word splitting for very long strings.
    if (textLength > maxChars) {
      splitTextIntoWords(el, { stagger: stagger * 2, wordClass: charClass });
      return
    }

    let charIndex = 0;
    walkAndSplit(el, charClass, stagger, () => charIndex++);
  }

  /**
   * Splits text inside an element into word spans.
   *
   * @param el       Target element.
   * @param options  Configuration object.
   * @param options.stagger    Delay increment per word in milliseconds. Default: 120.
   * @param options.wordClass  Class name for generated spans. Default: 'readdy-anim-word'.
   */
  function splitTextIntoWords(el, options = {}) {
    const {
      stagger = 120,
      wordClass = buildAnimClass('word'),
    } = options;

    // Preserve the original markup for destroy.
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.innerHTML;
    }

    let wordIndex = 0;
    walkAndSplitByWord(el, wordClass, stagger, () => wordIndex++);
  }

  // ─────────────────────────────────────────────────────────
  // Internal implementation
  // ─────────────────────────────────────────────────────────

  /**
   * Child element tags that should never be split. Text inside them stays
   * untouched.
   */
  const PRESERVE_TAGS = new Set([
    'SVG', 'IMG', 'VIDEO', 'IFRAME', 'CANVAS', 'SCRIPT', 'STYLE',
  ]);

  /**
   * Returns whether a character is treated as whitespace and should not be split.
   */
  function isWhitespace(char) {
    return char === ' ' || char === '\n' || char === '\t' || char === ' '
  }

  /**
   * Recursively walks the DOM tree and splits all text nodes into per-character
   * spans.
   *
   * @param node          Current node being traversed.
   * @param charClass     Class name for generated spans.
   * @param stagger       Delay increment per character in milliseconds.
   * @param nextIndex     Returns the current character index and increments it.
   */
  function walkAndSplit(node, charClass, stagger, nextIndex) {
    // Snapshot child nodes first because the DOM is mutated during traversal.
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        // Element node: keep the tag and recurse into its children.
        if (PRESERVE_TAGS.has(child.tagName.toUpperCase())) {
          continue // Do not split SVG, IMG, and similar nodes.
        }
        walkAndSplit(child, charClass, stagger, nextIndex);

      } else if (child.nodeType === Node.TEXT_NODE) {
        // Text node: split into characters.
        const text = child.textContent;
        if (!text) continue

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          if (isWhitespace(char)) {
            // Preserve whitespace as a text node.
            fragment.appendChild(document.createTextNode(char));
          } else {
            // Wrap non-whitespace characters in spans.
            const span = document.createElement('span');
            span.className = charClass;
            span.style.animationDelay = `${nextIndex() * stagger}ms`;
            span.textContent = char;
            fragment.appendChild(span);
          }
        }

        // Replace the original text node with the generated fragment.
        child.parentNode.replaceChild(fragment, child);
      }
    }
  }

  /**
   * Recursively walks the DOM tree and splits all text nodes by word.
   *
   * @param node          Current node being traversed.
   * @param wordClass     Class name for generated spans.
   * @param stagger       Delay increment per word in milliseconds.
   * @param nextIndex     Returns the current word index and increments it.
   */
  function walkAndSplitByWord(node, wordClass, stagger, nextIndex) {
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (PRESERVE_TAGS.has(child.tagName.toUpperCase())) {
          continue
        }
        walkAndSplitByWord(child, wordClass, stagger, nextIndex);

      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (!text) continue

        // Split by whitespace while preserving the original whitespace tokens.
        const words = text.split(/(\s+)/);
        const fragment = document.createDocumentFragment();

        for (const part of words) {
          if (/^\s*$/.test(part)) {
            // Preserve pure whitespace as a text node.
            fragment.appendChild(document.createTextNode(part));
          } else {
            // Wrap non-whitespace words in spans.
            const span = document.createElement('span');
            span.className = wordClass;
            span.style.animationDelay = `${nextIndex() * stagger}ms`;
            span.textContent = part;
            fragment.appendChild(span);
          }
        }

        child.parentNode.replaceChild(fragment, child);
      }
    }
  }

  const CARD_MEDIA_CLASS = buildAnimClass('card-media');
  const buttonHostMap = new WeakMap();
  const headingHostMap = new WeakMap();
  const cardHostMap = new WeakMap();

  function hasVisibleBackground(style) {
    return (
      style.backgroundImage !== 'none' ||
      (style.backgroundColor &&
        style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        style.backgroundColor !== 'transparent')
    )
  }

  function toPixels(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0
  }

  function isButtonHost(node) {
    return (
      node.matches('button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]') ||
      (node.tagName === 'A' && node.hasAttribute('href'))
    )
  }

  function isHeadingHost(node) {
    return node.matches('h1, h2, h3, h4, h5, h6, [role="heading"]')
  }

  function hasTextContent(node) {
    return Array.from(node.childNodes).some((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return Boolean(child.textContent?.trim())
      }

      if (!(child instanceof HTMLElement)) {
        return false
      }

      if (child.matches('img, picture, video, canvas, svg')) {
        return false
      }

      return Boolean(child.textContent?.trim())
    })
  }

  function isLikelyCardHost(node) {
    if (node.matches(`.${CARD_MEDIA_CLASS}`)) {
      return false
    }

    const style = window.getComputedStyle(node);
    const hasSurface =
      hasVisibleBackground(style) ||
      style.boxShadow !== 'none' ||
      (style.borderStyle !== 'none' && toPixels(style.borderWidth) > 0);
    const hasShape =
      toPixels(style.borderRadius) > 0 ||
      toPixels(style.paddingTop) > 0 ||
      toPixels(style.paddingRight) > 0 ||
      toPixels(style.paddingBottom) > 0 ||
      toPixels(style.paddingLeft) > 0;
    const hasMedia = Boolean(node.querySelector('img, picture, video, canvas, svg'));
    const hasStructuredText = hasTextContent(node);
    const hasMultipleZones = node.childElementCount >= 2 || (hasMedia && hasStructuredText);
    const isStrongSemanticCard = /^(article|aside|figure)$/i.test(node.tagName);
    const isSection = /^section$/i.test(node.tagName);
    const hasCardSurface = hasSurface && hasShape;

    if (isStrongSemanticCard && (hasMultipleZones || hasCardSurface)) {
      return true
    }

    if (isSection && hasMultipleZones && hasCardSurface) {
      return true
    }

    return hasMultipleZones && hasCardSurface
  }

  function resolveClosestHost(el, predicate, rememberedHosts) {
    if (!(el instanceof HTMLElement)) {
      return el
    }

    const remembered = rememberedHosts.get(el);
    if (remembered instanceof HTMLElement) {
      if (!el.isConnected) {
        return remembered
      }

      if (remembered === el || remembered.contains(el)) {
        return remembered
      }
    }

    let candidate = el;
    while (candidate) {
      if (predicate(candidate)) {
        rememberedHosts.set(el, candidate);
        return candidate
      }
      candidate = candidate.parentElement;
    }

    rememberedHosts.set(el, el);
    return el
  }

  function resolveButtonHostElement(el) {
    return resolveClosestHost(el, isButtonHost, buttonHostMap)
  }

  function resolveHeadingHostElement(el) {
    return resolveClosestHost(el, isHeadingHost, headingHostMap)
  }

  function resolveCardHostElement(el) {
    return resolveClosestHost(el, (candidate) => candidate === el && isLikelyCardHost(candidate), cardHostMap)
  }

  const ANIMATION_ID$z = buildAnimId('letter-bounce');

  const CSS_CLASS$y = buildAnimClass('letter-bounce');
  const CHAR_CLASS$6 = buildAnimClass('letter-bounce-char');

  function init$z(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (!host.classList.contains(CSS_CLASS$y)) {
      host.classList.add(CSS_CLASS$y);
    }

    host.style.setProperty('--readdy-anim-letter-bounce-duration', `${options.duration ?? 850}ms`);
    host.style.setProperty('--readdy-anim-letter-bounce-amplitude', `${options.amplitude ?? 6}px`);

    splitTextIntoChars(host, {
      stagger: options.stagger ?? 60,
      charClass: CHAR_CLASS$6,
      maxChars: options.maxChars ?? 160,
    });
  }

  function destroy$z(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$y);
    host.style.removeProperty('--readdy-anim-letter-bounce-duration');
    host.style.removeProperty('--readdy-anim-letter-bounce-amplitude');
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var letterBounce = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$z,
    destroy: destroy$z,
    init: init$z
  });

  const ANIMATION_ID$y = buildAnimId('shimmer-text');

  const CSS_CLASS$x = buildAnimClass('shimmer-text');
  const UNIT_CLASS$1 = buildAnimClass('shimmer-text-unit');

  function wrapTextNodes$1(el) {
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.innerHTML;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();

    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent ?? '';
      if (!text.trim()) {
        continue
      }

      const span = document.createElement('span');
      span.className = UNIT_CLASS$1;
      span.textContent = text;
      textNode.parentNode?.replaceChild(span, textNode);
    }
  }

  function init$y(el) {
    const host = resolveHeadingHostElement(el);
    destroy$y(host);

    if (!host.classList.contains(CSS_CLASS$x)) {
      host.classList.add(CSS_CLASS$x);
    }

    wrapTextNodes$1(host);
  }

  function destroy$y(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$x);
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var shimmerText = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$y,
    destroy: destroy$y,
    init: init$y
  });

  /**
   * @readdy/anim/shared/reduced-motion.js
   *
   * Accessibility helper - detects prefers-reduced-motion
   * Used consistently by all React components and init functions.
   */

  /**
   * Detects whether the user prefers reduced motion.
   * @returns {boolean} True when reduced motion is preferred.
   */
  function prefersReducedMotion() {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  const ANIMATION_ID$x = buildAnimId('text-type');

  const CSS_CLASS$w = buildAnimClass('text-type');
  const CONTENT_CLASS = buildAnimClass('text-type-content');
  const CURSOR_CLASS = buildAnimClass('text-type-cursor');
  const RICH_CLASS = buildAnimClass('text-type-rich');
  const stateMap$9 = new WeakMap();

  function parsePhrases(el, options) {
    if (Array.isArray(options.texts) && options.texts.length > 0) {
      return {
        phrases: options.texts.map(String),
        source: 'options',
      }
    }

    const raw = el.dataset.textTypeValues?.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            phrases: parsed.map(String),
            source: 'data',
          }
        }
      } catch {}

      return {
        phrases: raw
          .split('|')
          .map((item) => item.trim())
          .filter(Boolean),
        source: 'data',
      }
    }

    return {
      phrases: [el.textContent ?? ''],
      source: 'dom',
    }
  }

  function clearState$1(state) {
    for (const timeoutId of state.timeouts) {
      window.clearTimeout(timeoutId);
    }
    state.timeouts.clear();
  }

  function schedule(state, fn, delay) {
    const timeoutId = window.setTimeout(() => {
      state.timeouts.delete(timeoutId);
      fn();
    }, delay);
    state.timeouts.add(timeoutId);
    return timeoutId
  }

  function hasRichTextStructure(el) {
    return Array.from(el.childNodes).some((node) => node.nodeType === Node.ELEMENT_NODE)
  }

  function normalizeComparableText(text) {
    return String(text).replace(/\s+/g, '')
  }

  function shouldUseRichMode(el, phrases) {
    if (!hasRichTextStructure(el)) {
      return false
    }

    if (phrases.length !== 1) {
      return false
    }

    return normalizeComparableText(phrases[0]) === normalizeComparableText(el.textContent ?? '')
  }

  function collectRichSegments(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const segments = [];
    let node = walker.nextNode();

    while (node) {
      segments.push({
        node,
        text: node.textContent ?? '',
      });
      node = walker.nextNode();
    }

    return segments
  }

  function setupRichContent(el) {
    const segments = collectRichSegments(el);
    const cursor = document.createElement('span');
    cursor.className = CURSOR_CLASS;
    cursor.setAttribute('aria-hidden', 'true');
    el.appendChild(cursor);

    return {
      cursor,
      segments,
    }
  }

  function renderRich(state, visibleCount) {
    let remaining = visibleCount;

    for (const segment of state.segments) {
      const nextLength = Math.max(0, Math.min(segment.text.length, remaining));
      segment.node.textContent = segment.text.slice(0, nextLength);
      remaining -= segment.text.length;
    }
  }

  function render(state, text) {
    if (state.mode === 'rich') {
      renderRich(state, text.length);
      return
    }

    state.content.textContent = text;
  }

  function typePhrase(state, phraseIndex) {
    const phrase = state.phrases[phraseIndex];
    const typingSpeed = state.typingSpeed;
    const deletingSpeed = state.deletingSpeed;
    const nextIndex = (phraseIndex + 1) % state.phrases.length;

    let cursor = 0;

    const typeNext = () => {
      cursor += 1;
      render(state, phrase.slice(0, cursor));

      if (cursor < phrase.length) {
        schedule(state, typeNext, typingSpeed);
        return
      }

      if (state.phrases.length === 1) {
        return
      }

      schedule(state, () => deletePhrase(phrase, nextIndex), state.pauseDuration);
    };

    const deletePhrase = (currentPhrase, targetIndex) => {
      let remaining = currentPhrase.length;

      const deleteNext = () => {
        remaining -= 1;
        render(state, currentPhrase.slice(0, remaining));

        if (remaining > 0) {
          schedule(state, deleteNext, deletingSpeed);
          return
        }

        schedule(state, () => typePhrase(state, targetIndex), typingSpeed);
      };

      schedule(state, deleteNext, deletingSpeed);
    };

    schedule(state, typeNext, typingSpeed);
  }

  function init$x(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    destroy$x(host);

    if (!host.dataset.originalText) {
      host.dataset.originalText = host.innerHTML;
    }

    const { phrases } = parsePhrases(host, options);
    const richMode = shouldUseRichMode(host, phrases);
    const finalPhrase = phrases[phrases.length - 1] ?? '';

    host.classList.add(CSS_CLASS$w);
    host.classList.toggle(RICH_CLASS, richMode);
    host.style.setProperty('--readdy-anim-text-type-gap', options.gap ?? '0.08em');
    host.style.setProperty('--readdy-anim-text-type-caret-width', options.caretWidth ?? '0.08em');
    host.style.setProperty('--readdy-anim-text-type-caret-blink-duration', `${options.caretBlinkDuration ?? 900}ms`);
    if (richMode) {
      const richContent = setupRichContent(host);
      const state = {
        mode: 'rich',
        ...richContent,
        phrases,
        typingSpeed: options.typingSpeed ?? 75,
        deletingSpeed: options.deletingSpeed ?? 45,
        pauseDuration: options.pauseDuration ?? 1500,
        timeouts: new Set(),
      };

      stateMap$9.set(host, state);

      if (prefersReducedMotion()) {
        render(state, finalPhrase);
        return
      }

      render(state, '');
      typePhrase(state, 0);
      return
    }

    host.innerHTML = `<span class="${CONTENT_CLASS}"></span><span class="${CURSOR_CLASS}" aria-hidden="true"></span>`;

    const state = {
      mode: 'plain',
      content: host.querySelector(`.${CONTENT_CLASS}`),
      cursor: host.querySelector(`.${CURSOR_CLASS}`),
      phrases,
      typingSpeed: options.typingSpeed ?? 75,
      deletingSpeed: options.deletingSpeed ?? 45,
      pauseDuration: options.pauseDuration ?? 1500,
      timeouts: new Set(),
    };

    stateMap$9.set(host, state);

    if (prefersReducedMotion()) {
      render(state, finalPhrase);
      return
    }

    render(state, '');
    typePhrase(state, 0);
  }

  function destroy$x(el) {
    const host = resolveHeadingHostElement(el);
    const state = stateMap$9.get(host);
    if (state) {
      clearState$1(state);
      stateMap$9.delete(host);
    }

    host.classList.remove(CSS_CLASS$w);
    host.classList.remove(RICH_CLASS);
    host.style.removeProperty('--readdy-anim-text-type-gap');
    host.style.removeProperty('--readdy-anim-text-type-caret-width');
    host.style.removeProperty('--readdy-anim-text-type-caret-blink-duration');

    if (state?.mode === 'rich') {
      for (const segment of state.segments) {
        segment.node.textContent = segment.text;
      }
      state.cursor?.remove();
      delete host.dataset.originalText;
      return
    }

    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var textType = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$x,
    destroy: destroy$x,
    init: init$x
  });

  const ANIMATION_ID$w = buildAnimId('gradient-text');

  const CSS_CLASS$v = buildAnimClass('gradient-text');
  const UNIT_CLASS = buildAnimClass('gradient-text-unit');

  function wrapTextNodes(el) {
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.innerHTML;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();

    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent ?? '';
      if (!text.trim()) {
        continue
      }

      const span = document.createElement('span');
      span.className = UNIT_CLASS;
      span.textContent = text;
      textNode.parentNode?.replaceChild(span, textNode);
    }
  }

  function init$w(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    destroy$w(host);

    if (!host.classList.contains(CSS_CLASS$v)) {
      host.classList.add(CSS_CLASS$v);
    }

    wrapTextNodes(host);
  }

  function destroy$w(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$v);
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var gradientText = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$w,
    destroy: destroy$w,
    init: init$w
  });

  const ANIMATION_ID$v = buildAnimId('fly-in-chars');

  const CSS_CLASS$u = buildAnimClass('fly-in-chars');
  const CHAR_CLASS$5 = buildAnimClass('fly-in-char');

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min))
  }

  function init$v(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (host.classList.contains(CSS_CLASS$u)) {
      return
    }

    host.classList.add(CSS_CLASS$u);

    if (prefersReducedMotion()) {
      return
    }

    splitTextIntoChars(host, {
      stagger: options.stagger ?? 36,
      charClass: CHAR_CLASS$5,
      maxChars: options.maxChars ?? 160,
    });

    const chars = host.querySelectorAll(`.${CHAR_CLASS$5}`);
    for (const char of chars) {
      char.style.setProperty('--readdy-anim-fly-in-x', `${randomBetween(-120, 120)}px`);
      char.style.setProperty('--readdy-anim-fly-in-y', `${randomBetween(-80, 80)}px`);
      char.style.setProperty('--readdy-anim-fly-in-rotate', `${randomBetween(-25, 25)}deg`);
    }
  }

  function destroy$v(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$u);
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var flyInChars = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$v,
    destroy: destroy$v,
    init: init$v
  });

  const ANIMATION_ID$u = buildAnimId('blur-to-sharp-rise');

  const CSS_CLASS$t = buildAnimClass('blur-rise');

  function init$u(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (!host.classList.contains(CSS_CLASS$t)) {
      host.classList.add(CSS_CLASS$t);
    }
  }

  function destroy$u(el) {
    resolveHeadingHostElement(el).classList.remove(CSS_CLASS$t);
  }

  var blurToSharpRise = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$u,
    destroy: destroy$u,
    init: init$u
  });

  const ANIMATION_ID$t = buildAnimId('blur-rise');

  const CSS_CLASS$s = buildAnimClass('blur-rise');

  function init$t(el, options = {}) {
    const host = resolveCardHostElement(el);
    if (!host.classList.contains(CSS_CLASS$s)) {
      host.classList.add(CSS_CLASS$s);
    }
  }

  function destroy$t(el) {
    resolveCardHostElement(el).classList.remove(CSS_CLASS$s);
  }

  var blurRise = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$t,
    destroy: destroy$t,
    init: init$t
  });

  const ANIMATION_ID$s = buildAnimId('split-text');

  const CSS_CLASS$r = buildAnimClass('split-text');
  const VISIBLE_CLASS = 'is-visible';
  const CHAR_CLASS$4 = buildAnimClass('split-text-char');
  const observerMap = new WeakMap();

  function reveal(el) {
    if (!el.classList.contains(VISIBLE_CLASS)) {
      el.classList.add(VISIBLE_CLASS);
    }
  }

  function init$s(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (host.classList.contains(CSS_CLASS$r)) {
      return
    }

    host.classList.add(CSS_CLASS$r);

    splitTextIntoChars(host, {
      stagger: options.stagger ?? 50,
      charClass: CHAR_CLASS$4,
      maxChars: options.maxChars ?? 180,
    });

    if (prefersReducedMotion()) {
      reveal(host);
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      reveal(host);
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal(host);
          observer.disconnect();
          observerMap.delete(host);
        }
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? '-100px 0px',
      }
    );

    observer.observe(host);
    observerMap.set(host, observer);
  }

  function destroy$s(el) {
    const host = resolveHeadingHostElement(el);
    const observer = observerMap.get(host);
    if (observer) {
      observer.disconnect();
      observerMap.delete(host);
    }

    host.classList.remove(CSS_CLASS$r, VISIBLE_CLASS);
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var splitText = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$s,
    destroy: destroy$s,
    init: init$s
  });

  const ANIMATION_ID$r = buildAnimId('shuffle');

  const CSS_CLASS$q = buildAnimClass('shuffle');
  const CHAR_CLASS$3 = buildAnimClass('shuffle-char');
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+-?';
  const stateMap$8 = new WeakMap();

  function randomGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
  }

  function clearState(state) {
    for (const intervalId of state.intervals) {
      window.clearInterval(intervalId);
    }
    for (const timeoutId of state.timeouts) {
      window.clearTimeout(timeoutId);
    }
    state.intervals = [];
    state.timeouts = [];
  }

  function runShuffle(el, options = {}) {
    const state = stateMap$8.get(el);
    if (!state) return

    clearState(state);

    const chars = [...el.querySelectorAll(`.${CHAR_CLASS$3}`)];
    chars.forEach((char, index) => {
      const finalChar = char.dataset.finalChar ?? char.textContent ?? '';
      const startDelay = index * (options.stagger ?? 35);
      const frames = options.shuffleFrames ?? 7;
      const frameDelay = options.frameDelay ?? 40;

      char.textContent = randomGlyph();
      char.classList.remove('is-settled');

      const timeoutId = window.setTimeout(() => {
        let frame = 0;
        const intervalId = window.setInterval(() => {
          frame += 1;
          char.textContent = frame >= frames ? finalChar : randomGlyph();
          char.classList.toggle('is-settled', frame >= frames);

          if (frame >= frames) {
            window.clearInterval(intervalId);
          }
        }, frameDelay);

        state.intervals.push(intervalId);
      }, startDelay);

      state.timeouts.push(timeoutId);
    });
  }

  function init$r(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (host.classList.contains(CSS_CLASS$q)) {
      return
    }

    host.classList.add(CSS_CLASS$q);

    host.style.setProperty('--readdy-anim-shuffle-opacity', `${options.idleOpacity ?? 0.45}`);
    host.style.setProperty('--readdy-anim-shuffle-translate-y', options.idleOffset ?? '0.08em');
    host.style.setProperty('--readdy-anim-shuffle-scale', `${options.idleScale ?? 0.98}`);
    host.style.setProperty('--readdy-anim-shuffle-settle-duration', `${options.settleDuration ?? 180}ms`);

    splitTextIntoChars(host, {
      stagger: options.stagger ?? 35,
      charClass: CHAR_CLASS$3,
      maxChars: options.maxChars ?? 120,
    });

    const chars = host.querySelectorAll(`.${CHAR_CLASS$3}`);
    chars.forEach((char) => {
      char.dataset.finalChar = char.textContent ?? '';
    });

    if (prefersReducedMotion()) {
      return
    }

    const state = {
      intervals: [],
      timeouts: [],
      onMouseEnter: () => runShuffle(host, options),
    };

    stateMap$8.set(host, state);
    host.addEventListener('mouseenter', state.onMouseEnter);
    runShuffle(host, options);
  }

  function destroy$r(el) {
    const host = resolveHeadingHostElement(el);
    const state = stateMap$8.get(host);
    if (state) {
      clearState(state);
      host.removeEventListener('mouseenter', state.onMouseEnter);
      stateMap$8.delete(host);
    }

    host.classList.remove(CSS_CLASS$q);
    host.style.removeProperty('--readdy-anim-shuffle-opacity');
    host.style.removeProperty('--readdy-anim-shuffle-translate-y');
    host.style.removeProperty('--readdy-anim-shuffle-scale');
    host.style.removeProperty('--readdy-anim-shuffle-settle-duration');
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var shuffle = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$r,
    destroy: destroy$r,
    init: init$r
  });

  const ANIMATION_ID$q = buildAnimId('roll-in');

  const CSS_CLASS$p = buildAnimClass('roll-in');
  const CHAR_CLASS$2 = buildAnimClass('roll-in-char');

  function init$q(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (host.classList.contains(CSS_CLASS$p)) {
      return
    }

    host.classList.add(CSS_CLASS$p);

    if (prefersReducedMotion()) {
      return
    }

    splitTextIntoChars(host, {
      stagger: options.stagger ?? 45,
      charClass: CHAR_CLASS$2,
      maxChars: options.maxChars ?? 160,
    });
  }

  function destroy$q(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$p);
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var rollIn = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$q,
    destroy: destroy$q,
    init: init$q
  });

  const ANIMATION_ID$p = buildAnimId('anime-splittext');

  const CSS_CLASS$o = buildAnimClass('anime-splittext');
  const WORD_CLASS$1 = buildAnimClass('anime-word');
  const WORD_INNER_CLASS = buildAnimClass('anime-word-inner');
  const CHAR_CLASS$1 = buildAnimClass('anime-char');

  function splitAnimatedUnits$1(text) {
    if (/\s/.test(text)) {
      return text.split(/(\s+)/).filter(Boolean)
    }

    return Array.from(text)
  }

  function buildWordFragment(word, wordIndex, stagger, duration) {
    const outer = document.createElement('span');
    outer.className = WORD_CLASS$1;
    outer.style.setProperty('--readdy-anim-word-offset', wordIndex % 2 === 0 ? '110%' : '-110%');

    const inner = document.createElement('span');
    inner.className = WORD_INNER_CLASS;
    inner.style.setProperty('--readdy-anim-word-delay', `${wordIndex * stagger}ms`);
    inner.style.setProperty('--readdy-anim-word-loop-delay', `${duration + 20 + wordIndex * stagger}ms`)

    ;[...word].forEach((char, charIndex) => {
      const charSpan = document.createElement('span');
      charSpan.className = CHAR_CLASS$1;
      charSpan.textContent = char;
      charSpan.style.setProperty(
        '--readdy-anim-char-delay',
        `${Math.round(duration * 0.6) + wordIndex * stagger + charIndex * 36}ms`
      );
      inner.appendChild(charSpan);
    });

    outer.appendChild(inner);
    return outer
  }

  function wrapWordsInTextNode$1(textNode, getWordIndex, stagger, duration) {
    const text = textNode.textContent ?? '';
    if (!text.trim()) {
      return
    }

    const parts = splitAnimatedUnits$1(text);
    const fragment = document.createDocumentFragment();

    for (const part of parts) {
      if (!part) continue

      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        continue
      }

      fragment.appendChild(buildWordFragment(part, getWordIndex(), stagger, duration));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  function splitWords$1(el, options = {}) {
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.innerHTML;
    }

    const stagger = options.stagger ?? 120;
    const duration = options.duration ?? 700;

    let wordIndex = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();

    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    for (const textNode of textNodes) {
      wrapWordsInTextNode$1(textNode, () => wordIndex++, stagger, duration);
    }
  }

  function init$p(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    destroy$p(host);

    if (!host.classList.contains(CSS_CLASS$o)) {
      host.classList.add(CSS_CLASS$o);
    }

    host.style.setProperty('--readdy-anim-anime-word-duration', `${options.duration ?? 700}ms`);
    splitWords$1(host, options);
  }

  function destroy$p(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$o);
    host.style.removeProperty('--readdy-anim-anime-word-duration');
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var animeSplittext = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$p,
    destroy: destroy$p,
    init: init$p
  });

  const ANIMATION_ID$o = buildAnimId('word-curtain-reveal');

  const CSS_CLASS$n = buildAnimClass('word-curtain-reveal');
  const WORD_CLASS = buildAnimClass('word-curtain-word');
  const INNER_CLASS$1 = buildAnimClass('word-curtain-inner');

  function splitAnimatedUnits(text) {
    if (/\s/.test(text)) {
      return text.split(/(\s+)/).filter(Boolean)
    }

    return Array.from(text)
  }

  function wrapWordsInTextNode(textNode, stagger, getWordIndex) {
    const text = textNode.textContent ?? '';
    if (!text.trim()) {
      return
    }

    const parts = splitAnimatedUnits(text);
    const fragment = document.createDocumentFragment();

    for (const part of parts) {
      if (!part) continue

      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        continue
      }

      const outer = document.createElement('span');
      outer.className = WORD_CLASS;

      const inner = document.createElement('span');
      inner.className = INNER_CLASS$1;
      inner.textContent = part;
      inner.style.animationDelay = `${getWordIndex() * stagger}ms`;

      outer.appendChild(inner);
      fragment.appendChild(outer);
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  function splitWords(el, stagger) {
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.innerHTML;
    }

    let wordIndex = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();

    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    for (const textNode of textNodes) {
      wrapWordsInTextNode(textNode, stagger, () => wordIndex++);
    }
  }

  function init$o(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    destroy$o(host);

    if (!host.classList.contains(CSS_CLASS$n)) {
      host.classList.add(CSS_CLASS$n);
    }

    host.style.setProperty(
      '--readdy-anim-word-curtain-duration',
      `${options.duration ?? 550}ms`
    );

    if (prefersReducedMotion()) {
      return
    }

    splitWords(host, options.stagger ?? 35);
  }

  function destroy$o(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$n);
    host.style.removeProperty('--readdy-anim-word-curtain-duration');
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var wordCurtainReveal = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$o,
    destroy: destroy$o,
    init: init$o
  });

  const ANIMATION_ID$n = buildAnimId('bounce-in-down');

  const CSS_CLASS$m = buildAnimClass('bounce-in-down');
  const CHAR_CLASS = buildAnimClass('bounce-in-down-char');

  function init$n(el, options = {}) {
    const host = resolveHeadingHostElement(el);
    if (host.classList.contains(CSS_CLASS$m)) {
      return
    }

    host.classList.add(CSS_CLASS$m);

    if (prefersReducedMotion()) {
      return
    }

    splitTextIntoChars(host, {
      stagger: options.stagger ?? 40,
      charClass: CHAR_CLASS,
      maxChars: options.maxChars ?? 160,
    });
  }

  function destroy$n(el) {
    const host = resolveHeadingHostElement(el);
    host.classList.remove(CSS_CLASS$m);
    if (host.dataset.originalText) {
      host.innerHTML = host.dataset.originalText;
      delete host.dataset.originalText;
    }
  }

  var bounceInDown = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$n,
    destroy: destroy$n,
    init: init$n
  });

  function getPointerMetrics(target, event) {
    const rect =
      target && typeof target.getBoundingClientRect === 'function'
        ? target.getBoundingClientRect()
        : target;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;

    return {
      rect,
      deltaX,
      deltaY,
      relativeX: rect.width ? deltaX / rect.width : 0,
      relativeY: rect.height ? deltaY / rect.height : 0,
    }
  }

  function attachPointerFollow(el, handlers) {
    const { onMove, onLeave, onEnter } = handlers;
    const requestFrame =
      window.requestAnimationFrame?.bind(window) ?? ((callback) => window.setTimeout(callback, 16));
    const cancelFrame =
      window.cancelAnimationFrame?.bind(window) ?? ((frameId) => window.clearTimeout(frameId));

    let frameId = null;
    let lastEvent = null;
    let activeRect = null;

    const context = {
      get rect() {
        return activeRect
      },
      refreshRect() {
        activeRect = el.getBoundingClientRect();
        return activeRect
      },
      getMetrics(event) {
        return getPointerMetrics(activeRect ?? context.refreshRect(), event)
      },
    };

    const flushMove = () => {
      frameId = null;
      if (!lastEvent) {
        return
      }
      if (!activeRect) {
        context.refreshRect();
      }
      onMove(lastEvent, context);
    };

    const handleEnter = (event) => {
      context.refreshRect();
      onEnter?.(event, context);
    };

    const handleMove = (event) => {
      lastEvent = event;
      if (frameId !== null) {
        return
      }
      frameId = requestFrame(flushMove);
    };

    const handleLeave = (event) => {
      if (frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
      lastEvent = null;
      activeRect = null;
      onLeave?.(event, context);
    };

    el.addEventListener('pointerenter', handleEnter);
    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);

    return () => {
      if (frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
      el.removeEventListener('pointerenter', handleEnter);
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
    }
  }

  const ANIMATION_ID$m = buildAnimId('magnetic-hover');

  const CSS_CLASS$l = buildAnimClass('magnetic-hover');
  const stateMap$7 = new WeakMap();

  function resetTransform(el) {
    el.style.setProperty('--readdy-anim-magnetic-x', '0px');
    el.style.setProperty('--readdy-anim-magnetic-y', '0px');
    el.style.setProperty('--readdy-anim-magnetic-scale', '1');
  }

  function init$m(el, options = {}) {
    const host = resolveButtonHostElement(el);
    destroy$m(host);

    host.classList.add(CSS_CLASS$l);
    resetTransform(host);

    if (prefersReducedMotion()) {
      return
    }

    const padding = options.padding ?? 150;
    const strength = options.strength ?? 3;

    const onMove = (event, context) => {
      const { rect, deltaX, deltaY } = getPointerMetrics(context.rect, event);

      if (Math.abs(deltaX) > rect.width / 2 + padding || Math.abs(deltaY) > rect.height / 2 + padding) {
        return
      }

      host.style.setProperty('--readdy-anim-magnetic-x', `${deltaX / strength}px`);
      host.style.setProperty('--readdy-anim-magnetic-y', `${deltaY / strength}px`);
      host.style.setProperty('--readdy-anim-magnetic-scale', '1.05');
    };

    const onLeave = () => {
      resetTransform(host);
    };

    const cleanup = attachPointerFollow(host, { onMove, onLeave });
    stateMap$7.set(host, { cleanup });
  }

  function destroy$m(el) {
    const host = resolveButtonHostElement(el);
    const state = stateMap$7.get(host);
    if (state) {
      state.cleanup();
      stateMap$7.delete(host);
    }

    host.classList.remove(CSS_CLASS$l);
    host.style.removeProperty('--readdy-anim-magnetic-x');
    host.style.removeProperty('--readdy-anim-magnetic-y');
    host.style.removeProperty('--readdy-anim-magnetic-scale');
  }

  var magneticHover = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$m,
    destroy: destroy$m,
    init: init$m
  });

  const ANIMATION_ID$l = buildAnimId('border-beam');

  const CSS_CLASS$k = buildAnimClass('border-beam');
  const LAYER_CLASS$1 = `${CSS_CLASS$k}__layer`;
  const BEAM_CLASS = `${CSS_CLASS$k}__beam`;
  const BEAM_WARM_CLASS = `${BEAM_CLASS}--warm`;
  const BEAM_COOL_CLASS = `${BEAM_CLASS}--cool`;
  const ANIMATION_KEY = '__readdyBorderBeamAnimation';
  const STATE_KEY = '__readdyBorderBeamState';
  const DEFAULT_SIZE = 72;

  function ensureLayer(el) {
    const existing = Array.from(el.children).find((child) => child.classList?.contains(LAYER_CLASS$1));
    if (existing) {
      const warmBeam = existing.querySelector(`.${BEAM_WARM_CLASS}`);
      const coolBeam = existing.querySelector(`.${BEAM_COOL_CLASS}`);
      if (warmBeam && coolBeam) {
        return { layer: existing, beams: [warmBeam, coolBeam] }
      }
      existing.remove();
    }

    const layer = document.createElement('span');
    layer.className = LAYER_CLASS$1;
    layer.setAttribute('aria-hidden', 'true');

    const warmBeam = document.createElement('span');
    warmBeam.className = `${BEAM_CLASS} ${BEAM_WARM_CLASS}`;
    layer.appendChild(warmBeam);

    const coolBeam = document.createElement('span');
    coolBeam.className = `${BEAM_CLASS} ${BEAM_COOL_CLASS}`;
    layer.appendChild(coolBeam);

    el.appendChild(layer);

    return { layer, beams: [warmBeam, coolBeam] }
  }

  function cancelAnimation(el) {
    el[ANIMATION_KEY]?.cancel?.();
    delete el[ANIMATION_KEY];
  }

  function getBeamSize(el, options) {
    if (typeof options.size === 'number') {
      return options.size
    }

    const { width, height } = el.getBoundingClientRect();
    return Math.max(DEFAULT_SIZE, Math.min(Math.round((width + height) * 0.22), 160))
  }

  function syncLayer(el) {
    const state = el[STATE_KEY];
    if (!state) return

    const { beams, options } = state;
    const radius = getComputedStyle(el).borderRadius || '0px';
    const size = getBeamSize(el, options);

    el.style.setProperty('--readdy-anim-border-beam-radius', radius);
    el.style.setProperty('--readdy-anim-border-beam-duration', `${options.duration ?? 3000}ms`);
    el.style.setProperty('--readdy-anim-border-beam-width', `${options.borderWidth ?? 1.35}px`);
    el.style.setProperty('--readdy-anim-border-beam-glow-opacity', `${options.glowOpacity ?? 0.28}`);
    el.style.setProperty('--readdy-anim-border-beam-size', `${size}px`);

    beams.forEach((beam, index) => {
      beam.style.width = `${size}px`;
      beam.style.offsetPath = `rect(0 auto auto 0 round ${radius})`;
      if (index === 0) {
        beam.style.setProperty('--readdy-anim-border-beam-color-from', options.colorFrom ?? '#ff6b6b');
        beam.style.setProperty('--readdy-anim-border-beam-color-to', options.colorTo ?? '#ffb86b');
      } else {
        beam.style.setProperty('--readdy-anim-border-beam-color-from', options.secondaryColorFrom ?? '#5ea0ff');
        beam.style.setProperty('--readdy-anim-border-beam-color-to', options.secondaryColorTo ?? '#9ec5ff');
      }
    });
  }

  function runAnimation(el) {
    const state = el[STATE_KEY];
    if (!state) return

    const { beams, options } = state;
    const initialOffset = options.initialOffset ?? 0;
    const duration = options.duration ?? 3000;
    const delay = options.delay ?? 0;
    const reverse = options.reverse ?? false;

    cancelAnimation(el);
    const animations = beams
      .map((beam, index) => {
        if (typeof beam.animate !== 'function') return null

        const beamOffset = initialOffset + index * 50;
        const from = reverse ? `${100 - beamOffset}%` : `${beamOffset}%`;
        const to = reverse ? `${-beamOffset}%` : `${100 + beamOffset}%`;
        beam.style.offsetDistance = from;

        return beam.animate(
          [
            { offsetDistance: from },
            { offsetDistance: to },
          ],
          {
            duration,
            delay: -delay,
            easing: 'linear',
            iterations: Infinity,
            fill: 'both',
          }
        )
      })
      .filter(Boolean);

    if (animations.length > 0) {
      el[ANIMATION_KEY] = {
        cancel() {
          animations.forEach((animation) => animation.cancel());
        },
      };
    }
  }

  function init$l(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$k)) {
      host.classList.add(CSS_CLASS$k);
    }

    const { layer, beams } = ensureLayer(host);
    const state = host[STATE_KEY] ?? { layer, beams, options };

    state.layer = layer;
    state.beams = beams;
    state.options = options;

    if (!state.resizeObserver && typeof ResizeObserver !== 'undefined') {
      state.resizeObserver = new ResizeObserver(() => {
        syncLayer(host);
      });
      state.resizeObserver.observe(host);
    }

    host[STATE_KEY] = state;
    syncLayer(host);
    runAnimation(host);
  }

  function destroy$l(el) {
    const host = resolveButtonHostElement(el);
    cancelAnimation(host);

    const state = host[STATE_KEY];
    state?.resizeObserver?.disconnect();
    state?.layer?.remove();
    delete host[STATE_KEY];

    host.classList.remove(CSS_CLASS$k);
    host.style.removeProperty('--readdy-anim-border-beam-radius');
    host.style.removeProperty('--readdy-anim-border-beam-duration');
    host.style.removeProperty('--readdy-anim-border-beam-width');
    host.style.removeProperty('--readdy-anim-border-beam-glow-opacity');
    host.style.removeProperty('--readdy-anim-border-beam-size');
  }

  var borderBeam = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$l,
    destroy: destroy$l,
    init: init$l
  });

  const ANIMATION_ID$k = buildAnimId('shimmer-border');

  const CSS_CLASS$j = buildAnimClass('shimmer-border');

  function init$k(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$j)) {
      host.classList.add(CSS_CLASS$j);
    }

    host.style.setProperty('--readdy-anim-shimmer-border-duration', `${options.duration ?? 800}ms`);
    host.style.setProperty('--readdy-anim-shimmer-border-width', `${options.borderWidth ?? 1.5}px`);
    host.style.setProperty('--readdy-anim-shimmer-border-opacity', `${options.opacity ?? 0.88}`);
  }

  function destroy$k(el) {
    const host = resolveButtonHostElement(el);
    host.classList.remove(CSS_CLASS$j);
    host.style.removeProperty('--readdy-anim-shimmer-border-duration');
    host.style.removeProperty('--readdy-anim-shimmer-border-width');
    host.style.removeProperty('--readdy-anim-shimmer-border-opacity');
  }

  var shimmerBorder = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$k,
    destroy: destroy$k,
    init: init$k
  });

  const ANIMATION_ID$j = buildAnimId('rainbow-button');

  const CSS_CLASS$i = buildAnimClass('rainbow-button');

  function init$j(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$i)) {
      host.classList.add(CSS_CLASS$i);
    }
  }

  function destroy$j(el) {
    resolveButtonHostElement(el).classList.remove(CSS_CLASS$i);
  }

  var rainbowButton = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$j,
    destroy: destroy$j,
    init: init$j
  });

  const ANIMATION_ID$i = buildAnimId('sketch-button');

  const CSS_CLASS$h = buildAnimClass('sketch-button');

  function init$i(el) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$h)) {
      host.classList.add(CSS_CLASS$h);
    }
  }

  function destroy$i(el) {
    resolveButtonHostElement(el).classList.remove(CSS_CLASS$h);
  }

  var sketchButton = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$i,
    destroy: destroy$i,
    init: init$i
  });

  const ANIMATION_ID$h = buildAnimId('confetti-button');

  const CSS_CLASS$g = buildAnimClass('confetti-button');
  const LAYER_CLASS = buildAnimClass('confetti-layer');
  const PIECE_CLASS = buildAnimClass('confetti-piece');
  const stateMap$6 = new WeakMap();

  function createBurst(el, options) {
    const layer = document.createElement('span');
    layer.className = LAYER_CLASS;
    el.appendChild(layer);

    const colors = options.colors ?? ['#22d3ee', '#a78bfa', '#f472b6', '#facc15', '#34d399'];
    const pieces = options.pieces ?? 18;

    for (let index = 0; index < pieces; index += 1) {
      const piece = document.createElement('span');
      piece.className = PIECE_CLASS;
      piece.style.setProperty('--readdy-anim-confetti-x', `${(Math.random() - 0.5) * 180}px`);
      piece.style.setProperty('--readdy-anim-confetti-y', `${ -40 - Math.random() * 90}px`);
      piece.style.setProperty('--readdy-anim-confetti-rotate', `${Math.random() * 360}deg`);
      piece.style.setProperty('--readdy-anim-confetti-delay', `${index * 14}ms`);
      piece.style.background = colors[index % colors.length];
      layer.appendChild(piece);
    }

    return window.setTimeout(() => {
      layer.remove();
    }, 1100)
  }

  function init$h(el, options = {}) {
    const host = resolveButtonHostElement(el);
    destroy$h(host);

    host.classList.add(CSS_CLASS$g);

    const onClick = () => {
      if (options.respectReducedMotion !== false && prefersReducedMotion()) {
        return
      }
      const timeoutId = createBurst(host, options);
      const state = stateMap$6.get(host);
      if (state) {
        state.timeoutIds.push(timeoutId);
      }
    };

    host.addEventListener('click', onClick);
    stateMap$6.set(host, { onClick, timeoutIds: [] });
  }

  function destroy$h(el) {
    const host = resolveButtonHostElement(el);
    const state = stateMap$6.get(host);
    if (state) {
      host.removeEventListener('click', state.onClick);
      state.timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      stateMap$6.delete(host);
    }

    host.classList.remove(CSS_CLASS$g);
    host.querySelectorAll(`.${LAYER_CLASS}`).forEach((node) => node.remove());
  }

  var confettiButton = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$h,
    destroy: destroy$h,
    init: init$h
  });

  const ANIMATION_ID$g = buildAnimId('glow-cta');

  const CSS_CLASS$f = buildAnimClass('glow-cta');
  const ACTIVE_CLASS$1 = buildAnimClass('glow-cta-active');
  const cleanups = new WeakMap();
  const GLOW_X_VAR = '--readdy-anim-glow-cta-x';
  const GLOW_Y_VAR = '--readdy-anim-glow-cta-y';

  function init$g(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (cleanups.has(host)) return

    host.classList.add(CSS_CLASS$f);
    host.style.setProperty(GLOW_X_VAR, '50%');
    host.style.setProperty(GLOW_Y_VAR, '50%');
    host.style.setProperty('--readdy-anim-glow-cta-scale', `${options.scale ?? 1.05}`);
    host.style.setProperty('--readdy-anim-glow-cta-padding', options.arrowPadding ?? 'calc(2rem + 1.2em)');
    host.style.setProperty('--readdy-anim-glow-cta-idle-opacity', `${options.idleOpacity ?? 0.2}`);
    host.style.setProperty('--readdy-anim-glow-cta-active-opacity', `${options.activeOpacity ?? 0.6}`);
    host.style.setProperty('--readdy-anim-glow-cta-inset', `${options.inset ?? -8}px`);

    if (prefersReducedMotion()) {
      cleanups.set(host, () => {});
      return
    }

    const cleanup = attachPointerFollow(host, {
      onMove(event, context) {
        const { rect } = context.getMetrics(event);
        const x = rect.width ? ((event.clientX - rect.left) / rect.width) * 100 : 50;
        const y = rect.height ? ((event.clientY - rect.top) / rect.height) * 100 : 50;

        host.style.setProperty(GLOW_X_VAR, `${Math.max(0, Math.min(100, x))}%`);
        host.style.setProperty(GLOW_Y_VAR, `${Math.max(0, Math.min(100, y))}%`);
        host.classList.add(ACTIVE_CLASS$1);
      },
      onLeave() {
        host.classList.remove(ACTIVE_CLASS$1);
        host.style.setProperty(GLOW_X_VAR, '50%');
        host.style.setProperty(GLOW_Y_VAR, '50%');
      },
    });

    cleanups.set(host, cleanup);
  }

  function destroy$g(el) {
    const host = resolveButtonHostElement(el);
    cleanups.get(host)?.();
    cleanups.delete(host);

    host.classList.remove(CSS_CLASS$f);
    host.classList.remove(ACTIVE_CLASS$1);
    host.style.removeProperty(GLOW_X_VAR);
    host.style.removeProperty(GLOW_Y_VAR);
    host.style.removeProperty('--readdy-anim-glow-cta-scale');
    host.style.removeProperty('--readdy-anim-glow-cta-padding');
    host.style.removeProperty('--readdy-anim-glow-cta-idle-opacity');
    host.style.removeProperty('--readdy-anim-glow-cta-active-opacity');
    host.style.removeProperty('--readdy-anim-glow-cta-inset');
  }

  var glowCta = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$g,
    destroy: destroy$g,
    init: init$g
  });

  const ANIMATION_ID$f = buildAnimId('bubble-button');

  const CSS_CLASS$e = buildAnimClass('bubble-button');
  const ACTIVE_CLASS = buildAnimClass('bubble-button-active');
  const HOVER_CLASS = buildAnimClass('bubble-button-hover');
  const FALLBACK_CLASS = buildAnimClass('bubble-button-fallback');
  const CONTAINER_CLASS = buildAnimClass('bubble-button-container');
  const EFFECT_CONTAINER_CLASS = buildAnimClass('bubble-button-effect-container');
  const EFFECT_BUTTON_CLASS = buildAnimClass('bubble-button-effect-button');
  const CIRCLE_CLASS = buildAnimClass('bubble-button-circle');
  const FILTER_ID = buildAnimDomId('bubble-goo');
  const FILTER_ROOT_ID = buildAnimDomId('bubble-goo-root');

  const stateMap$5 = new WeakMap();
  let gooFilterRefCount = 0;

  function ensureGooFilter() {
    gooFilterRefCount += 1;
    if (document.getElementById(FILTER_ID)) {
      return
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = FILTER_ROOT_ID;
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    svg.style.pointerEvents = 'none';

    svg.innerHTML = `
    <defs>
      <filter id="${FILTER_ID}">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 19 -9
          "
          result="goo"
        />
        <feComposite in="SourceGraphic" in2="goo" />
      </filter>
    </defs>
  `;

    document.body.appendChild(svg);
  }

  function releaseGooFilter() {
    gooFilterRefCount = Math.max(gooFilterRefCount - 1, 0);
    if (gooFilterRefCount === 0) {
      document.getElementById(FILTER_ROOT_ID)?.remove();
    }
  }

  function createCircle(position, slot) {
    const circle = document.createElement('span');
    circle.className = `${CIRCLE_CLASS} ${CIRCLE_CLASS}-${position} ${CIRCLE_CLASS}-${position}-${slot}`;
    return circle
  }

  function ensureStructure(el) {
    let container = el.parentElement;

    if (!container?.classList.contains(CONTAINER_CLASS)) {
      container = document.createElement('span');
      container.className = CONTAINER_CLASS;
      el.parentNode?.insertBefore(container, el);
      container.appendChild(el);
    }

    let effectContainer = container.querySelector(`.${EFFECT_CONTAINER_CLASS}`);
    if (!effectContainer) {
      effectContainer = document.createElement('span');
      effectContainer.className = EFFECT_CONTAINER_CLASS;
      effectContainer.style.filter = `url(#${FILTER_ID})`;
      effectContainer.style.webkitFilter = `url(#${FILTER_ID})`;

      effectContainer.appendChild(createCircle('top-left', 1));
      effectContainer.appendChild(createCircle('top-left', 2));
      effectContainer.appendChild(createCircle('top-left', 3));

      const effectButton = document.createElement('span');
      effectButton.className = EFFECT_BUTTON_CLASS;
      effectContainer.appendChild(effectButton);

      effectContainer.appendChild(createCircle('bottom-right', 1));
      effectContainer.appendChild(createCircle('bottom-right', 2));
      effectContainer.appendChild(createCircle('bottom-right', 3));

      container.appendChild(effectContainer);
    }

    return {
      container,
      effectContainer,
      effectButton: effectContainer.querySelector(`.${EFFECT_BUTTON_CLASS}`),
      circlesTopLeft: Array.from(effectContainer.querySelectorAll(`.${CIRCLE_CLASS}-top-left`)),
      circlesBottomRight: Array.from(effectContainer.querySelectorAll(`.${CIRCLE_CLASS}-bottom-right`)),
    }
  }

  function setAccent(container, el) {
    const computed = window.getComputedStyle(el);
    const backgroundColor = computed.backgroundColor;
    const accent = backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' ? backgroundColor : '#4f6bff';
    container.style.setProperty('--readdy-anim-bubble-accent', accent);
  }

  function clearAnimations(state) {
    state.animations.forEach((animation) => {
      animation.cancel();
    });
    state.animations = [];
  }

  function trackAnimation(state, animation) {
    if (!animation) {
      return
    }

    state.animations.push(animation);
    const forget = () => {
      state.animations = state.animations.filter((item) => item !== animation);
    };
    animation.addEventListener('finish', forget, { once: true });
    animation.addEventListener('cancel', forget, { once: true });
  }

  function clearInlineState(state) {
    const nodes = [
      state.effectButton,
      ...state.circlesTopLeft,
      ...state.circlesBottomRight,
    ].filter(Boolean);

    nodes.forEach((node) => {
      node.style.opacity = '';
      node.style.transform = '';
    });
  }

  function resetState(state) {
    clearAnimations(state);
    state.container.classList.remove(ACTIVE_CLASS);
    state.container.classList.remove(HOVER_CLASS);
    clearInlineState(state);
  }

  function hasWAAPI() {
    return typeof Element.prototype.animate === 'function'
  }

  function playBurst(state) {
    const { container, effectButton, circlesTopLeft, circlesBottomRight } = state;

    container.classList.remove(ACTIVE_CLASS);
    void container.offsetWidth;
    container.classList.add(HOVER_CLASS);
    container.classList.add(ACTIVE_CLASS);

    if (!state.supportsWAAPI) {
      return
    }

    clearAnimations(state);

    trackAnimation(
      state,
      effectButton?.animate(
        [
          { transform: 'translateY(-50%) scaleY(1)', opacity: 1 },
          { transform: 'translateY(-50%) scaleY(1.1)', opacity: 1, offset: 0.34 },
          { transform: 'translateY(-50%) scale(1)', opacity: 1 },
        ],
        {
          duration: 1000,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      )
    );

    const topFrames = [
      [
        { transform: 'translate(0, 0) rotate(-45deg) scale(1)', opacity: 1 },
        { transform: 'translate(-25px, -25px) rotate(-45deg) scale(1, 2)', opacity: 1, offset: 0.5 },
        { transform: 'translate(-19px, -27px) rotate(-45deg) scale(0.2)', opacity: 0.95, offset: 0.58 },
        { transform: 'translate(-24px, -42px) rotate(-45deg) scale(0)', opacity: 0 },
      ],
      [
        { transform: 'translate(0, 0) rotate(-45deg) scale(1)', opacity: 1 },
        { transform: 'translate(-25px, -25px) rotate(-45deg) scale(1, 2)', opacity: 1, offset: 0.5 },
        { transform: 'translate(-35px, -32px) rotate(-45deg) scale(1, 0.8)', opacity: 0.95, offset: 0.58 },
        { transform: 'translate(-45px, -42px) rotate(-45deg) scale(0.4)', opacity: 0 },
      ],
      [
        { transform: 'translate(0, 0) rotate(-45deg) scale(1)', opacity: 1 },
        { transform: 'translate(-25px, -25px) rotate(-45deg) scale(1, 2)', opacity: 1, offset: 0.5 },
        { transform: 'translate(-40px, -19px) rotate(-45deg) scale(0.2)', opacity: 0.95, offset: 0.58 },
        { transform: 'translate(-55px, -14px) rotate(-45deg) scale(0)', opacity: 0 },
      ],
    ];

    const bottomFrames = [
      [
        { transform: 'translate(0, 0) rotate(45deg) scale(1)', opacity: 1 },
        { transform: 'translate(30px, 30px) rotate(45deg) scale(1)', opacity: 1, offset: 0.48 },
        { transform: 'translate(24px, 33px) rotate(45deg) scale(0.2)', opacity: 0.95, offset: 0.56 },
        { transform: 'translate(29px, 48px) rotate(45deg) scale(0)', opacity: 0 },
      ],
      [
        { transform: 'translate(0, 0) rotate(45deg) scale(1)', opacity: 1 },
        { transform: 'translate(30px, 30px) rotate(45deg) scale(1)', opacity: 1, offset: 0.48 },
        { transform: 'translate(37px, 33px) rotate(45deg) scale(0.8)', opacity: 0.95, offset: 0.56 },
        { transform: 'translate(44px, 40px) rotate(45deg) scale(0.4)', opacity: 0 },
      ],
      [
        { transform: 'translate(0, 0) rotate(45deg) scale(1)', opacity: 1 },
        { transform: 'translate(30px, 30px) rotate(45deg) scale(1)', opacity: 1, offset: 0.48 },
        { transform: 'translate(45px, 24px) rotate(45deg) scale(0.2)', opacity: 0.95, offset: 0.56 },
        { transform: 'translate(60px, 19px) rotate(45deg) scale(0)', opacity: 0 },
      ],
    ];

    circlesTopLeft.forEach((circle, index) => {
      trackAnimation(
        state,
        circle.animate(topFrames[index], {
          duration: 1200,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        })
      );
    });

    circlesBottomRight.forEach((circle, index) => {
      trackAnimation(
        state,
        circle.animate(bottomFrames[index], {
          duration: 1100,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        })
      );
    });
  }

  function init$f(el) {
    const host = resolveButtonHostElement(el);
    destroy$f(host);
    host.classList.add(CSS_CLASS$e);

    if (prefersReducedMotion()) {
      return
    }

    ensureGooFilter();
    const structure = ensureStructure(host);
    setAccent(structure.container, host);

    const state = {
      ...structure,
      animations: [],
      supportsWAAPI: hasWAAPI(),
      onEnter: () => {},
      onLeave: () => {},
    };

    state.onEnter = () => {
      playBurst(state);
    };

    state.onLeave = () => {
      resetState(state);
    };

    state.container.addEventListener('mouseenter', state.onEnter);
    state.container.addEventListener('mouseleave', state.onLeave);
    state.container.classList.toggle(FALLBACK_CLASS, !state.supportsWAAPI);
    stateMap$5.set(host, state);
  }

  function destroy$f(el) {
    const host = resolveButtonHostElement(el);
    const state = stateMap$5.get(host);
    if (state) {
      state.container.removeEventListener('mouseenter', state.onEnter);
      state.container.removeEventListener('mouseleave', state.onLeave);
      resetState(state);
      releaseGooFilter();
      stateMap$5.delete(host);
    }

    host.classList.remove(CSS_CLASS$e);

    const container = host.parentElement?.classList.contains(CONTAINER_CLASS) ? host.parentElement : null;
    if (container) {
      container.classList.remove(ACTIVE_CLASS);
      container.classList.remove(HOVER_CLASS);
      container.classList.remove(FALLBACK_CLASS);
      container.style.removeProperty('--readdy-anim-bubble-accent');

      const parent = container.parentNode;
      if (parent && parent.contains(container)) {
        if (host.parentNode === container) {
          parent.insertBefore(host, container);
        }
      } else if (host.parentNode === container) {
        container.removeChild(host);
      }

      if (container.isConnected || container.parentNode) {
        container.remove();
      }
    }
  }

  var bubbleButton = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$f,
    destroy: destroy$f,
    init: init$f
  });

  const ANIMATION_ID$e = buildAnimId('bounce-elastic');

  const CSS_CLASS$d = buildAnimClass('bounce-elastic');

  function init$e(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$d)) {
      host.classList.add(CSS_CLASS$d);
    }
  }

  function destroy$e(el) {
    resolveButtonHostElement(el).classList.remove(CSS_CLASS$d);
  }

  var bounceElastic = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$e,
    destroy: destroy$e,
    init: init$e
  });

  const ANIMATION_ID$d = buildAnimId('pulse');

  const CSS_CLASS$c = buildAnimClass('pulse');

  function init$d(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$c)) {
      host.classList.add(CSS_CLASS$c);
    }
  }

  function destroy$d(el) {
    resolveButtonHostElement(el).classList.remove(CSS_CLASS$c);
  }

  var pulse = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$d,
    destroy: destroy$d,
    init: init$d
  });

  const ANIMATION_ID$c = buildAnimId('blur-fade-in');

  const CSS_CLASS$b = buildAnimClass('blur-fade-in');

  function init$c(el, options = {}) {
    const host = resolveButtonHostElement(el);
    if (!host.classList.contains(CSS_CLASS$b)) {
      host.classList.add(CSS_CLASS$b);
    }
  }

  function destroy$c(el) {
    resolveButtonHostElement(el).classList.remove(CSS_CLASS$b);
  }

  var blurFadeIn = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$c,
    destroy: destroy$c,
    init: init$c
  });

  const ANIMATION_ID$b = buildAnimId('3d-flip');

  const CSS_CLASS$a = buildAnimClass('3d-flip');
  const stateMap$4 = new WeakMap();

  function reset$1(el) {
    el.style.setProperty('--readdy-anim-3d-rotate-x', '0deg');
    el.style.setProperty('--readdy-anim-3d-rotate-y', '0deg');
    el.style.setProperty('--readdy-anim-3d-translate-x', '0px');
    el.style.setProperty('--readdy-anim-3d-translate-y', '0px');
  }

  function init$b(el, options = {}) {
    const host = resolveButtonHostElement(el);
    destroy$b(host);

    host.classList.add(CSS_CLASS$a);
    reset$1(host);

    if (prefersReducedMotion()) {
      return
    }

    const tilt = options.maxTilt ?? 12;
    const travel = options.translate ?? 8;

    const onMove = (event, context) => {
      const { relativeX, relativeY } = getPointerMetrics(context.rect, event);

      host.style.setProperty('--readdy-anim-3d-rotate-x', `${relativeY * -tilt * 2}deg`);
      host.style.setProperty('--readdy-anim-3d-rotate-y', `${relativeX * tilt * 2}deg`);
      host.style.setProperty('--readdy-anim-3d-translate-x', `${relativeX * travel * 2}px`);
      host.style.setProperty('--readdy-anim-3d-translate-y', `${relativeY * travel * 2}px`);
    };

    const onLeave = () => {
      reset$1(host);
    };

    const cleanup = attachPointerFollow(host, { onMove, onLeave });
    stateMap$4.set(host, { cleanup });
  }

  function destroy$b(el) {
    const host = resolveButtonHostElement(el);
    const state = stateMap$4.get(host);
    if (state) {
      state.cleanup();
      stateMap$4.delete(host);
    }

    host.classList.remove(CSS_CLASS$a);
    host.style.removeProperty('--readdy-anim-3d-rotate-x');
    host.style.removeProperty('--readdy-anim-3d-rotate-y');
    host.style.removeProperty('--readdy-anim-3d-translate-x');
    host.style.removeProperty('--readdy-anim-3d-translate-y');
  }

  var flip3d = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$b,
    destroy: destroy$b,
    init: init$b
  });

  const ANIMATION_ID$a = buildAnimId('float-idle');

  const CSS_CLASS$9 = buildAnimClass('float-idle');

  function init$a(el, options = {}) {
    const host = resolveCardHostElement(el);
    if (!host.classList.contains(CSS_CLASS$9)) {
      host.classList.add(CSS_CLASS$9);
    }
  }

  function destroy$a(el) {
    resolveCardHostElement(el).classList.remove(CSS_CLASS$9);
  }

  var floatIdle = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$a,
    destroy: destroy$a,
    init: init$a
  });

  const ANIMATION_ID$9 = buildAnimId('tilted-card');

  const CSS_CLASS$8 = buildAnimClass('tilted-card');
  const stateMap$3 = new WeakMap();

  function reset(el) {
    el.style.setProperty('--readdy-anim-card-tilt-x', '0deg');
    el.style.setProperty('--readdy-anim-card-tilt-y', '0deg');
    el.style.setProperty('--readdy-anim-card-scale', '1');
  }

  function init$9(el, options = {}) {
    const host = resolveCardHostElement(el);
    destroy$9(host);

    host.classList.add(CSS_CLASS$8);
    reset(host);

    const perspective = options.perspective ?? 900;
    const duration = options.duration ?? 550;
    host.style.setProperty('--readdy-anim-card-tilt-perspective', `${perspective}px`);
    host.style.setProperty('--readdy-anim-card-tilt-duration', `${duration}ms`);

    if (prefersReducedMotion()) {
      return
    }

    const maxTilt = options.maxTilt ?? 10;
    const scale = options.scale ?? 1.02;

    const onMove = (event, context) => {
      const { relativeX, relativeY } = getPointerMetrics(context.rect, event);

      host.style.setProperty('--readdy-anim-card-tilt-x', `${relativeY * -maxTilt * 2}deg`);
      host.style.setProperty('--readdy-anim-card-tilt-y', `${relativeX * maxTilt * 2}deg`);
      host.style.setProperty('--readdy-anim-card-scale', `${scale}`);
    };

    const onLeave = () => {
      reset(host);
    };

    const cleanup = attachPointerFollow(host, { onMove, onLeave });
    stateMap$3.set(host, { cleanup });
  }

  function destroy$9(el) {
    const host = resolveCardHostElement(el);
    const state = stateMap$3.get(host);
    if (state) {
      state.cleanup();
      stateMap$3.delete(host);
    }

    host.classList.remove(CSS_CLASS$8);
    host.style.removeProperty('--readdy-anim-card-tilt-x');
    host.style.removeProperty('--readdy-anim-card-tilt-y');
    host.style.removeProperty('--readdy-anim-card-scale');
    host.style.removeProperty('--readdy-anim-card-tilt-perspective');
    host.style.removeProperty('--readdy-anim-card-tilt-duration');
  }

  var tiltedCard = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$9,
    destroy: destroy$9,
    init: init$9
  });

  const ANIMATION_ID$8 = buildAnimId('card-flip');

  const CSS_CLASS$7 = buildAnimClass('card-flip');
  const SCENE_CLASS = buildAnimClass('card-flip-scene');
  const INNER_CLASS = buildAnimClass('card-flip-inner');
  const FACE_CLASS = buildAnimClass('card-flip-face');
  const FRONT_CLASS = buildAnimClass('card-flip-front');
  const BACK_CLASS = buildAnimClass('card-flip-back');

  const stateMap$2 = new WeakMap();
  const FACE_STYLE_PROPS = [
    'background',
    'backgroundColor',
    'backgroundImage',
    'backgroundSize',
    'backgroundPosition',
    'backgroundRepeat',
    'backgroundClip',
    'border',
    'borderTop',
    'borderRight',
    'borderBottom',
    'borderLeft',
    'borderRadius',
    'boxShadow',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'color',
    'backdropFilter',
    'WebkitBackdropFilter',
  ];

  function createEl(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el
  }

  function collectRenderableNodes(el) {
    return Array.from(el.childNodes).filter((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return true
      return (node.textContent ?? '').trim().length > 0
    })
  }

  function sanitizeBackFaceClone(root) {
    if (!(root instanceof HTMLElement)) {
      return
    }

    const nodes = [root, ...root.querySelectorAll('*')];

    root.removeAttribute('id');
    root.removeAttribute('tabindex');
    root.removeAttribute('aria-labelledby');
    root.removeAttribute('aria-describedby');
    root.removeAttribute('aria-controls');
    root.removeAttribute('for');

    nodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        node.removeAttribute('id');
      }
    });

    nodes.forEach((node) => {
      if (
        !(node instanceof HTMLElement) ||
        !node.matches(
          'a, button, input, textarea, select, summary, [tabindex], [contenteditable], label[for]'
        )
      ) {
        return
      }

        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('tabindex', '-1');
        node.removeAttribute('for');
        node.style.pointerEvents = 'none';
        if (
          node instanceof HTMLInputElement ||
          node instanceof HTMLTextAreaElement ||
          node instanceof HTMLSelectElement ||
          node instanceof HTMLButtonElement
        ) {
          node.disabled = true;
        }
      });
  }

  function buildBackFace(nodes) {
    const back = createEl('div', `${FACE_CLASS} ${BACK_CLASS}`);
    back.setAttribute('aria-hidden', 'true');
    back.append(
      ...nodes.map((node) => {
        const clone = node.cloneNode(true);
        sanitizeBackFaceClone(clone);
        return clone
      })
    );
    return back
  }

  function applyFaceShellStyles(host, face) {
    const styles = window.getComputedStyle(host);
    FACE_STYLE_PROPS.forEach((prop) => {
      const value = styles[prop];
      if (value) {
        face.style[prop] = value;
      }
    });
  }

  function init$8(el, options = {}) {
    const host = resolveCardHostElement(el);
    destroy$8(host);

    const originalNodes = collectRenderableNodes(host);
    const rect = host.getBoundingClientRect();
    const previousMinHeight = host.style.minHeight;
    const previousHeight = host.style.height;
    const previousTabIndex = host.getAttribute('tabindex');
    const previousInlineStyles = {
      background: host.style.background,
      backgroundColor: host.style.backgroundColor,
      backgroundImage: host.style.backgroundImage,
      border: host.style.border,
      boxShadow: host.style.boxShadow,
      padding: host.style.padding,
      overflow: host.style.overflow,
    };

    const scene = createEl('div', SCENE_CLASS);
    const inner = createEl('div', INNER_CLASS);
    const front = createEl('div', `${FACE_CLASS} ${FRONT_CLASS}`);
    const back = buildBackFace(originalNodes);

    applyFaceShellStyles(host, front);
    applyFaceShellStyles(host, back);

    front.append(...originalNodes);
    inner.append(front, back);
    scene.appendChild(inner);

    stateMap$2.set(host, {
      originalNodes,
      previousMinHeight,
      previousHeight,
      previousTabIndex,
      previousInlineStyles,
    });

    host.classList.add(CSS_CLASS$7);
    host.style.setProperty('--readdy-anim-card-flip-duration', `${options.duration ?? 500}ms`);
    host.style.setProperty('--readdy-anim-card-flip-perspective', `${options.perspective ?? 2000}px`);
    if (rect.height > 0) {
      host.style.minHeight = `${rect.height}px`;
    }
    host.style.background = 'transparent';
    host.style.backgroundColor = 'transparent';
    host.style.backgroundImage = 'none';
    host.style.border = 'none';
    host.style.boxShadow = 'none';
    host.style.padding = '0';
    host.style.overflow = 'visible';
    host.tabIndex = host.tabIndex >= 0 ? host.tabIndex : 0;
    host.replaceChildren(scene);
  }

  function destroy$8(el) {
    const host = resolveCardHostElement(el);
    const state = stateMap$2.get(host);
    host.classList.remove(CSS_CLASS$7);
    host.style.removeProperty('--readdy-anim-card-flip-duration');
    host.style.removeProperty('--readdy-anim-card-flip-perspective');

    if (state) {
      if (state.previousMinHeight) {
        host.style.minHeight = state.previousMinHeight;
      } else {
        host.style.removeProperty('min-height');
      }
      if (state.previousHeight) {
        host.style.height = state.previousHeight;
      } else {
        host.style.removeProperty('height');
      }
      if (state.previousTabIndex === null) {
        host.removeAttribute('tabindex');
      } else {
        host.setAttribute('tabindex', state.previousTabIndex);
      }
      Object.assign(host.style, state.previousInlineStyles);
      host.replaceChildren(...state.originalNodes);
      stateMap$2.delete(host);
    } else {
      host.removeAttribute('tabindex');
    }
  }

  var cardFlip = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$8,
    destroy: destroy$8,
    init: init$8
  });

  function hasUsableBackgroundImage(node) {
    const style = window.getComputedStyle(node);
    return Boolean(style.backgroundImage && style.backgroundImage !== 'none')
  }

  function isLikelyMediaContainer(node) {
    const style = window.getComputedStyle(node);
    return (
      style.overflow === 'hidden' ||
      style.position !== 'static' ||
      node.childElementCount === 1 ||
      hasUsableBackgroundImage(node)
    )
  }

  function resolveCardMediaElement(el, mediaClass) {
    if (el instanceof HTMLImageElement) {
      if (el.parentElement instanceof HTMLPictureElement && el.parentElement.parentElement instanceof HTMLElement) {
        return el.parentElement.parentElement
      }
      return el.parentElement instanceof HTMLElement ? el.parentElement : el
    }

    const byClass = el.querySelector(`.${mediaClass}`);
    if (byClass instanceof HTMLElement) {
      return byClass
    }

    const image = el.querySelector('img');
    if (image instanceof HTMLImageElement) {
      if (image.parentElement === el) {
        return el
      }

      let candidate = image.parentElement;
      while (candidate && candidate !== el) {
        if (isLikelyMediaContainer(candidate)) {
          return candidate
        }
        candidate = candidate.parentElement;
      }
    }

    const backgroundCandidate = Array.from(el.querySelectorAll('*')).find((node) => {
      if (!(node instanceof HTMLElement)) {
        return false
      }
      return hasUsableBackgroundImage(node)
    });

    if (backgroundCandidate instanceof HTMLElement) {
      return backgroundCandidate
    }

    if (el.firstElementChild instanceof HTMLImageElement) {
      return el
    }

    return el.firstElementChild instanceof HTMLElement ? el.firstElementChild : el
  }

  const ANIMATION_ID$7 = buildAnimId('image-zoom-rotate');

  const CSS_CLASS$6 = buildAnimClass('image-zoom-rotate');
  const MEDIA_CLASS$1 = buildAnimClass('card-media');

  const autoMediaState = new WeakMap();

  function init$7(el, options = {}) {
    destroy$7(el);

    if (el instanceof HTMLImageElement) {
      el.classList.add(CSS_CLASS$6);
      el.style.setProperty('--readdy-anim-image-zoom-scale', `${options.scale ?? 1.08}`);
      el.style.setProperty('--readdy-anim-image-zoom-rotate', `${options.rotate ?? 2}deg`);
      el.style.setProperty('--readdy-anim-image-zoom-duration', `${options.duration ?? 500}ms`);
      autoMediaState.set(el, { effectRoot: el, media: el, addedMediaClass: false });
      return
    }

    const media = resolveCardMediaElement(el, MEDIA_CLASS$1);
    if (!media) return

    const state = {
      effectRoot: media,
      media,
      addedMediaClass: false,
    };

    media.classList.add(CSS_CLASS$6);
    media.style.setProperty('--readdy-anim-image-zoom-scale', `${options.scale ?? 1.08}`);
    media.style.setProperty('--readdy-anim-image-zoom-rotate', `${options.rotate ?? 2}deg`);
    media.style.setProperty('--readdy-anim-image-zoom-duration', `${options.duration ?? 500}ms`);

    if (!media.classList.contains(MEDIA_CLASS$1)) {
      media.classList.add(MEDIA_CLASS$1);
      state.addedMediaClass = true;
    }

    autoMediaState.set(el, state);
  }

  function destroy$7(el) {
    el.classList.remove(CSS_CLASS$6);
    el.style.removeProperty('--readdy-anim-image-zoom-scale');
    el.style.removeProperty('--readdy-anim-image-zoom-rotate');
    el.style.removeProperty('--readdy-anim-image-zoom-duration');

    const state = autoMediaState.get(el);
    if (state?.effectRoot && state.effectRoot !== el) {
      state.effectRoot.classList.remove(CSS_CLASS$6);
      state.effectRoot.style.removeProperty('--readdy-anim-image-zoom-scale');
      state.effectRoot.style.removeProperty('--readdy-anim-image-zoom-rotate');
      state.effectRoot.style.removeProperty('--readdy-anim-image-zoom-duration');
    }
    if (state?.addedMediaClass) {
      state.media?.classList.remove(MEDIA_CLASS$1);
    }
    autoMediaState.delete(el);
  }

  var imageZoomRotate = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$7,
    destroy: destroy$7,
    init: init$7
  });

  const ANIMATION_ID$6 = buildAnimId('rgb-split-glitch');

  const CSS_CLASS$5 = buildAnimClass('rgb-split-glitch');

  function init$6(el, options = {}) {
    const host = resolveCardHostElement(el);
    if (!host.classList.contains(CSS_CLASS$5)) {
      host.classList.add(CSS_CLASS$5);
    }

    host.style.setProperty('--readdy-anim-rgb-glitch-duration', `${options.duration ?? 1100}ms`);
    host.style.setProperty('--readdy-anim-rgb-glitch-shift', `${options.shift ?? 3}px`);
    host.style.setProperty('--readdy-anim-rgb-glitch-shadow', `${options.shadowOffset ?? 2}px`);
  }

  function destroy$6(el) {
    const host = resolveCardHostElement(el);
    host.classList.remove(CSS_CLASS$5);
    host.style.removeProperty('--readdy-anim-rgb-glitch-duration');
    host.style.removeProperty('--readdy-anim-rgb-glitch-shift');
    host.style.removeProperty('--readdy-anim-rgb-glitch-shadow');
  }

  var rgbSplitGlitch = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$6,
    destroy: destroy$6,
    init: init$6
  });

  const ANIMATION_ID$5 = buildAnimId('card-fan-spread');

  const CSS_CLASS$4 = buildAnimClass('card-fan-spread');
  const STACK_CLASS = buildAnimClass('card-fan-stack');
  const ITEM_CLASS = buildAnimClass('card-fan-item');
  const SURFACE_CLASS = buildAnimClass('card-fan-surface');
  const VISUAL_CLASS = buildAnimClass('card-fan-visual');
  const VISUAL_TEXT_CLASS = buildAnimClass('card-fan-visual-text');
  const stateMap$1 = new WeakMap();

  function buildCardVisual(el) {
    const visual = el.cloneNode(true);
    visual.classList.add(VISUAL_CLASS);
    visual.removeAttribute('id');
    visual.removeAttribute('tabindex');
    visual.removeAttribute('aria-labelledby');
    visual.removeAttribute('aria-describedby');
    visual.removeAttribute('aria-controls');
    visual.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    visual.querySelectorAll('button, a, input, textarea, select, [tabindex]').forEach((node) => {
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('tabindex', '-1');
      node.style.pointerEvents = 'none';
    });
    visual.querySelectorAll('video, audio').forEach((node) => {
      node.pause?.();
      node.removeAttribute('autoplay');
      node.removeAttribute('controls');
    });
    visual.querySelectorAll('*').forEach((node) => {
      if (node.closest(`.${buildAnimClass('card-media')}`)) return
      if (node.children.length === 0 && (node.textContent ?? '').trim()) {
        node.classList.add(VISUAL_TEXT_CLASS);
      }
    });
    return visual
  }

  function buildLayer(visualTemplate, index, radius) {
    const item = document.createElement('div');
    item.className = ITEM_CLASS;
    item.setAttribute('aria-hidden', 'true');
    item.style.setProperty('--readdy-anim-card-fan-index', `${index}`);

    const surface = document.createElement('div');
    surface.className = SURFACE_CLASS;
    surface.style.borderRadius = radius;
    surface.appendChild(visualTemplate.cloneNode(true));
    item.appendChild(surface);
    return item
  }

  function ensureStack(el, visual) {
    const stack = document.createElement('div');
    stack.className = STACK_CLASS;
    stack.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < 2; index += 1) {
      stack.appendChild(buildLayer(visual.visualTemplate, index, visual.radius));
    }

    el.insertBefore(stack, el.firstChild);
    return stack
  }

  function init$5(el, options = {}) {
    const host = resolveCardHostElement(el);
    destroy$5(host);

    host.classList.add(CSS_CLASS$4);
    const spreadDistance = options.spreadDistance ?? 72;
    const spreadRotate = options.spreadRotate ?? 24;
    const depthRotate = options.depthRotate ?? 18;
    const lift = options.lift ?? 14;
    const duration = options.duration ?? 550;

    host.style.setProperty('--readdy-anim-card-fan-distance', `${spreadDistance}px`);
    host.style.setProperty('--readdy-anim-card-fan-rotate', `${spreadRotate}deg`);
    host.style.setProperty('--readdy-anim-card-fan-depth-rotate', `${depthRotate}deg`);
    host.style.setProperty('--readdy-anim-card-fan-lift', `${lift}px`);
    host.style.setProperty('--readdy-anim-card-fan-duration', `${duration}ms`);

    const visual = {
      visualTemplate: buildCardVisual(host),
      radius: window.getComputedStyle(host).borderRadius || 'inherit',
    };
    const stack = ensureStack(host, visual);
    const state = {
      savedTabIndex: host.getAttribute('tabindex'),
      toggle: null,
      onKeyDown: null,
      stack,
    };

    host.tabIndex = host.tabIndex >= 0 ? host.tabIndex : 0;

    if (prefersReducedMotion()) {
      stateMap$1.set(host, state);
      return
    }

    state.toggle = () => {
      host.classList.toggle('is-spread');
    };

    state.onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.toggle();
      }
    };

    host.addEventListener('click', state.toggle);
    host.addEventListener('keydown', state.onKeyDown);
    stateMap$1.set(host, state);
  }

  function destroy$5(el) {
    const host = resolveCardHostElement(el);
    const state = stateMap$1.get(host);
    if (state) {
      if (state.toggle) {
        host.removeEventListener('click', state.toggle);
      }
      if (state.onKeyDown) {
        host.removeEventListener('keydown', state.onKeyDown);
      }
      if (state.savedTabIndex === null) {
        host.removeAttribute('tabindex');
      } else {
        host.setAttribute('tabindex', state.savedTabIndex);
      }
      state.stack?.remove();
      stateMap$1.delete(host);
    }

    host.classList.remove(CSS_CLASS$4, 'is-spread');
    host.style.removeProperty('--readdy-anim-card-fan-distance');
    host.style.removeProperty('--readdy-anim-card-fan-rotate');
    host.style.removeProperty('--readdy-anim-card-fan-depth-rotate');
    host.style.removeProperty('--readdy-anim-card-fan-lift');
    host.style.removeProperty('--readdy-anim-card-fan-duration');
    host.querySelector(`.${STACK_CLASS}`)?.remove();
  }

  var cardFanSpread = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$5,
    destroy: destroy$5,
    init: init$5
  });

  const ANIMATION_ID$4 = buildAnimId('image-magnifier');

  const CSS_CLASS$3 = buildAnimClass('image-magnifier');
  const MEDIA_CLASS = buildAnimClass('card-media');
  const ENHANCED_MEDIA_CLASS = buildAnimClass('image-magnifier-media');
  const LENS_CLASS = buildAnimClass('image-magnifier-lens');
  const stateMap = new WeakMap();

  function resolveImageUrl(image) {
    try {
      return new URL(image.currentSrc || image.src, document.baseURI).href
    } catch {
      return image.currentSrc || image.src
    }
  }

  function parsePositionToken(token, axis) {
    const value = token.trim().toLowerCase();
    if (!value) {
      return null
    }

    if (value === 'center') {
      return { type: 'factor', value: 0.5 }
    }

    if (axis === 'x') {
      if (value === 'left') return { type: 'factor', value: 0 }
      if (value === 'right') return { type: 'factor', value: 1 }
    }

    if (axis === 'y') {
      if (value === 'top') return { type: 'factor', value: 0 }
      if (value === 'bottom') return { type: 'factor', value: 1 }
    }

    if (value.endsWith('%')) {
      const percentage = Number.parseFloat(value);
      if (Number.isFinite(percentage)) {
        return { type: 'factor', value: percentage / 100 }
      }
    }

    if (value.endsWith('px')) {
      const pixels = Number.parseFloat(value);
      if (Number.isFinite(pixels)) {
        return { type: 'px', value: pixels }
      }
    }

    return null
  }

  function resolveObjectPosition(image) {
    const raw = window.getComputedStyle(image).objectPosition || '50% 50%';
    const tokens = raw.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return {
        x: { type: 'factor', value: 0.5 },
        y: { type: 'factor', value: 0.5 },
      }
    }

    if (tokens.length === 1) {
      const token = tokens[0];
      const x = parsePositionToken(token, 'x');
      const y = parsePositionToken(token, 'y');

      if (y && !x) {
        return { x: { type: 'factor', value: 0.5 }, y }
      }

      return {
        x: x ?? { type: 'factor', value: 0.5 },
        y: { type: 'factor', value: 0.5 },
      }
    }

    let xToken = tokens[0];
    let yToken = tokens[1];
    const firstIsVertical = ['top', 'bottom'].includes(tokens[0].toLowerCase());
    const secondIsHorizontal = ['left', 'right'].includes(tokens[1].toLowerCase());

    if (firstIsVertical && secondIsHorizontal) {
      xToken = tokens[1];
      yToken = tokens[0];
    }

    return {
      x: parsePositionToken(xToken, 'x') ?? { type: 'factor', value: 0.5 },
      y: parsePositionToken(yToken, 'y') ?? { type: 'factor', value: 0.5 },
    }
  }

  function resolveObjectOffset(availableSpace, position) {
    if (position.type === 'px') {
      return position.value
    }
    return availableSpace * position.value
  }

  function ensureLens(el) {
    const media = resolveCardMediaElement(el, MEDIA_CLASS);
    media.classList.add(ENHANCED_MEDIA_CLASS);

    let lens = media.querySelector(`.${LENS_CLASS}`);
    if (!lens) {
      lens = document.createElement('span');
      lens.className = LENS_CLASS;
      media.appendChild(lens);
    }

    return { media, lens }
  }

  function syncLensSurface(media, lens, zoomFactor) {
    const image = media.querySelector('img');
    const computed = window.getComputedStyle(media);

    if (image?.currentSrc || image?.src) {
      lens.style.backgroundImage = `url("${resolveImageUrl(image)}")`;
      lens.style.backgroundColor = 'transparent';
      lens.style.backgroundRepeat = 'no-repeat';
      lens.style.removeProperty('background-size');
      return
    }

    lens.style.backgroundImage = computed.backgroundImage;
    lens.style.backgroundColor = computed.backgroundColor;
    lens.style.backgroundRepeat = computed.backgroundRepeat;
    lens.style.removeProperty('background-size');
  }

  function primeLensSurface(el, state, zoomFactor) {
    const { media, lens, image } = state;
    const markReady = () => {
      if (stateMap.get(el) !== state) {
        return
      }
      state.surfaceReady = true;
      syncLensSurface(media, lens);
      if (state.lastPointer) {
        syncLensPosition({
          mediaRect: media.getBoundingClientRect(),
          lens,
          image,
          pointerX: state.lastPointer.x,
          pointerY: state.lastPointer.y,
          lensSize: state.lensSize,
          zoomFactor,
        });
      }
    };

    if (!(image?.currentSrc || image?.src)) {
      markReady();
      return
    }

    syncLensSurface(media, lens);

    // If the image is already visible enough to be used as a magnifier source,
    // don't block pointer interaction on decode/load timing.
    state.surfaceReady = true;

    if (image.complete && image.naturalWidth) {
      if (typeof image.decode === 'function') {
        image.decode().then(markReady).catch(markReady);
        return
      }

      markReady();
      return
    }

    state.onLoad = () => {
      markReady();
    };
    image.addEventListener('load', state.onLoad, { once: true });
  }

  function syncLensPosition({
    mediaRect,
    lens,
    image,
    pointerX,
    pointerY,
    lensSize,
    zoomFactor,
  }) {
    const lensX = pointerX - mediaRect.left;
    const lensY = pointerY - mediaRect.top;

    lens.style.setProperty('--readdy-anim-image-magnifier-lens-x', `${lensX}px`);
    lens.style.setProperty('--readdy-anim-image-magnifier-lens-y', `${lensY}px`);
    lens.style.opacity = '1';

    if (image?.currentSrc || image?.src) {
      const imageRect = image.getBoundingClientRect();
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (naturalWidth && naturalHeight && imageRect.width && imageRect.height) {
        const localX = Math.min(Math.max(pointerX - imageRect.left, 0), imageRect.width);
        const localY = Math.min(Math.max(pointerY - imageRect.top, 0), imageRect.height);
        const scale = Math.max(imageRect.width / naturalWidth, imageRect.height / naturalHeight);
        const renderedWidth = naturalWidth * scale;
        const renderedHeight = naturalHeight * scale;
        const objectPosition = resolveObjectPosition(image);
        const offsetX = resolveObjectOffset(imageRect.width - renderedWidth, objectPosition.x);
        const offsetY = resolveObjectOffset(imageRect.height - renderedHeight, objectPosition.y);

        lens.style.backgroundSize = `${renderedWidth * zoomFactor}px ${renderedHeight * zoomFactor}px`;
        lens.style.backgroundPosition = `${
        -(localX - offsetX) * zoomFactor + lensSize / 2
      }px ${-(localY - offsetY) * zoomFactor + lensSize / 2}px`;
        return
      }
    }

    const localX = (lensX / mediaRect.width) * 100;
    const localY = (lensY / mediaRect.height) * 100;
    lens.style.setProperty('--readdy-anim-magnifier-x', `${localX}%`);
    lens.style.setProperty('--readdy-anim-magnifier-y', `${localY}%`);
    lens.style.backgroundPosition = `${localX}% ${localY}%`;
  }

  function init$4(el, options = {}) {
    destroy$4(el);

    if (prefersReducedMotion()) {
      el.classList.add(CSS_CLASS$3);
      return
    }

    const lensSize = options.lensSize ?? 104;
    const zoom = options.zoom ?? 320;
    const zoomFactor = zoom / 100;
    const fadeDuration = options.fadeDuration ?? 160;

    const { media, lens } = ensureLens(el);
    const image = media.querySelector('img');
    const effectRoot = el instanceof HTMLImageElement ? media : el;
    effectRoot.classList.add(CSS_CLASS$3);
    effectRoot.style.setProperty('--readdy-anim-image-magnifier-lens-size', `${lensSize}px`);
    effectRoot.style.setProperty('--readdy-anim-image-magnifier-zoom', `${zoom}%`);
    effectRoot.style.setProperty('--readdy-anim-image-magnifier-fade-duration', `${fadeDuration}ms`);

    const state = {
      effectRoot,
      media,
      lens,
      cleanupPointerFollow: () => {},
      image,
      onLoad: null,
      surfaceReady: false,
      lastPointer: null,
      lensSize,
    };

    const onMove = (event, context) => {
      state.lastPointer = {
        x: event.clientX,
        y: event.clientY,
      };
      if (!state.surfaceReady) {
        return
      }

      syncLensPosition({
        mediaRect: context.rect,
        lens,
        image,
        pointerX: event.clientX,
        pointerY: event.clientY,
        lensSize,
        zoomFactor,
      });
    };

    const onLeave = () => {
      lens.style.opacity = '0';
      state.lastPointer = null;
    };

    const onEnter = (event, context) => {
      state.lastPointer = {
        x: event.clientX,
        y: event.clientY,
      };
      if (!state.surfaceReady) {
        return
      }

      syncLensPosition({
        mediaRect: context.rect,
        lens,
        image,
        pointerX: event.clientX,
        pointerY: event.clientY,
        lensSize,
        zoomFactor,
      });
    };

    const cleanupPointerFollow = attachPointerFollow(media, { onEnter, onMove, onLeave });
    state.cleanupPointerFollow = cleanupPointerFollow;
    stateMap.set(el, state);
    primeLensSurface(el, state, zoomFactor);
  }

  function destroy$4(el) {
    const state = stateMap.get(el);
    if (state) {
      state.cleanupPointerFollow();
      if (state.image && state.onLoad) {
        state.image.removeEventListener('load', state.onLoad);
      }
      state.media.classList.remove(ENHANCED_MEDIA_CLASS);
      state.media.querySelector(`.${LENS_CLASS}`)?.remove();
      state.effectRoot.classList.remove(CSS_CLASS$3);
      state.effectRoot.style.removeProperty('--readdy-anim-image-magnifier-lens-size');
      state.effectRoot.style.removeProperty('--readdy-anim-image-magnifier-zoom');
      state.effectRoot.style.removeProperty('--readdy-anim-image-magnifier-fade-duration');
      stateMap.delete(el);
    }

    el.classList.remove(CSS_CLASS$3);
    el.style.removeProperty('--readdy-anim-image-magnifier-lens-size');
    el.style.removeProperty('--readdy-anim-image-magnifier-zoom');
    el.style.removeProperty('--readdy-anim-image-magnifier-fade-duration');
    el.querySelector(`.${LENS_CLASS}`)?.remove();
  }

  var imageMagnifier = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$4,
    destroy: destroy$4,
    init: init$4
  });

  const ANIMATION_ID$3 = buildAnimId('pop-in-stack');

  const CSS_CLASS$2 = buildAnimClass('pop-in-stack');

  function init$3(el, options = {}) {
    const host = resolveCardHostElement(el);
    if (!host.classList.contains(CSS_CLASS$2)) {
      host.classList.add(CSS_CLASS$2);
    }

    host.style.setProperty('--readdy-anim-pop-delay', `${options.delay ?? 0}ms`);
    host.style.setProperty('--readdy-anim-pop-duration', `${options.duration ?? 600}ms`);
    host.style.setProperty('--readdy-anim-pop-offset', `${options.offset ?? 18}px`);
    host.style.setProperty('--readdy-anim-pop-scale-start', `${options.scaleStart ?? 0.88}`);
  }

  function destroy$3(el) {
    const host = resolveCardHostElement(el);
    host.classList.remove(CSS_CLASS$2);
    host.style.removeProperty('--readdy-anim-pop-delay');
    host.style.removeProperty('--readdy-anim-pop-duration');
    host.style.removeProperty('--readdy-anim-pop-offset');
    host.style.removeProperty('--readdy-anim-pop-scale-start');
  }

  var popInStack = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$3,
    destroy: destroy$3,
    init: init$3
  });

  const ANIMATION_ID$2 = buildAnimId('bounce-in-bottom');

  const CSS_CLASS$1 = buildAnimClass('bounce-in-bottom');

  function init$2(el, options = {}) {
    const host = resolveCardHostElement(el);
    if (!host.classList.contains(CSS_CLASS$1)) {
      host.classList.add(CSS_CLASS$1);
    }
  }

  function destroy$2(el) {
    resolveCardHostElement(el).classList.remove(CSS_CLASS$1);
  }

  var bounceInBottom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$2,
    destroy: destroy$2,
    init: init$2
  });

  const ANIMATION_ID$1 = buildAnimId('reveal-from-top');

  const CSS_CLASS = buildAnimClass('reveal-from-top');

  function init$1(el, options = {}) {
    const host = resolveCardHostElement(el);
    if (!host.classList.contains(CSS_CLASS)) {
      host.classList.add(CSS_CLASS);
    }
  }

  function destroy$1(el) {
    resolveCardHostElement(el).classList.remove(CSS_CLASS);
  }

  var revealFromTop = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID$1,
    destroy: destroy$1,
    init: init$1
  });

  const ANIMATION_ID = buildAnimId('magic-ui-border-beam');

  function init(el, options = {}) {
    init$l(resolveCardHostElement(el), {
      duration: options.duration ?? 3000,
      delay: options.delay ?? 0,
      borderWidth: options.borderWidth ?? 1.35,
      glowOpacity: options.glowOpacity ?? 0.28,
      size: options.size,
      initialOffset: options.initialOffset ?? 0,
      colorFrom: options.colorFrom ?? '#ff6b6b',
      colorTo: options.colorTo ?? '#ffb86b',
      secondaryColorFrom: options.secondaryColorFrom ?? '#5ea0ff',
      secondaryColorTo: options.secondaryColorTo ?? '#9ec5ff',
      reverse: options.reverse ?? false,
    });
  }

  function destroy(el) {
    destroy$l(resolveCardHostElement(el));
  }

  var magicUiBorderBeam = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANIMATION_ID: ANIMATION_ID,
    destroy: destroy,
    init: init
  });

  /**
   * UMD bundle entry - aggregates init/destroy pairs for all unique animations.
   * The Rollup UMD bundle is exported as `ReaddyAnim`, which exposes a registry
   * keyed by ANIMATION_ID so browser consumers can access animations through
   * `window.ReaddyAnim[id]`.
   */


  function defineAnimation(mod) {
    return {
      init: mod.init,
      destroy: mod.destroy,
    }
  }

  function buildMetadataId(category, slug) {
    return `anim-readdy-${category}-${slug}`
  }

  function register(registry, mod, aliases = []) {
    const entry = defineAnimation(mod);
    registry[mod.ANIMATION_ID] = entry;
    for (const alias of aliases) {
      registry[alias] = entry;
    }
  }

  const registry = {};

  register(registry, letterBounce, [buildMetadataId('header', 'letter-bounce')]);
  register(registry, shimmerText, [buildMetadataId('header', 'shimmer-text')]);
  register(registry, textType, [buildMetadataId('header', 'text-type')]);
  register(registry, gradientText, [buildMetadataId('header', 'gradient-text')]);
  register(registry, flyInChars, [buildMetadataId('header', 'fly-in-chars')]);
  register(registry, blurToSharpRise, [buildMetadataId('header', 'blur-to-sharp-rise')]);
  register(registry, blurRise, [buildMetadataId('card', 'blur-rise')]);
  register(registry, splitText, [buildMetadataId('header', 'split-text')]);
  register(registry, shuffle, [buildMetadataId('header', 'shuffle')]);
  register(registry, rollIn, [buildMetadataId('header', 'roll-in')]);
  register(registry, animeSplittext, [buildMetadataId('header', 'anime-splittext')]);
  register(registry, wordCurtainReveal, [buildMetadataId('header', 'word-curtain-reveal')]);
  register(registry, bounceInDown, [buildMetadataId('header', 'bounce-in-down')]);

  register(registry, magneticHover, [buildMetadataId('button', 'magnetic-hover')]);
  register(registry, borderBeam, [buildMetadataId('button', 'border-beam')]);
  register(registry, shimmerBorder, [buildMetadataId('button', 'shimmer-border')]);
  register(registry, rainbowButton, [buildMetadataId('button', 'rainbow-button')]);
  register(registry, sketchButton, [buildMetadataId('button', 'sketch-button')]);
  register(registry, confettiButton, [buildMetadataId('button', 'confetti-button')]);
  register(registry, glowCta, [buildMetadataId('button', 'glow-cta')]);
  register(registry, bubbleButton, [buildMetadataId('button', 'bubble-button')]);
  register(registry, bounceElastic, [buildMetadataId('button', 'bounce-elastic')]);
  register(registry, pulse, [buildMetadataId('button', 'pulse')]);
  register(registry, blurFadeIn, [buildMetadataId('button', 'blur-fade-in')]);
  register(registry, flip3d, [buildMetadataId('button', '3d-flip')]);

  register(registry, floatIdle, [buildMetadataId('card', 'float-idle')]);
  register(registry, tiltedCard, [buildMetadataId('card', 'tilted-card')]);
  register(registry, cardFlip, [buildMetadataId('card', 'card-flip')]);
  register(registry, imageZoomRotate, [buildMetadataId('card', 'image-zoom-rotate')]);
  register(registry, rgbSplitGlitch, [buildMetadataId('card', 'rgb-split-glitch')]);
  register(registry, cardFanSpread, [buildMetadataId('card', 'card-fan-spread')]);
  register(registry, imageMagnifier, [buildMetadataId('card', 'image-magnifier')]);
  register(registry, popInStack, [buildMetadataId('card', 'pop-in-stack')]);
  register(registry, bounceInBottom, [buildMetadataId('card', 'bounce-in-bottom')]);
  register(registry, revealFromTop, [buildMetadataId('card', 'reveal-from-top')]);
  register(registry, magicUiBorderBeam, [buildMetadataId('card', 'magic-ui-border-beam')]);

  return registry;

}));
