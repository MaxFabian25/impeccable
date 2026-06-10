import {
	initGlassTerminal,
	renderTerminalLayout,
} from "./js/components/glass-terminal.js";
import { initLensEffect } from "./js/components/lens.js";
import { initFrameworkViz } from "./js/components/framework-viz.js";
import { initScrollReveal } from "./js/utils/reveal.js";
import { initAnchorScroll, initHashTracking } from "./js/utils/scroll.js";
import { initSectionNav } from "./js/components/section-nav.js";
import { initFoundationGrid } from "./js/components/foundation-grid.js";
import { initLiveDemo } from "./js/components/live-demo.js";

// ============================================
// STATE
// ============================================

let allCommands = [];

// ============================================
// CONTENT LOADING
// ============================================

function escapeHtml(value) {
	if (typeof value !== "string") return "";
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

async function loadContent() {
	try {
		const [commandsRes, patternsRes] = await Promise.all([
			fetch("/api/commands"),
			fetch("/api/patterns"),
		]);

		// Check for HTTP errors
		if (!commandsRes.ok) {
			throw new Error(`Commands API failed: ${commandsRes.status}`);
		}
		if (!patternsRes.ok) {
			throw new Error(`Patterns API failed: ${patternsRes.status}`);
		}

		allCommands = await commandsRes.json();
		const patternsData = await patternsRes.json();

		// Render commands (Glass Terminal)
		renderTerminalLayout(allCommands);

		// Initialize gallery card stack
		initGalleryStack();

		// Render patterns with tabbed navigation
		renderPatternsWithTabs(patternsData.patterns, patternsData.antipatterns);

		// Let hash restoration retry after async command targets exist.
		window.dispatchEvent(new CustomEvent('impeccable:content-loaded'));
	} catch (error) {
		console.error("Failed to load content:", error);
		showLoadError(error);
	}
}

function showLoadError(error) {
	// Show error in commands section
	const commandsGallery = document.querySelector('.commands-gallery');
	if (commandsGallery) {
		commandsGallery.innerHTML = `
			<div class="load-error" role="alert">
				<div class="load-error-icon" aria-hidden="true">⚠</div>
				<h3 class="load-error-title">Failed to load commands</h3>
				<p class="load-error-text">There was a problem loading the content. Please check your connection and try again.</p>
				<button class="btn btn-secondary load-error-retry" onclick="location.reload()">
					Retry
				</button>
			</div>
		`;
	}

	// Show error in patterns section
	const patternsContainer = document.getElementById("patterns-categories");
	if (patternsContainer) {
		patternsContainer.innerHTML = `
			<div class="load-error" role="alert">
				<div class="load-error-icon" aria-hidden="true">⚠</div>
				<h3 class="load-error-title">Failed to load patterns</h3>
				<p class="load-error-text">There was a problem loading the content. Please check your connection and try again.</p>
				<button class="btn btn-secondary load-error-retry" onclick="location.reload()">
					Retry
				</button>
			</div>
		`;
	}
}

function initGalleryStack() {
	const container = document.querySelector('.gallery-stack-container');
	const stack = document.getElementById('gallery-stack');
	if (!stack || !container) return;

	const cards = stack.querySelectorAll('.gallery-stack-card');
	const counter = container.querySelector('.gallery-stack-counter');
	const total = cards.length;
	let current = 0;
	let lastScroll = 0;

	function update() {
		cards.forEach((card, i) => {
			const offset = (i - current + total) % total;
			card.dataset.offset = offset;
		});
	}

	function next() { current = (current + 1) % total; update(); }
	function prev() { current = (current - 1 + total) % total; update(); }

	container.querySelector('.gallery-stack-prev').addEventListener('click', prev);
	container.querySelector('.gallery-stack-next').addEventListener('click', next);

	stack.addEventListener('wheel', (e) => {
		e.preventDefault();
		const now = Date.now();
		if (now - lastScroll < 350) return;
		lastScroll = now;
		if (e.deltaY > 0) next(); else prev();
	}, { passive: false });

	update();
}

function renderPatternsWithTabs(patterns, antipatterns) {
	const container = document.getElementById("patterns-categories");
	if (!container || !patterns || !antipatterns) return;

	const antipatternMap = {};
	antipatterns.forEach(cat => { antipatternMap[cat.name] = cat.items; });

	const tabsHTML = patterns.map((cat, i) =>
		`<button class="patterns-tab${i === 0 ? ' is-active' : ''}" data-index="${i}">${escapeHtml(cat.name)}</button>`
	).join('');

	const panelsHTML = patterns.map((cat, i) => {
		const antiItems = antipatternMap[cat.name] || [];
		return `
		<div class="patterns-content${i === 0 ? ' is-active' : ''}" data-index="${i}">
			<div class="patterns-col patterns-col--dont">
				<ul>${antiItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
			</div>
			<div class="patterns-col patterns-col--do">
				<ul>${cat.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
			</div>
		</div>`;
	}).join('');

	container.innerHTML = `<div class="patterns-tabs">${tabsHTML}</div>${panelsHTML}`;

	container.addEventListener('click', (e) => {
		const tab = e.target.closest('.patterns-tab');
		if (!tab) return;
		const index = tab.dataset.index;
		container.querySelectorAll('.patterns-tab').forEach(t => t.classList.remove('is-active'));
		container.querySelectorAll('.patterns-content').forEach(p => p.classList.remove('is-active'));
		tab.classList.add('is-active');
		container.querySelector(`.patterns-content[data-index="${index}"]`).classList.add('is-active');
	});
}

// ============================================
// EVENT HANDLERS
// ============================================

// Handle Codex bundle download clicks via event delegation.
// Each download button carries the full bundle name in data-bundle (for
// example "codex" or "codex-prefixed"), so the handler is just a redirect.
document.addEventListener("click", (e) => {
	const bundleBtn = e.target.closest("[data-bundle]");
	if (bundleBtn) {
		const bundleName = bundleBtn.dataset.bundle;
		window.location.href = `/api/download/bundle/${bundleName}`;
	}

	// Handle copy button clicks
	const copyBtn = e.target.closest("[data-copy]");
	if (copyBtn) {
		const textToCopy = copyBtn.dataset.copy;
		const onCopied = () => {
			copyBtn.classList.add('copied');
			setTimeout(() => copyBtn.classList.remove('copied'), 1500);
		};
		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(textToCopy).then(onCopied).catch(() => {});
		} else {
			// Fallback for non-HTTPS or older browsers
			const ta = Object.assign(document.createElement('textarea'), { value: textToCopy, style: 'position:fixed;left:-9999px' });
			document.body.appendChild(ta);
			ta.select();
			try { document.execCommand('copy'); onCopied(); } catch {}
			ta.remove();
		}
	}
});


// ============================================
// STARTUP
// ============================================

function init() {
	initAnchorScroll();
	initHashTracking();
	initLensEffect();
	initScrollReveal();
	initGlassTerminal();
	initFrameworkViz();
	initFoundationGrid();
	initSectionNav();
	initWhyTabs();
	initLanguageTabs();
	initLiveDemo();
	loadContent();

	document.body.classList.add("loaded");
}

function initLanguageTabs() {
	const toggle = document.querySelector(".language-view-toggle");
	if (!toggle) return;

	const tabs = Array.from(toggle.querySelectorAll(".language-view-tab"));
	const panels = Array.from(document.querySelectorAll(".language-view[data-view-panel]"));
	if (!tabs.length || !panels.length) return;

	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			const view = tab.dataset.view;

			tabs.forEach((candidate) => {
				const active = candidate === tab;
				candidate.classList.toggle("is-active", active);
				candidate.setAttribute("aria-selected", active ? "true" : "false");
			});

			panels.forEach((panel) => {
				const active = panel.dataset.viewPanel === view;
				panel.classList.toggle("is-active", active);
				if (active) {
					panel.removeAttribute("hidden");
				} else {
					panel.setAttribute("hidden", "");
				}
			});
		});
	});
}

function initWhyTabs() {
	const container = document.querySelector(".why-layout");
	if (!container) return;

	const tabs = Array.from(container.querySelectorAll(".why-tab"));
	const panels = Array.from(container.querySelectorAll(".why-panel"));
	if (!tabs.length || !panels.length) return;

	const cycleMs = 7000;
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let current = Math.max(0, tabs.findIndex((tab) => tab.classList.contains("is-active")));
	let timer = null;
	let autoRotate = !reducedMotion;
	let visible = false;

	container.style.setProperty("--why-cycle-ms", `${cycleMs}ms`);

	const activate = (index) => {
		current = index;

		tabs.forEach((tab, i) => {
			const active = i === index;
			tab.classList.toggle("is-active", active);
			tab.setAttribute("aria-selected", active ? "true" : "false");
			tab.classList.remove("is-cycling");
		});

		panels.forEach((panel, i) => {
			const active = i === index;
			panel.classList.toggle("is-active", active);
			if (active) {
				panel.removeAttribute("hidden");
			} else {
				panel.setAttribute("hidden", "");
			}
		});

		if (autoRotate && visible) {
			const active = tabs[index];
			void active.offsetWidth;
			active.classList.add("is-cycling");
		}
	};

	const scheduleNext = () => {
		clearTimeout(timer);
		if (!autoRotate || !visible) return;

		timer = setTimeout(() => {
			const next = (current + 1) % tabs.length;
			activate(next);
			scheduleNext();
		}, cycleMs);
	};

	const stopAuto = () => {
		autoRotate = false;
		clearTimeout(timer);
		tabs.forEach((tab) => tab.classList.remove("is-cycling"));
	};

	tabs.forEach((tab, index) => {
		tab.addEventListener("click", () => {
			stopAuto();
			activate(index);
		});
		tab.addEventListener("keydown", (event) => {
			if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

			event.preventDefault();
			stopAuto();
			const direction = event.key === "ArrowDown" ? 1 : -1;
			const next = (index + direction + tabs.length) % tabs.length;
			tabs[next].focus();
			activate(next);
		});
	});

	container.addEventListener("mouseenter", () => {
		clearTimeout(timer);
		tabs.forEach((tab) => tab.classList.remove("is-cycling"));
	});

	container.addEventListener("mouseleave", () => {
		if (!autoRotate || !visible) return;

		const active = tabs[current];
		void active.offsetWidth;
		active.classList.add("is-cycling");
		scheduleNext();
	});

	const observer = new IntersectionObserver((entries) => {
		visible = entries.some((entry) => entry.isIntersecting);
		if (visible && autoRotate) {
			const active = tabs[current];
			void active.offsetWidth;
			active.classList.add("is-cycling");
			scheduleNext();
		} else {
			clearTimeout(timer);
			tabs.forEach((tab) => tab.classList.remove("is-cycling"));
		}
	}, { threshold: 0.35 });

	observer.observe(container);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
