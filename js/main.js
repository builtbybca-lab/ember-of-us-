/* ============================================
   EMBERS OF US — Main Orchestrator v3.1
   Intro sequence & Search Logic
   ============================================ */

(function () {
    'use strict';

    const INTRO_TEXT = "Three years. Thousands of memories. One sky. We were always connected.";

    async function init() {
        // Start with Intro
        await playIntro();

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

        // Restart trigger
        const restartBtn = document.getElementById('restartBtn');
        restartBtn.addEventListener('click', () => {
            location.reload();
        });

        // Search Logic
        initSearch();
    }

    async function playIntro() {
        const introOverlay = document.getElementById('introOverlay');
        const introTextEl = document.getElementById('introText');
        
        // Short delay before starting
        await new Promise(r => setTimeout(r, 1000));

        // Typewriter
        for (let i = 0; i <= INTRO_TEXT.length; i++) {
            introTextEl.textContent = INTRO_TEXT.slice(0, i);
            await new Promise(r => setTimeout(r, 45 + Math.random() * 40));
        }

        // Wait then fade
        await new Promise(r => setTimeout(r, 2000));
        introOverlay.classList.add('hidden');
        
        // Gateway appears via CSS animation
        document.getElementById('gateway').classList.remove('hidden');
    }

    function initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput) return;

        searchInput.addEventListener('input', () => {
            const val = searchInput.value.trim().toLowerCase();
            if (!val || !window.STUDENTS) {
                searchResults.classList.add('hidden');
                return;
            }

            const matches = window.STUDENTS.filter(s => s.name.toLowerCase().includes(val)).slice(0, 5);
            
            if (matches.length > 0) {
                searchResults.innerHTML = matches.map(s => `<div class="search-item" data-name="${s.name}">${s.name}</div>`).join('');
                searchResults.classList.remove('hidden');
                
                // Add click events to items
                searchResults.querySelectorAll('.search-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const name = item.getAttribute('data-name');
                        const student = window.STUDENTS.find(s => s.name === name);
                        if (student && window.Sky) {
                            window.Sky.focusOnStar(name);
                            window.Letter.open(student);
                        }
                        searchInput.value = '';
                        searchResults.classList.add('hidden');
                    });
                });
            } else {
                searchResults.classList.add('hidden');
            }
        });

        // Close search on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.add('hidden');
            }
        });
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
