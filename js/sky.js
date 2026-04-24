/* ============================================
   EMBERS OF US — Sky Renderer v3.1
   Dense star field, shooting stars, aurora, particles
   Updated with Camera System & Time-based Themes
   ============================================ */

window.Sky = (function () {
    'use strict';

    const canvas = document.getElementById('skyCanvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('starTooltip');

    let W, H, dpr;
    let mouse = { x: -1000, y: -1000 }; // Screen space
    let worldMouse = { x: -1000, y: -1000 }; // World space
    let hoveredStar = null;
    let focusedStar = null;
    let time = 0;
    let farewellMode = false;
    let globalDim = 1;

    // Camera
    const camera = {
        x: 0, y: 0, zoom: 1,
        tx: 0, ty: 0, tz: 1,
        lerp: 0.06
    };

    // Themes
    let theme = {
        skyTop: '#020310', skyMid: '#04061a', skyBot: '#070612',
        aurora1: [75, 210, 165], aurora2: [125, 85, 195],
        particle: '#c8b898'
    };

    // 60 interactive student stars
    let stars = [];
    // 800+ tiny decorative background stars
    let bgStars = [];
    const BG_STAR_COUNT = 850;

    // Aurora
    let auroraBlobs = [];

    // Floating particles
    let particles = [];
    const PARTICLE_COUNT = 55;

    // Shooting stars
    let shootingStars = [];
    let nextShoot = 3000 + Math.random() * 6000;

    // Treeline
    let treeline = [];
    const TREELINE_BASE = 0.82;

    // =========== THEME & CAMERA ===========

    function updateTheme() {
        const hour = new Date().getHours();
        // Golden hour: 5-7am or 5-7pm
        const isGolden = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
        
        if (isGolden) {
            theme = {
                skyTop: '#1a0b2e', skyMid: '#3d154d', skyBot: '#070612',
                aurora1: [255, 140, 60], aurora2: [255, 80, 120],
                particle: '#ffd0a0'
            };
        } else {
            theme = {
                skyTop: '#020310', skyMid: '#04061a', skyBot: '#070612',
                aurora1: [75, 210, 165], aurora2: [125, 85, 195],
                particle: '#c8b898'
            };
        }
    }

    function updateCamera() {
        camera.x += (camera.tx - camera.x) * camera.lerp;
        camera.y += (camera.ty - camera.y) * camera.lerp;
        camera.zoom += (camera.tz - camera.zoom) * camera.lerp;
    }

    function screenToWorld(sx, sy) {
        return {
            x: (sx - W/2) / camera.zoom + camera.x,
            y: (sy - H/2) / camera.zoom + camera.y
        };
    }
    
    function worldToScreen(wx, wy) {
        return {
            x: (wx - camera.x) * camera.zoom + W/2,
            y: (wy - camera.y) * camera.zoom + H/2
        };
    }

    // =========== INIT ===========

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        
        camera.tx = W / 2;
        camera.ty = H / 2;
        if (camera.x === 0) { camera.x = camera.tx; camera.y = camera.ty; }
    }

    function initBgStars() {
        bgStars = [];
        const hues = [210, 220, 200, 40, 20];
        const skyLimit = H * 1.5; // Background stars covering a larger area for camera movement
        for (let i = 0; i < BG_STAR_COUNT; i++) {
            bgStars.push({
                x: (Math.random() - 0.5) * W * 2.5 + W/2,
                y: (Math.random() - 0.5) * H * 2.5 + H/2,
                r: 0.2 + Math.random() * 1.3,
                brightness: 0.15 + Math.random() * 0.7,
                twinkleSpeed: 0.001 + Math.random() * 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                color: hues[Math.floor(Math.random() * hues.length)]
            });
        }
    }

    function initAurora() {
        auroraBlobs = [
            { x:0.15, y:0.15, rx:800, ry:400, color:theme.aurora1, op:0.08,  sx:0.00015, sy:0.0002,  px:0,   py:1.2 },
            { x:0.6,  y:0.1,  rx:900, ry:450, color:theme.aurora2, op:0.07,  sx:0.0001,  sy:0.00018, px:2.1, py:0.5 },
            { x:0.85, y:0.3,  rx:650, ry:350, color:theme.aurora1, op:0.05,  sx:0.00012, sy:0.00025, px:4,   py:3.2 },
            { x:0.35, y:0.4,  rx:750, ry:320, color:theme.aurora2, op:0.06,  sx:0.00018, sy:0.00012, px:1.5, py:2.8 },
            { x:0.72, y:0.5,  rx:600, ry:280, color:theme.aurora1, op:0.04,  sx:0.00014, sy:0.00022, px:5.2, py:0.9 },
        ];
    }

    function initTreeline() {
        treeline = [];
        const baseY = H * TREELINE_BASE;
        const terrainPoints = [];
        const segments = 80;
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * W;
            const undulation = Math.sin(i * 0.15) * 8 + Math.sin(i * 0.07) * 12 + Math.sin(i * 0.3) * 4;
            terrainPoints.push({ x, y: baseY + undulation });
        }
        const backCount = Math.floor(W / 18);
        for (let i = 0; i < backCount; i++) {
            const x = (i / backCount) * W + (Math.random() - 0.5) * 15;
            const tIdx = Math.min(segments, Math.floor((x / W) * segments));
            const groundY = terrainPoints[tIdx] ? terrainPoints[tIdx].y : baseY;
            treeline.push({ x, groundY, height: 30 + Math.random() * 70, width: 8 + Math.random() * 14, layer: 0, trunkH: 3 + Math.random() * 6, branches: 3 + Math.floor(Math.random() * 3) });
        }
        const frontCount = Math.floor(W / 30);
        for (let i = 0; i < frontCount; i++) {
            const x = (i / frontCount) * W + (Math.random() - 0.5) * 25;
            const tIdx = Math.min(segments, Math.floor((x / W) * segments));
            const groundY = terrainPoints[tIdx] ? terrainPoints[tIdx].y + 10 : baseY + 10;
            treeline.push({ x, groundY, height: 80 + Math.random() * 140, width: 14 + Math.random() * 22, layer: 1, trunkH: 5 + Math.random() * 10, branches: 4 + Math.floor(Math.random() * 4) });
        }
        treeline.sort((a, b) => a.layer - b.layer);
        treeline._terrain = terrainPoints;
        treeline._baseY = baseY;
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(makeParticle(false));
    }

    function makeParticle(fromBottom) {
        return {
            x: (Math.random() - 0.5) * W * 2 + W/2,
            y: fromBottom ? H + 100 : Math.random() * H,
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
        ctx.save();
        ctx.globalAlpha = 0.03 * globalDim;
        const grad = ctx.createLinearGradient(0, H * 0.3, W, H * 0.6);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, `rgba(${theme.aurora1.join(',')},0.5)`);
        grad.addColorStop(0.5, `rgba(${theme.aurora2.join(',')},0.5)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(-W, -H, W * 3, H * 3);
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
            grad.addColorStop(0.5, `rgba(${r},${g},${bl},${op*0.3})`);
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

            // Interaction
            const dist = Math.hypot(worldMouse.x - sx, worldMouse.y - sy);
            let radius = star.baseRadius;
            let glowMult = 1;
            let isFocused = focusedStar === star;

            if ((dist < 24 / camera.zoom && !farewellMode) || isFocused) {
                if (dist < 24 / camera.zoom) {
                    hoveredStar = star;
                    tooltipStar = star;
                }
                radius *= (isFocused ? 2.2 : 1.8);
                glowMult = isFocused ? 4 : 2.5;
                bright = 1;
            }

            const glowR = radius * 7 * glowMult;
            const a = bright * 0.4 * globalDim;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
            const glowColor = isFocused ? '255,200,100' : '255,248,230';
            grad.addColorStop(0, `rgba(${glowColor},${a})`);
            grad.addColorStop(0.3, `rgba(${glowColor},${a*0.4})`);
            grad.addColorStop(1, 'rgba(255,220,180,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255,252,240,${bright * 0.95 * globalDim})`;
            ctx.beginPath();
            ctx.arc(sx, sy, radius * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (tooltipStar) {
            const screenPos = worldToScreen(tooltipStar._rx, tooltipStar._ry);
            tooltip.textContent = tooltipStar.name;
            tooltip.style.left = screenPos.x + 'px';
            tooltip.style.top = (screenPos.y - 25 * camera.zoom) + 'px';
            tooltip.classList.add('visible');
        } else {
            tooltip.classList.remove('visible');
        }

        if (hoveredStar) {
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
            if (p.y < -100) { particles[i] = makeParticle(true); continue; }
            ctx.save();
            ctx.globalAlpha = p.opacity * globalDim;
            ctx.fillStyle = theme.particle;
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
            const hx = s.x1 + (s.x2 - s.x1) * t;
            const hy = s.y1 + (s.y2 - s.y1) * t;
            const headA = (1 - t * 0.6) * 0.9 * globalDim;
            ctx.fillStyle = `rgba(255,250,235,${headA})`;
            ctx.beginPath();
            ctx.arc(hx, hy, 2, 0, Math.PI * 2);
            ctx.fill();
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
        const x1 = (Math.random() - 0.5) * W * 2 + W/2;
        const y1 = (Math.random() - 0.5) * H * 2 + H/2;
        shootingStars.push({ x1, y1, x2: x1 + Math.cos(angle) * len, y2: y1 + Math.sin(angle) * len, progress: 0, duration: 1200 + Math.random() * 1200 });
    }

    function drawTreeline() {
        if (!treeline.length) return;
        const terrain = treeline._terrain;
        const baseY = treeline._baseY;
        ctx.save();
        ctx.fillStyle = '#020408';
        ctx.beginPath();
        ctx.moveTo(-W, H + 500);
        if (terrain && terrain.length) {
            for (const p of terrain) ctx.lineTo(p.x, p.y);
        } else {
            ctx.lineTo(-W, baseY);
            ctx.lineTo(W*2, baseY);
        }
        ctx.lineTo(W*2, H + 500);
        ctx.closePath();
        ctx.fill();
        for (const t of treeline) {
            const { x, groundY, height, width, trunkH, branches } = t;
            const tipY = groundY - height;
            ctx.fillStyle = t.layer === 0 ? '#050810' : '#020408';
            const tw = width * 0.12;
            ctx.fillRect(x - tw / 2, groundY - trunkH, tw, trunkH + 2);
            ctx.fillStyle = t.layer === 0 ? '#06091a' : '#020408';
            const branchStep = (height - trunkH) / branches;
            for (let b = 0; b < branches; b++) {
                const topY = tipY + b * branchStep * 0.65;
                const botY = tipY + (b + 1) * branchStep + branchStep * 0.25;
                const spread = (width * 0.5) + (width * 0.5) * ((b + 1) / branches);
                ctx.beginPath();
                ctx.moveTo(x, topY); ctx.lineTo(x + spread, botY); ctx.lineTo(x - spread, botY);
                ctx.closePath(); ctx.fill();
            }
        }
        ctx.restore();
    }

    // =========== LOOP ===========

    let lastTime = 0;
    function update(ts) {
        const dt = lastTime ? ts - lastTime : 16;
        lastTime = ts;
        time = ts;

        updateCamera();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // Sky background (Screen space)
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, theme.skyTop);
        bg.addColorStop(0.5, theme.skyMid);
        bg.addColorStop(1, theme.skyBot);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // World space elements
        ctx.translate(W/2, H/2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        drawMilkyWay();
        drawAurora();
        drawBgStars();
        drawParticles(dt);
        drawStudentStars();

        if (window.Constellation) {
            window.Constellation.drawFrame(ctx, stars, dt, W, H);
        }

        drawShootingStars(dt);
        drawTreeline();

        requestAnimationFrame(update);
    }

    // =========== PUBLIC ===========

    function init(studentData, layout) {
        updateTheme();
        resize();
        initBgStars();
        initAurora();
        initTreeline();
        initStars(studentData, layout);
        initParticles();

        window.addEventListener('resize', () => {
            resize();
            initBgStars();
            initTreeline();
        });

        canvas.addEventListener('mousemove', e => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            worldMouse = screenToWorld(mouse.x, mouse.y);
        });

        canvas.addEventListener('mouseleave', () => {
            mouse.x = -1000; mouse.y = -1000;
            worldMouse = { x: -1000, y: -1000 };
        });

        canvas.addEventListener('click', () => {
            if (hoveredStar && !farewellMode && window.Letter) {
                window.Letter.open(window.STUDENTS[hoveredStar.studentIndex]);
                focusOnStar(hoveredStar.name);
            } else {
                resetFocus();
            }
        });

        requestAnimationFrame(update);
    }

    function focusOnStar(name) {
        const star = stars.find(s => s.name === name);
        if (star) {
            focusedStar = star;
            camera.tx = star.x;
            camera.ty = star.y;
            camera.tz = 2.5;
            return true;
        }
        return false;
    }

    function resetFocus() {
        focusedStar = null;
        camera.tx = W / 2;
        camera.ty = H / 2;
        camera.tz = 1;
    }

    function setFarewellMode(on) { farewellMode = on; if (on) resetFocus(); }
    function setGlobalDim(v) { globalDim = Math.max(0, Math.min(1, v)); }
    function getStars() { return stars; }

    return { init, setFarewellMode, setGlobalDim, getStars, focusOnStar, resetFocus };
})();
