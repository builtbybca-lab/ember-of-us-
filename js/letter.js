/* ============================================
   EMBERS OF US — Letter Overlay
   Burnt paper letter with ash dissolve
   ============================================ */

window.Letter = (function () {
    'use strict';

    const overlay = document.getElementById('letterOverlay');
    const paper = document.getElementById('letterPaper');
    const nameEl = document.getElementById('letterName');
    const messageEl = document.getElementById('letterMessage');
    const aboutEl = document.getElementById('letterAbout');
    const closeBtn = document.getElementById('letterClose');
    const ashContainer = document.getElementById('ashContainer');

    let isOpen = false;

    // Generate paper noise texture via canvas (one-time)
    function generateNoiseTexture() {
        const size = 150;
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = size;
        noiseCanvas.height = size;
        const nctx = noiseCanvas.getContext('2d');
        const imageData = nctx.createImageData(size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = Math.random() * 40 + 180;
            data[i] = v;
            data[i + 1] = v * 0.92;
            data[i + 2] = v * 0.82;
            data[i + 3] = 25;
        }
        nctx.putImageData(imageData, 0, 0);
        return noiseCanvas.toDataURL();
    }

    function init() {
        // Apply noise texture to paper
        const noiseUrl = generateNoiseTexture();
        paper.style.backgroundImage += `, url(${noiseUrl})`;

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) close();
        });
    }

    function open(student) {
        if (isOpen) return;
        isOpen = true;

        nameEl.textContent = student.name;
        messageEl.textContent = `"${student.title}"`;
        aboutEl.textContent = `— ${student.message}`;

        overlay.classList.remove('hidden');
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');

        paper.classList.remove('animate-out');
        paper.classList.add('animate-in');
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;

        paper.classList.remove('animate-in');
        paper.classList.add('animate-out');

        // Spawn ash particles
        spawnAsh();

        setTimeout(() => {
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            paper.classList.remove('animate-out');
        }, 650);
    }

    function spawnAsh() {
        const rect = paper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const count = 35;

        for (let i = 0; i < count; i++) {
            const ash = document.createElement('div');
            ash.className = 'ash-particle';

            // Random position near the letter
            const startX = cx + (Math.random() - 0.5) * rect.width * 0.8;
            const startY = cy + (Math.random() - 0.5) * rect.height * 0.6;

            // Random drift direction (mostly upward)
            const driftX = (Math.random() - 0.5) * 160;
            const driftY = -(60 + Math.random() * 140);
            const rot = (Math.random() - 0.5) * 360;

            ash.style.left = startX + 'px';
            ash.style.top = startY + 'px';
            ash.style.setProperty('--ash-x', driftX + 'px');
            ash.style.setProperty('--ash-y', driftY + 'px');
            ash.style.setProperty('--ash-rot', rot + 'deg');
            ash.style.width = (2 + Math.random() * 5) + 'px';
            ash.style.height = (2 + Math.random() * 4) + 'px';
            ash.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
            ash.style.animationDelay = (Math.random() * 0.3) + 's';
            ash.style.background = `rgba(${60 + Math.random() * 40}, ${30 + Math.random() * 30}, ${10 + Math.random() * 20}, ${0.4 + Math.random() * 0.4})`;

            ashContainer.appendChild(ash);

            // Cleanup
            setTimeout(() => {
                if (ash.parentNode) ash.parentNode.removeChild(ash);
            }, 2800);
        }
    }

    return { init, open, close };
})();
