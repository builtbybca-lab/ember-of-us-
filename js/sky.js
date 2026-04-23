/* ============================================
   EMBERS OF US — Sky Renderer v3
   Dense star field, shooting stars, aurora, particles
   ============================================ */

window.Sky = (function () {
    'use strict';

    const canvas = document.getElementById('skyCanvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('starTooltip');

    let W, H, dpr;
    let mouse = { x: -1000, y: -1000 };
    let hoveredStar = null;
    let time = 0;
    let farewellMode = false;
    let globalDim = 1;

    // 60 interactive student stars
    let stars = [];
    // 800+ tiny decorative background stars
    let bgStars = [];
    const BG_STAR_COUNT = 850;

    // Aurora
    const auroraBlobs = [
        { x:0.15, y:0.15, rx:800, ry:400, color:[75,210,165],  op:0.08,  sx:0.00015, sy:0.0002,  px:0,   py:1.2 },
        { x:0.6,  y:0.1,  rx:900, ry:450, color:[55,190,215],  op:0.07,  sx:0.0001,  sy:0.00018, px:2.1, py:0.5 },
        { x:0.85, y:0.3,  rx:650, ry:350, color:[125,85,195],  op:0.05,  sx:0.00012, sy:0.00025, px:4,   py:3.2 },
        { x:0.35, y:0.4,  rx:750, ry:320, color:[45,170,150],  op:0.06,  sx:0.00018, sy:0.00012, px:1.5, py:2.8 },
        { x:0.72, y:0.5,  rx:600, ry:280, color:[95,55,175],   op:0.04,  sx:0.00014, sy:0.00022, px:5.2, py:0.9 },
    ];

    // Floating particles
    let particles = [];
    const PARTICLE_COUNT = 55;

    // Shooting stars
    let shootingStars = [];
    let nextShoot = 3000 + Math.random() * 6000;

    // Pine tree silhouette treeline
    let treeline = [];
    const TREELINE_BASE = 0.82; // trees start at 82% of screen height

    // =========== INIT ===========

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initBgStars() {
        bgStars = [];
        const hues = [210, 220, 200, 40, 20];
        const skyLimit = H * 0.52; // Keep stars in the top half only to clear tall trees
        for (let i = 0; i < BG_STAR_COUNT; i++) {
            bgStars.push({
                x: Math.random() * W,
                y: Math.random() * skyLimit,
                r: 0.2 + Math.random() * 1.3,
                brightness: 0.15 + Math.random() * 0.7,
                twinkleSpeed: 0.001 + Math.random() * 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                color: hues[Math.floor(Math.random() * hues.length)]
            });
        }
    }

    function initTreeline() {
        treeline = [];
        const baseY = H * TREELINE_BASE;
        // Generate terrain undulation
        const terrainPoints = [];
        const segments = 80;
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * W;
            const undulation = Math.sin(i * 0.15) * 8 + Math.sin(i * 0.07) * 12 + Math.sin(i * 0.3) * 4;
            terrainPoints.push({ x, y: baseY + undulation });
        }
        // Back layer — distant smaller trees
        const backCount = Math.floor(W / 18);
        for (let i = 0; i < backCount; i++) {
            const x = (i / backCount) * W + (Math.random() - 0.5) * 15;
            const tIdx = Math.min(segments, Math.floor((x / W) * segments));
            const groundY = terrainPoints[tIdx] ? terrainPoints[tIdx].y : baseY;
            const h = 30 + Math.random() * 70;
            treeline.push({
                x, groundY, height: h,
                width: 8 + Math.random() * 14,
                layer: 0, // back
                trunkH: 3 + Math.random() * 6,
                branches: 3 + Math.floor(Math.random() * 3),
            });
        }
        // Front layer — taller, larger trees
        const frontCount = Math.floor(W / 30);
        for (let i = 0; i < frontCount; i++) {
            const x = (i / frontCount) * W + (Math.random() - 0.5) * 25;
            const tIdx = Math.min(segments, Math.floor((x / W) * segments));
            const groundY = terrainPoints[tIdx] ? terrainPoints[tIdx].y + 10 : baseY + 10;
            const h = 80 + Math.random() * 140;
            treeline.push({
                x, groundY, height: h,
                width: 14 + Math.random() * 22,
                layer: 1, // front
                trunkH: 5 + Math.random() * 10,
                branches: 4 + Math.floor(Math.random() * 4),
            });
        }
        // Sort: back layer first, then front
        treeline.sort((a, b) => a.layer - b.layer);
        // Store terrain for ground fill
        treeline._terrain = terrainPoints;
        treeline._baseY = baseY;
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(makeParticle(false));
    }

    function makeParticle(fromBottom) {
        return {
            x: Math.random() * W,
            y: fromBottom ? H + 10 : Math.random() * H,
            size: 0.5 + Math.random() * 1.3,
            opacity: 0.05 + Math.random() * 0.18,
            vy: -(0.1 + Math.random() * 0.3),
            vx: (Math.random() - 0.5) * 0.2,
            wp: Math.random() * Math.PI * 2,
            ws: 0.0008 + Math.random() * 0.002,
        };
    }

    function initStars(studentData, layout) {
        stars = [];
        for (let i = 0; i < studentData.length; i++) {
            const l = layout[i];
            stars.push({
                x: l.randomX,
                y: l.randomY,
                _layout: l,
                baseRadius: 2 + Math.random() * 2.5,
                brightness: 0.5 + Math.random() * 0.5,
                twinkleSpeed: 0.0012 + Math.random() * 0.003,
                twinklePhase: Math.random() * Math.PI * 2,
                driftRadius: 1.5 + Math.random() * 2.5,
                driftSpeed: 0.0003 + Math.random() * 0.0005,
                driftPhase: Math.random() * Math.PI * 2,
                studentIndex: i,
                name: studentData[i].name,
                _rx: l.randomX,
                _ry: l.randomY,
            });
        }
    }

    // =========== DRAW ===========

    function drawMilkyWay() {
        // Subtle diagonal light band
        ctx.save();
        ctx.globalAlpha = 0.03 * globalDim;
        const grad = ctx.createLinearGradient(0, H * 0.3, W, H * 0.6);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, 'rgba(120,140,180,1)');
        grad.addColorStop(0.5, 'rgba(150,160,200,1)');
        grad.addColorStop(0.7, 'rgba(120,140,180,1)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    function drawAurora() {
        const scale = W / 1920;
        for (const b of auroraBlobs) {
            const cx = b.x * W + Math.sin(time * b.sx + b.px) * 180;
            const cy = b.y * H + Math.sin(time * b.sy + b.py) * 120;
            const rx = b.rx * scale, ry = b.ry * scale;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
            const [r, g, bl] = b.color;
            const op = b.op * globalDim;
            grad.addColorStop(0, `rgba(${r},${g},${bl},${op})`);
            grad.addColorStop(0.4, `rgba(${r},${g},${bl},${op*0.4})`);
            grad.addColorStop(0.75, `rgba(${r},${g},${bl},${op*0.1})`);
            grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawBgStars() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const s of bgStars) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
            const a = s.brightness * twinkle * globalDim;
            if (a < 0.02) continue;
            ctx.fillStyle = `hsla(${s.color}, 30%, 90%, ${a})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawStudentStars() {
        hoveredStar = null;
        let tooltipStar = null;

        for (const star of stars) {
            const twinkle = 0.4 + 0.6 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
            let bright = star.brightness * twinkle;

            let dx = 0, dy = 0;
            if (!farewellMode) {
                dx = Math.sin(time * star.driftSpeed + star.driftPhase) * star.driftRadius;
                dy = Math.cos(time * star.driftSpeed * 0.7 + star.driftPhase + 1) * star.driftRadius;
            } else {
                bright = Math.min(1, star.brightness * 1.5);
            }

            const sx = star.x + dx;
            const sy = star.y + dy;
            star._rx = sx;
            star._ry = sy;

            // Hover
            const dist = Math.hypot(mouse.x - sx, mouse.y - sy);
            let radius = star.baseRadius;
            let glowMult = 1;

            if (dist < 24 && !farewellMode) {
                hoveredStar = star;
                tooltipStar = star;
                radius *= 1.8;
                glowMult = 2.5;
                bright = 1;
            }

            const glowR = radius * 7 * glowMult;
            const a = bright * 0.4 * globalDim;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
            grad.addColorStop(0, `rgba(255,248,230,${a})`);
            grad.addColorStop(0.15, `rgba(255,238,205,${a*0.5})`);
            grad.addColorStop(0.5, `rgba(255,222,180,${a*0.12})`);
            grad.addColorStop(1, 'rgba(255,220,180,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(255,252,240,${bright * 0.95 * globalDim})`;
            ctx.beginPath();
            ctx.arc(sx, sy, radius * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Tooltip
        if (tooltipStar) {
            tooltip.textContent = tooltipStar.name;
            tooltip.style.left = tooltipStar._rx + 'px';
            tooltip.style.top = (tooltipStar._ry - 20) + 'px';
            tooltip.classList.add('visible');
        } else {
            tooltip.classList.remove('visible');
        }

        // Cursor glow
        if (hoveredStar) {
            const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 42);
            mg.addColorStop(0, 'rgba(255,240,200,0.07)');
            mg.addColorStop(0.5, 'rgba(255,230,180,0.02)');
            mg.addColorStop(1, 'rgba(255,220,160,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 42, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            document.body.classList.add('sky-hover');
        } else {
            document.body.classList.remove('sky-hover');
        }
    }

    function drawParticles(dt) {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx + Math.sin(time * p.ws + p.wp) * 0.15;
            p.y += p.vy;
            if (p.y < -20) { particles[i] = makeParticle(true); continue; }
            ctx.save();
            ctx.globalAlpha = p.opacity * globalDim;
            ctx.fillStyle = '#c8b898';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawShootingStars(dt) {
        nextShoot -= dt;
        if (nextShoot <= 0 && !farewellMode) {
            spawnShootingStar();
            nextShoot = 8000 + Math.random() * 15000;
        }
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            s.progress += dt / s.duration;
            if (s.progress > 1) { shootingStars.splice(i, 1); continue; }
            const t = s.progress;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            // Bright head
            const hx = s.x1 + (s.x2 - s.x1) * t;
            const hy = s.y1 + (s.y2 - s.y1) * t;
            const headA = (1 - t * 0.6) * 0.9 * globalDim;
            ctx.fillStyle = `rgba(255,250,235,${headA})`;
            ctx.beginPath();
            ctx.arc(hx, hy, 2, 0, Math.PI * 2);
            ctx.fill();
            // Trail
            for (let j = 1; j < 18; j++) {
                const tt = Math.max(0, t - j * 0.006);
                const px = s.x1 + (s.x2 - s.x1) * tt;
                const py = s.y1 + (s.y2 - s.y1) * tt;
                const a = (1 - j / 18) * 0.45 * (1 - t * 0.5) * globalDim;
                const r = (1 - j / 18) * 1.8;
                ctx.fillStyle = `rgba(255,240,210,${a})`;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function spawnShootingStar() {
        const angle = 0.2 + Math.random() * 0.5;
        const len = 350 + Math.random() * 500;
        const x1 = Math.random() * W * 0.8;
        const y1 = Math.random() * H * 0.5;
        shootingStars.push({
            x1, y1,
            x2: x1 + Math.cos(angle) * len,
            y2: y1 + Math.sin(angle) * len,
            progress: 0,
            duration: 1200 + Math.random() * 1200,
        });
    }

    // =========== TREELINE DRAW ===========

    function drawPineTree(t) {
        const { x, groundY, height, width, trunkH, branches } = t;
        const tipY = groundY - height;
        ctx.save();

        // Trunk
        ctx.fillStyle = t.layer === 0 ? '#050810' : '#020408';
        const tw = width * 0.12;
        ctx.fillRect(x - tw / 2, groundY - trunkH, tw, trunkH + 2);

        // Branches (layered triangles)
        ctx.fillStyle = t.layer === 0 ? '#06091a' : '#020408';
        const branchStep = (height - trunkH) / branches;
        for (let b = 0; b < branches; b++) {
            const topY = tipY + b * branchStep * 0.65;
            const botY = tipY + (b + 1) * branchStep + branchStep * 0.25;
            const spread = (width * 0.5) + (width * 0.5) * ((b + 1) / branches);
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x + spread, botY);
            ctx.lineTo(x - spread, botY);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function drawTreeline() {
        if (!treeline.length) return;

        // Draw ground fill below treeline
        const terrain = treeline._terrain;
        const baseY = treeline._baseY;
        ctx.save();
        ctx.fillStyle = '#020408';
        ctx.beginPath();
        ctx.moveTo(0, H);
        if (terrain && terrain.length) {
            for (const p of terrain) ctx.lineTo(p.x, p.y);
        } else {
            ctx.lineTo(0, baseY);
            ctx.lineTo(W, baseY);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw trees
        for (const t of treeline) drawPineTree(t);
    }

    // =========== LOOP ===========

    let lastTime = 0;
    function update(ts) {
        const dt = lastTime ? ts - lastTime : 16;
        lastTime = ts;
        time = ts;

        ctx.clearRect(0, 0, W, H);

        // Deep sky gradient
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#020310');
        bg.addColorStop(0.4, '#04061a');
        bg.addColorStop(0.7, '#060818');
        bg.addColorStop(1, '#070612');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        drawMilkyWay();
        drawAurora();
        drawBgStars();
        drawParticles(dt);
        drawStudentStars();

        // Constellation hook (same frame)
        if (window.Constellation) {
            window.Constellation.drawFrame(ctx, stars, dt, W, H);
        }

        drawShootingStars(dt);

        // Treeline drawn LAST (foreground silhouette)
        drawTreeline();

        requestAnimationFrame(update);
    }

    // =========== PUBLIC ===========

    function init(studentData, layout) {
        resize();
        initBgStars();
        initTreeline();
        initStars(studentData, layout);
        initParticles();

        window.addEventListener('resize', () => {
            resize();
            initBgStars();
            initTreeline();
            if (window.Constellation) {
                const newLayout = window.Constellation.computeLayout(W, H, studentData.length);
                for (let i = 0; i < stars.length; i++) {
                    stars[i]._layout = newLayout[i];
                    if (!farewellMode) {
                        stars[i].x = newLayout[i].randomX;
                        stars[i].y = newLayout[i].randomY;
                    }
                }
            }
        });

        canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
        canvas.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });
        canvas.addEventListener('click', () => {
            if (hoveredStar && !farewellMode && window.Letter) {
                window.Letter.open(window.STUDENTS[hoveredStar.studentIndex]);
            }
        });

        requestAnimationFrame(update);
    }

    function setFarewellMode(on) { farewellMode = on; }
    function setGlobalDim(v) { globalDim = Math.max(0, Math.min(1, v)); }
    function getStars() { return stars; }
    function getCanvasCtx() { return ctx; }
    function getDimensions() { return { W, H }; }

    return { init, setFarewellMode, setGlobalDim, getStars, getCanvasCtx, getDimensions };
})();
