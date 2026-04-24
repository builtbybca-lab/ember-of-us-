/* ============================================
   EMBERS OF US — Constellation v3
   Stars migrate from random → constellation positions
   ============================================ */

window.Constellation = (function () {
    'use strict';

    let active = false;
    let phase = 'idle';
    let phaseTime = 0;
    let constellationLines = [];
    let migrationData = []; // per-star delay/duration for organic movement

    function easeInOutCubic(t) {
        return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    }

    // Simplified character defs — total ~52 points for 7 chars
    const DEFS = {
        'B': {
            pts:[[0,0],[0,0.5],[0,1],[0.5,0],[0.65,0.25],[0.5,0.5],[0.65,0.75],[0.5,1]],
            lines:[[0,3],[3,4],[4,5],[5,1],[0,1],[1,2],[1,5],[5,6],[6,7],[7,2]]
        },
        'C': {
            pts:[[0.65,0.05],[0.3,0],[0.0,0.22],[0,0.5],[0,0.78],[0.3,1],[0.65,0.95]],
            lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]
        },
        'A': {
            pts:[[0,1],[0.18,0.55],[0.35,0.18],[0.5,0],[0.65,0.18],[0.82,0.55],[1,1],[0.25,0.6],[0.75,0.6]],
            lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,8]]
        },
        '2': {
            pts:[[0,0.2],[0.2,0],[0.55,0],[0.7,0.2],[0.5,0.45],[0.15,0.7],[0,1],[0.7,1]],
            lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
        },
        '0': {
            pts:[[0.35,0],[0.65,0.15],[0.7,0.5],[0.65,0.85],[0.35,1],[0.05,0.85],[0,0.5],[0.05,0.15]],
            lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]]
        },
        '6': {
            pts:[[0.6,0.05],[0.3,0],[0.08,0.12],[0,0.4],[0,0.75],[0.15,0.95],[0.4,1],[0.6,0.85],[0.65,0.6],[0.55,0.45],[0.25,0.42],[0.02,0.55]],
            lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,3]]
        }
    };

    const TEXT = "BCA 2026";

    function computeLayout(canvasW, canvasH, totalStars) {
        const result = [];
        constellationLines = [];

        // Character layout dimensions
        const charW = canvasW * 0.06;
        const charH = canvasH * 0.16; 
        const spacing = charW * 1.2;
        const spaceGap = charW * 0.8;
        const skyMaxY = canvasH * 0.52; // Match sky.js limit to clear trees

        // Measure total width
        let totalWidth = 0;
        for (const ch of TEXT) totalWidth += (ch === ' ') ? spaceGap : spacing;
        totalWidth -= (spacing - charW);

        const startX = (canvasW - totalWidth) / 2;
        const centerY = canvasH * 0.32; // Higher up in sky for clear visibility

        // Build constellation target positions
        let charOffsetX = 0;
        let globalIdx = 0;
        for (const ch of TEXT) {
            if (ch === ' ') { charOffsetX += spaceGap; continue; }
            const def = DEFS[ch];
            if (!def) { charOffsetX += spacing; continue; }
            const baseIdx = globalIdx;
            for (const pt of def.pts) {
                if (globalIdx >= totalStars) break;
                result[globalIdx] = {
                    targetX: startX + charOffsetX + pt[0] * charW + (Math.random()-0.5)*6,
                    targetY: centerY - charH/2 + pt[1] * charH + (Math.random()-0.5)*6,
                    isConstellation: true
                };
                globalIdx++;
            }
            for (const line of def.lines) {
                if (baseIdx + line[0] < totalStars && baseIdx + line[1] < totalStars) {
                    constellationLines.push([baseIdx + line[0], baseIdx + line[1]]);
                }
            }
            charOffsetX += spacing;
        }

        // Remaining stars get target positions scattered near the text as "halo"
        for (let i = globalIdx; i < totalStars; i++) {
            const ty = centerY - charH + Math.random() * charH * 2;
            result[i] = {
                targetX: startX - 40 + Math.random() * (totalWidth + 80),
                targetY: Math.min(ty, skyMaxY),
                isConstellation: false
            };
        }

        // Assign RANDOM starting positions (above treeline only)
        const margin = 60;
        for (let i = 0; i < totalStars; i++) {
            let rx, ry, ok, tries = 0;
            do {
                rx = margin + Math.random() * (canvasW - margin*2);
                ry = margin + Math.random() * (skyMaxY - margin);
                ok = true;
                for (let j = 0; j < i; j++) {
                    if (Math.hypot(result[j].randomX - rx, result[j].randomY - ry) < 30) {
                        ok = false; break;
                    }
                }
                tries++;
            } while (!ok && tries < 80);
            result[i].randomX = rx;
            result[i].randomY = ry;
        }

        // Build migration timing (staggered for organic feel)
        migrationData = [];
        for (let i = 0; i < totalStars; i++) {
            migrationData.push({
                delay: Math.random() * 1800,
                duration: 4000 + Math.random() * 3000
            });
        }

        return result;
    }

    // Update star positions during migration
    function updateMigration(stars, elapsed) {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const m = migrationData[i];
            if (!m || !s._layout) continue;
            const t0 = Math.max(0, elapsed - m.delay);
            const progress = Math.min(1, t0 / m.duration);
            const eased = easeInOutCubic(progress);
            s.x = s._layout.randomX + (s._layout.targetX - s._layout.randomX) * eased;
            s.y = s._layout.randomY + (s._layout.targetY - s._layout.randomY) * eased;
            
            // Pulse on arrival
            if (progress >= 1 && !s._pulsed) {
                s.brightness *= 1.8;
                s._pulsed = true;
                setTimeout(() => { s.brightness /= 1.8; }, 800);
            }
        }
    }

    function drawLines(ctx, stars, progress) {
        if (!constellationLines.length) return;
        const total = constellationLines.length;
        const visible = Math.floor(progress * total);
        const partial = (progress * total) - visible;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i <= visible && i < total; i++) {
            const [ai, bi] = constellationLines[i];
            const sa = stars[ai], sb = stars[bi];
            if (!sa || !sb) continue;
            const p = (i === visible) ? partial : 1;
            const ex = sa._rx + (sb._rx - sa._rx) * p;
            const ey = sa._ry + (sb._ry - sa._ry) * p;

            const passes = [
                { w: 6, a: 0.04 },
                { w: 2.5, a: 0.16 },
                { w: 0.8, a: 0.50 },
            ];
            for (const pass of passes) {
                ctx.strokeStyle = `rgba(255,175,75,${pass.a})`;
                ctx.lineWidth = pass.w;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(sa._rx, sa._ry);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function drawPulse(ctx, W, H, intensity) {
        const grad = ctx.createRadialGradient(W/2, H*0.44, 0, W/2, H*0.44, W*0.42);
        grad.addColorStop(0, `rgba(255,195,110,${0.12*intensity})`);
        grad.addColorStop(0.4, `rgba(255,175,75,${0.04*intensity})`);
        grad.addColorStop(1, 'rgba(255,155,50,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // Called every frame from Sky
    function drawFrame(ctx, stars, dt, W, H) {
        if (!active || phase === 'idle') return;
        phaseTime += dt;

        switch (phase) {
            case 'brighten':
                if (phaseTime > 2500) { phase = 'migrate'; phaseTime = 0; }
                break;

            case 'migrate':
                updateMigration(stars, phaseTime);
                if (phaseTime > 8000) { phase = 'connect'; phaseTime = 0; }
                break;

            case 'connect':
                drawLines(ctx, stars, Math.min(1, phaseTime / 8000));
                if (phaseTime > 8500) { phase = 'pulse'; phaseTime = 0; }
                break;

            case 'pulse':
                drawLines(ctx, stars, 1);
                drawPulse(ctx, W, H, Math.sin(phaseTime / 3000 * Math.PI));
                if (phaseTime > 3000) { phase = 'text'; phaseTime = 0; _showText(); }
                break;

            case 'text':
                drawLines(ctx, stars, 1);
                if (phaseTime > 5000) { phase = 'memories'; phaseTime = 0; window.Sky.togglePolaroids(true); }
                break;

            case 'memories':
                drawLines(ctx, stars, 1);
                if (phaseTime > 6000) { 
                    phase = 'shatter'; 
                    phaseTime = 0; 
                    window.Sky.togglePolaroids(false);
                    window.Sky.shatterStars();
                    _showFinalMessage();
                    _hideText();
                }
                break;

            case 'shatter':
                // lines fade away
                drawLines(ctx, stars, Math.max(0, 1 - phaseTime / 2000));
                if (phaseTime > 3000) { phase = 'fade'; phaseTime = 0; }
                break;

            case 'fade':
                window.Sky.setGlobalDim(Math.max(0.04, 1 - phaseTime / 6000));
                if (phaseTime > 6500) phase = 'done';
                break;

            case 'done':
                break;
        }
    }

    function _showText() {
        const el = document.getElementById('farewellText');
        el.classList.remove('hidden');
        requestAnimationFrame(() => el.classList.add('visible'));
    }
    function _hideText() {
        const el = document.getElementById('farewellText');
        el.classList.remove('visible');
    }

    function _showFinalMessage() {
        const el = document.getElementById('finalMessage');
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('visible'), 100);
        
        // Show ignite button after a delay
        setTimeout(() => {
            const btn = document.getElementById('igniteBtn');
            btn.classList.remove('hidden');
            btn.style.opacity = '0';
            btn.style.transition = 'opacity 2s ease';
            setTimeout(() => btn.style.opacity = '1', 50);
        }, 5000);
    }

    function startFarewell() {
        if (active) return;
        active = true;
        phase = 'brighten';
        phaseTime = 0;
        window.Sky.setFarewellMode(true);
        document.getElementById('titleOverlay').style.cssText += 'transition:opacity 2s;opacity:0';
        document.getElementById('farewellBtn').style.cssText += 'transition:opacity 1s;opacity:0;pointer-events:none';
    }

    return { computeLayout, drawFrame, startFarewell };
})();
