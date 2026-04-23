/* ============================================
   EMBERS OF US — Main Orchestrator v3
   ============================================ */

(function () {
    'use strict';

    async function init() {
        // Wire up Gateway Batch Selection
        const gateway = document.getElementById('gateway');
        const batchCards = document.querySelectorAll('.batch-card');

        batchCards.forEach(card => {
            card.addEventListener('click', () => {
                const selectedBatch = card.getAttribute('data-batch');
                gateway.classList.add('hidden');
                startExperience(selectedBatch);
            });
        });

        // Audio toggle
        const audioBtn = document.getElementById('audioToggle');
        audioBtn.addEventListener('click', () => {
            const on = window.Audio.toggle();
            audioBtn.classList.toggle('audio-active', on);
        });

        // Restart trigger (now reloads to Gateway)
        const restartBtn = document.getElementById('restartBtn');
        restartBtn.addEventListener('click', () => {
            location.reload();
        });

        // Title logic moved to startExperience
    }

    async function startExperience(batch) {
        // Show loader while fetching
        const loader = document.getElementById('loader');
        loader.classList.remove('hidden');

        // Fallback to local batch data
        let students = (window.BATCH_DATA && window.BATCH_DATA[batch]) ? window.BATCH_DATA[batch] : [];

        // Try to fetch from Supabase based on batch
        if (window.SupabaseConnector) {
            const remoteData = await window.SupabaseConnector.fetchStudents(batch);
            if (remoteData && remoteData.length > 0) {
                students = remoteData;
            }
        }

        // Global update for letter logic
        window.STUDENTS = students;

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Compute star layout
        const layout = window.Constellation.computeLayout(W, H, students.length);

        // Init components
        window.Sky.init(students, layout);
        window.Letter.init();

        // Farewell trigger
        document.getElementById('farewellBtn').addEventListener('click', () => {
            window.Constellation.startFarewell();
            const restartBtn = document.getElementById('restartBtn');
            setTimeout(() => {
                restartBtn.style.display = 'flex';
                restartBtn.style.opacity = '0';
                setTimeout(() => { restartBtn.style.opacity = '1'; }, 50);
            }, 3000);
        });

        // Title fades after delay
        const title = document.getElementById('titleOverlay');
        setTimeout(() => {
            title.style.transition = 'opacity 3s ease';
            title.style.opacity = '0';
            setTimeout(() => { title.style.opacity = '0.25'; }, 5000);
        }, 7000);

        // Hide loader
        loader.classList.add('hidden');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
