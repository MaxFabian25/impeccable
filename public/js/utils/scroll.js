const ANCHOR_OFFSET = 40;
const CONTENT_READY_EVENT = 'impeccable:content-loaded';

function scrollInstantlyTo(target) {
	const targetPosition = target.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET;
	window.scrollTo({ top: targetPosition, behavior: 'instant' });
}

// Instant anchor scroll - no smooth scrolling for better UX on long pages.
// `behavior: 'instant'` explicitly wins over any inherited CSS scroll-behavior.
export function initAnchorScroll() {
	document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
		anchor.addEventListener("click", (e) => {
			e.preventDefault();
			const target = document.querySelector(anchor.getAttribute("href"));
			if (target) {
				scrollInstantlyTo(target);
			}
		});
	});
}

export function initHashTracking() {
	const sections = document.querySelectorAll('section[id]');
	if (!sections.length) return;

	let currentHash = window.location.hash.slice(1) || '';
	let ticking = false;

	function updateHash() {
		// Don't override command deep links while user is in the commands section
		if (currentHash.startsWith('cmd-')) {
			const cmdEl = document.getElementById(currentHash);
			if (cmdEl) {
				const rect = cmdEl.getBoundingClientRect();
				// Only clear the cmd hash if user scrolled well away from commands section
				if (rect.top > window.innerHeight * 2 || rect.bottom < -window.innerHeight) {
					currentHash = '';
				} else {
					ticking = false;
					return;
				}
			}
		}

		const scrollY = window.scrollY;
		const viewportHeight = window.innerHeight;
		const triggerPoint = scrollY + viewportHeight * 0.3;

		let activeSection = '';

		sections.forEach(section => {
			const rect = section.getBoundingClientRect();
			const sectionTop = scrollY + rect.top;
			const sectionBottom = sectionTop + rect.height;

			if (triggerPoint >= sectionTop && triggerPoint < sectionBottom) {
				activeSection = section.id;
			}
		});

		// Don't set #hero — it's the default state, no hash needed
		if (activeSection === 'hero') activeSection = '';

		if (activeSection !== currentHash) {
			currentHash = activeSection;
			if (activeSection) {
				history.replaceState(null, '', `#${activeSection}`);
			} else {
				history.replaceState(null, '', window.location.pathname);
			}
		}

		ticking = false;
	}

	window.addEventListener('scroll', () => {
		if (!ticking) {
			requestAnimationFrame(updateHash);
			ticking = true;
		}
	}, { passive: true });

	// Handle initial hash on page load. This is retried after fonts, window
	// load, and async site content rendering because command targets are
	// created after startup.
	if (window.location.hash) {
		const hash = window.location.hash.slice(1);
		let clicked = false;
		currentHash = hash;

		const jump = () => {
			const target = document.getElementById(hash);
			if (!target) return;

			scrollInstantlyTo(target);

			// Legacy command list entries were activated through clicks.
			if (!clicked && hash.startsWith('cmd-') && target.classList.contains('manual-entry')) {
				target.click();
				clicked = true;
			}
		};

		jump();
		if (document.fonts?.ready) document.fonts.ready.then(jump).catch(() => {});
		window.addEventListener('load', jump, { once: true });
		window.addEventListener(CONTENT_READY_EVENT, jump, { once: true });
	} else {
		// No hash - don't set one on initial load.
	}
}
