(function () {
    /////////////////////////////////////////////////////////////

    const FRAMERATE = 60;
    const OOB_DIST = 10;
    const HITBOXES = false;

    const SNAKE_TURN_SPEED = 120 / 360 * (2 * Math.PI);
    const SNAKE_SPEED = 0.5;
    const SNAKE_SPEED_FAST = 1.5;
    const SNAKE_SPEED_SLOW = 0.2;
    const SNAKE_MIN_LENGTH = 10;
    const SNAKE_RADIUS = 1; // TODO
    const SNAKE_DRAW_DELAY = 4;
    const HAT_SIZE = 19;

    const TETROMINO_SPEED = 30;
    const TETROMINO_DELAY = 3;
    const TETROMINO_DATA = {
        L: [[0, -1], [0, 0], [0, 1], [1, 1]],
        J: [[0, -1], [0, 0], [0, 1], [-1, 1]],
        I: [[0, -1], [0, 0], [0, 1], [0, 2]],
        O: [[0, 0], [0, 1], [1, 0], [1, 1]],
        Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
        S: [[0, 0], [1, 0], [-1, 1], [0, 1]],
        T: [[0, -1], [-1, 0], [0, 0], [1, 0]],
    }
    const TETROMINO_COLORS = {
        //  top bevel, low bevel,    fill
        L: ["#ff8d48", "#974900", "#cf6700"],
        J: ["#5c63ff", "#00149e", "#0027fc"],
        I: ["#00dce6", "#00848b", "#00afb7"],
        O: ["#fee300", "#a39100", "#d0ba00"],
        Z: ["#00f543", "#009926", "#00c634"],
        S: ["#ff5542", "#8c1900", "#cd2900"],
        T: ["#e841ff", "#7d008b", "#b800cc"],
    }
    const TETRIS_BLOCK_SIZE = 16;
    const TETRIS_BLOCK_BEVEL = 3;

    const GHOST_SIZE = 14 * 2;
    const GHOST_RADIUS_SQR = GHOST_SIZE * GHOST_SIZE / 4; // (ghost size / 2)^2
    const GHOST_DELAY = 20;
    const GHOST_SPEED = 0.3;
    // Distance ahead/behind snake pinky and inky will target
    const GHOST_TARGET_OFFSET = 200;
    const GHOST_MAX = 10;

    const PROJECTILE_COOLDOWN = 0.5;
    const PROJECTILE_SPEED = 400;
    const PROJECTILE_STEP = PROJECTILE_SPEED / FRAMERATE;
    const PROJECTILE_DRAW_RATIO = 2;
    const PROJECTILE_DRAW_STEP = PROJECTILE_DRAW_RATIO * PROJECTILE_STEP;
    // distance to add on front and back of projectile to assist collision
    const PROJECTILE_GHOST_BUFFER = 0.25 * PROJECTILE_DRAW_STEP;
    // % to inflate ghost hitbox for projectile collision (in normal direction)
    const PROJECTILE_GHOST_INFLATE = 0.25;
    const PROJECTILE_GHOST_RADIUS = GHOST_SIZE / 2 * (1 + PROJECTILE_GHOST_INFLATE);

    const PARTICLE_SPAWN_COUNTS = [3, 3, 3, 4, 4, 5];
    const PARTICLE_SPEED_MIN = 30 / FRAMERATE;
    const PARTICLE_SPEED_MAX = 60 / FRAMERATE;
    const PARTICLE_LIFE_MIN = 45;
    const PARTICLE_LIFE_MAX = 120;
    const PARTICLE_COLOR_LOW = {
        hex: "#FBAA0B",
        r: 0xFB,
        g: 0xAA,
        b: 0x0B
    };
    const PARTICLE_COLOR_MID = {
        hex: "#FC950F",
        r: 0xFC,
        g: 0x95,
        b: 0x0F
    };
    const PARTICLE_COLOR_HIGH = {
        hex: "#FB8109",
        r: 0xFB,
        g: 0x81,
        b: 0x09
    };
    const PARTICLE_COLORS = [
        PARTICLE_COLOR_LOW,
        PARTICLE_COLOR_LOW,
        PARTICLE_COLOR_MID,
        PARTICLE_COLOR_MID,
        PARTICLE_COLOR_MID,
        PARTICLE_COLOR_HIGH,
        PARTICLE_COLOR_HIGH
    ];
    const PARTICLE_SIZE = 5;

    const HURT_SPEED = 150;
    const POINTS_PER_TETROMINO = 20;
    const POINTS_PER_GHOST = 50;

    // Canvas & Context
    var canvas;
    var ctx;
    var mouseX;
    var mouseY;

    // Snake
    var snake; // .x, .y, .wrap
    var snake_dir;
    var snake_length;
    var snake_hurt;

    // Tetris pieces
    var tetrominos; // .x, .y, .piece
    var time_to_next_tetromino;

    // Projectiles
    var projectiles; // .x, .y, .xv .yv .dir
    var time_to_next_projectile;

    // Explosion particles
    var particles; // .x .y .xv .yv .life .color

    // Score
    var total_score;
    var max_score;

    var paused;

    var keys_pressed = {};

    // HTML Elements
    var screen_snake;
    var screen_menu;
    var screen_setting;
    var screen_gameover;
    var button_newgame_menu;
    var button_newgame_setting;
    var button_newgame_gameover;
    var button_setting_menu;
    var button_setting_gameover;
    var ele_score;
    var ele_length;
    var ele_score_display;
    var speed_setting;
    var wall_setting;

    // Ghost images
    var ghost_blinky;
    var ghost_inky;
    var ghost_pinky;
    var ghost_clyde;

    // Ghosts
    // 0 1 2 3 : blinky inky pinky clyde
    // 0 blinky moves horizontally or vertically towards snake
    // 1 inky targets behind the snake (can't use same AI as original due to multiple of same ghost)
    // 2 pinky targets in front of the snake
    // 3 clyde moves randomly towards snake
    var ghosts // .x, .y, .type
    var time_to_next_ghost;

    /////////////////////////////////////////////////////////////

    { //// UTILITY FUNCTIONS ////

        var clamp = function (min, val, max) {
            return Math.min(max, Math.max(min, val));
        }

        var randint = function(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        }

        var choose = function(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

    }

    { //// UPDATE LOGIC ////

        var updateSnake = function () {
            var x = snake[0].x;
            var y = snake[0].y;

            // Rotation
            if (keys_pressed.left) {
                snake_dir -= SNAKE_TURN_SPEED / FRAMERATE
            }
            if (keys_pressed.right) {
                snake_dir += SNAKE_TURN_SPEED / FRAMERATE
            }

            // Speed
            var speed = SNAKE_SPEED
            if (keys_pressed.up) {
                speed = SNAKE_SPEED_FAST
            } else if (keys_pressed.down) {
                speed = SNAKE_SPEED_SLOW
            }


            // Forward movement
            x += Math.cos(snake_dir) * speed;
            y += Math.sin(snake_dir) * speed;
            var wrap = x >= canvas.width || y >= canvas.height || x < 0 || y < 0;
            x = (x + canvas.width) % canvas.width;
            y = (y + canvas.height) % canvas.height;
            snake.unshift({ x: x, y: y, wrap: wrap });
            while (snake.length > snake_length) {
                snake.pop();
            }


            // Collision
            snake_hurt = false;
            snake.forEach(p => {
                tetrominos.forEach(t => {
                    if (isPointCollidingTetromino(t, p.x, p.y)) {
                        snake_hurt = true;
                    }
                });
                ghosts.forEach(ghost => {
                    if (isCircleCollidingGhost(ghost, p.x, p.y, SNAKE_RADIUS)) {
                        snake_hurt = true;
                    }
                });
            });
            if (snake_hurt) {
                snake_length -= HURT_SPEED / FRAMERATE
                if (snake_length < SNAKE_MIN_LENGTH) {
                    snake_length = SNAKE_MIN_LENGTH;
                }
            }
        }

        var isOOB = function (x, y) {
            return x < -OOB_DIST || canvas.width + OOB_DIST < x ||
                y < -OOB_DIST || canvas.height + OOB_DIST < y;
        }

        var updateProjectiles = function () {
            projectiles = projectiles.filter(p => !isOOB(p.x, p.y));
            projectiles.forEach(p => {
                p.x += p.xv;
                p.y += p.yv;
            })

            time_to_next_projectile -= 1 / FRAMERATE;
            if (time_to_next_projectile <= 0 && keys_pressed.space) {
                time_to_next_projectile = PROJECTILE_COOLDOWN
                spawnProjectile()
            }
        }

        var updateGhosts = function (snake_x, snake_y) {
            ghosts.forEach(ghost => {
                var diff = getGhostDiff(ghost, snake_x, snake_y);
                let dx = diff.x;
                let dy = diff.y;
                var prefer_y;
                if (ghost.type == 3) {
                    prefer_y = Math.floor(Math.random() * 2);
                } else {
                    prefer_y = Math.abs(dx) < Math.abs(dy);
                }
                if (prefer_y) {
                    ghost.y -= GHOST_SPEED * Math.sign(dy);
                } else {
                    ghost.x -= GHOST_SPEED * Math.sign(dx);
                }
            });

            // Kill ghosts that are touching a projectile.
            ghosts = ghosts.filter(
                g => {
                    if (projectiles.some(p => isProjectileCollidingGhost(g, p))) {
                        total_score += POINTS_PER_GHOST;
                        snake_length += POINTS_PER_GHOST;
                        spawnParticles(g.x, g.y);
                        return false;
                    }
                    return true;
                }
            )

            // Spawn a new ghost.
            time_to_next_ghost -= 1 / FRAMERATE
            if (time_to_next_ghost <= 0 && ghosts.length < GHOST_MAX) {
                spawnGhost()
                time_to_next_ghost = GHOST_DELAY
            }
        }

        var updateTetrominos = function () {
            // Move tetrominos.
            tetrominos.forEach(t => t.y += TETROMINO_SPEED / FRAMERATE);
            tetrominos = tetrominos.filter(t => t.y < canvas.height + 50);

            // Kill tetrominos that are touching a projectile.
            tetrominos = tetrominos.filter(
                t => {
                    if (projectiles.some(p => isPointCollidingTetromino(t, p.x, p.y))) {
                        total_score += POINTS_PER_TETROMINO;
                        snake_length += POINTS_PER_TETROMINO;
                        spawnParticles(t.x, t.y);
                        return false;
                    }
                    return true;
                }
            )

            // Drop another tetromino.
            time_to_next_tetromino -= 1 / FRAMERATE
            if (time_to_next_tetromino <= 0) {
                spawnTetromino()
                time_to_next_tetromino = TETROMINO_DELAY
            }
        }

        var updateParticles = function () {
            particles = particles.filter(p => p.life > 0);
            particles.forEach(p => {
                p.x += p.xv;
                p.y += p.yv;
                p.life--;
            });
        }

    }

    { //// DRAWING ////

        var drawSnake = function () {
            // Draw snake from snake list
            ctx.beginPath();
            ctx.lineWidth = 10
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            if (snake_hurt) {
                ctx.strokeStyle = "#660000";
            } else {
                ctx.strokeStyle = "#009900";
            }
            ctx.moveTo(snake[0].x, snake[0].y);
            for (var i = 0; i < snake.length; i++) {
                pos = snake[i]
                if (pos.wrap) {
                    ctx.stroke()
                    ctx.moveTo(pos.x, pos.y);
                    ctx.beginPath()
                } else if (i % SNAKE_DRAW_DELAY == 0 || i != snake.length - 1) {
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            ctx.stroke()

            // Draw hat (Galaga spaceship)
            var image = document.getElementById("ship");
            ctx.save();
            ctx.translate(snake[0].x, snake[0].y);
            ctx.rotate(snake_dir + Math.PI / 2);
            ctx.drawImage(image, -HAT_SIZE / 2, -HAT_SIZE, HAT_SIZE, HAT_SIZE);
            ctx.restore();
        }

        var drawTetrominos = function () {
            tetrominos.forEach(t => {
                const BEVEL = TETRIS_BLOCK_BEVEL / TETRIS_BLOCK_SIZE;

                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.scale(TETRIS_BLOCK_SIZE, TETRIS_BLOCK_SIZE);
                t.data.forEach(block => {
                    ctx.save();
                    ctx.translate(block[0], block[1]);

                    ctx.fillStyle = TETROMINO_COLORS[t.piece][0]
                    ctx.beginPath()
                    ctx.moveTo(0, 0)
                    ctx.lineTo(1, 0)
                    ctx.lineTo(0, 1)
                    ctx.fill()

                    ctx.fillStyle = TETROMINO_COLORS[t.piece][1]
                    ctx.beginPath()
                    ctx.moveTo(1, 1)
                    ctx.lineTo(0, 1)
                    ctx.lineTo(1, 0)
                    ctx.fill()

                    ctx.fillStyle = TETROMINO_COLORS[t.piece][2]
                    ctx.fillRect(BEVEL, BEVEL, 1-BEVEL*2, 1-BEVEL*2)

                    ctx.restore();
                });
                ctx.restore();
            });
        }

        var drawProjectiles = function () {
            ctx.lineWidth = 3
            ctx.strokeStyle = "#ffffff"
            projectiles.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                x2 = p.x - p.xv * PROJECTILE_DRAW_RATIO;
                y2 = p.y - p.yv * PROJECTILE_DRAW_RATIO;
                ctx.lineTo(x2, y2)
                ctx.stroke()
            })
        }

        var drawGhosts = function () {
            // Drawing ghosts
            for (var i = 0; i < ghosts.length; i++) {
                var ghost = ghosts[i];
                var img;
                switch (ghost.type) {
                    case 0:
                        img = ghost_blinky;
                        break;
                    case 1:
                        img = ghost_inky;
                        break;
                    case 2:
                        img = ghost_pinky;
                        break;
                    case 3:
                        img = ghost_clyde;
                        break;
                }
                if (HITBOXES) {
                    ctx.beginPath();
                    ctx.arc(ghost.x, ghost.y, GHOST_SIZE / 2, 0, 2 * Math.PI, false);
                    ctx.fillStyle = 'green';
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.drawImage(img, ghost.x - GHOST_SIZE / 2, ghost.y - GHOST_SIZE / 2, GHOST_SIZE, GHOST_SIZE);
                }
            }
        }

        var drawParticles = function () {
            // if (particles.length == 0) {
            //     return;
            // }
            // var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // particles.forEach(p => {
            //     let x = clamp(0, Math.round(p.x), canvas.width);
            //     let y = clamp(0, Math.round(p.y), canvas.height);
            //     let pixelIdx = (y * canvas.width + x) * 4;
            //     imgdata.data[pixelIdx] = p.color.r;
            //     imgdata.data[pixelIdx + 1] = p.color.g;
            //     imgdata.data[pixelIdx + 2] = p.color.b;
            //     imgdata.data[pixelIdx + 3] = 0xFF;
            // });
            // ctx.putImageData(imgdata, 0, 0);
            particles.forEach(p => {
                ctx.fillStyle = p.color.hex;
                ctx.fillRect(p.x, p.y, PARTICLE_SIZE, PARTICLE_SIZE);
            });
        }

    }

    { //// SPAWNING //// 

        var spawnTetromino = function () {
            var piece = "IJLZSOT".charAt(Math.floor(Math.random() * 7))
            var data = TETROMINO_DATA[piece]
            for (var i = Math.floor(Math.random() * 4); i > 0; i--) {
                // Rotate counterclockwise.
                data = data.map(d => [-d[1], d[0]]);
            }
            console.log(data)
            tetrominos.unshift({
                x: Math.random() * canvas.width,
                y: -100,
                piece: piece,
                data: data,
            })
        }

        var playSound = function (file) {
            var audio = document.createElement('audio');
            audio.src = file;
            document.body.appendChild(audio);
            audio.play();
            
            audio.onended = function () {
                this.parentNode.removeChild(this);
            }
        }

        var spawnProjectile = function () {
            projectiles.unshift({
                x: snake[0].x,
                y: snake[0].y,
                xv: PROJECTILE_STEP * Math.cos(snake_dir),
                yv: PROJECTILE_STEP * Math.sin(snake_dir),
                dir: snake_dir
            });
            playSound("sound/firingsound_short.wav");
        }

        var spawnGhost = function () {
            ghosts.unshift({
                x: canvas.width * Math.floor(Math.random() * 2),
                y: canvas.height * Math.floor(Math.random() * 2),
                type: Math.floor(Math.random() * 4)
            })
        }

        var spawnParticles = function(x, y) {
            let count = choose(PARTICLE_SPAWN_COUNTS);
            for (var i = 0; i < count; i++) {
                spawnParticle(x, y);
            }
        }

        var spawnParticle = function (x, y) {
            let speed = randint(PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX);
            let dir = Math.floor(Math.random() * 2 * Math.PI);
            particles.unshift({
                x: x,
                y: y,
                xv: speed * Math.cos(dir),
                yv: speed * Math.sin(dir),
                life: randint(PARTICLE_LIFE_MIN, PARTICLE_LIFE_MAX),
                color: choose(PARTICLE_COLORS)
            });
        }

    }

    { //// GHOST AI ////

        var getGhostDiff = function (ghost, snake_x, snake_y) {
            var dx;
            var dy;
            switch (ghost.type) {
                case 0:
                case 3:
                    dx = ghost.x - snake_x;
                    dy = ghost.y - snake_y;
                    break;
                case 1:
                    dx = ghost.x - clamp(0, snake_x - Math.cos(snake_dir) * GHOST_TARGET_OFFSET, canvas.width);
                    dy = ghost.y - clamp(0, snake_y - Math.sin(snake_dir) * GHOST_TARGET_OFFSET, canvas.height);
                    break;
                case 2:
                    dx = ghost.x - clamp(0, snake_x + Math.cos(snake_dir) * GHOST_TARGET_OFFSET, canvas.width);
                    dy = ghost.y - clamp(0, snake_y + Math.sin(snake_dir) * GHOST_TARGET_OFFSET, canvas.height);
                    break;
            }
            return { x: dx, y: dy };
        }

    }

    { //// COLLISION LOGIC ////

        var isPointCollidingTetromino = function (t, x, y) {
            var blockX = Math.floor((x - t.x) / TETRIS_BLOCK_SIZE);
            var blockY = Math.floor((y - t.y) / TETRIS_BLOCK_SIZE);
            return t.data.some(
                xy => xy[0] == blockX && xy[1] == blockY
            );
        }

        var isCircleCollidingGhost = function (ghost, x, y, r) {
            let dx = ghost.x - x;
            let dy = ghost.y - y;
            return dx * dx + dy * dy <= GHOST_RADIUS_SQR;
        }

        var isProjectileCollidingGhost = function (ghost, proj) {
            // Convert ghost coordinates to relative coordinates
            let rx = ghost.x - proj.x;
            let ry = ghost.y - proj.y;
            // Change of basis
            // let cx = rx * Math.cos(-proj.dir) - ry * Math.sin(-proj.dir);
            // let cy = rx * Math.sin(-proj.dir) + ry * Math.cos(-proj.dir);
            let cosNDir = proj.xv / PROJECTILE_STEP;
            let sinNDir = -proj.yv / PROJECTILE_STEP;
            let cx = rx * cosNDir - ry * sinNDir;
            let cy = rx * sinNDir + ry * cosNDir;
            // Check if ghost position is within projectile travel distance (in projectile direction)
            // and within ghost radius (in normal direction)
            let within_x = -PROJECTILE_GHOST_BUFFER <= cx && cx <= PROJECTILE_DRAW_STEP + PROJECTILE_GHOST_BUFFER;
            let within_y = -PROJECTILE_GHOST_RADIUS <= cy && cy <= PROJECTILE_GHOST_RADIUS;
            return within_x && within_y;
        }

    }

    /////////////////////////////////////////////////////////////

    var mainLoop = function () {
        if (!paused) {
            // Update game state
            updateSnake();
            updateProjectiles();
            updateGhosts(snake[0].x, snake[0].y);
            updateTetrominos();
            updateParticles();

            // Update score
            ele_score.innerText = String(Math.floor(max_score));
            ele_length.innerText = String(Math.floor(snake_length - SNAKE_MIN_LENGTH));
            if (max_score > 0 && max_score == snake_length - SNAKE_MIN_LENGTH) {
                ele_score_display.style.color = "gold";
            } else if (snake_hurt) {
                ele_score_display.style.color = "red";
            } else {
                ele_score_display.style.color = "white";
            }

            // Update max score
            if (snake_length - SNAKE_MIN_LENGTH > max_score) {
                max_score = snake_length - SNAKE_MIN_LENGTH;
            }

            // Clear canvas
            ctx.beginPath();
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw entities
            drawProjectiles();
            drawSnake();
            drawGhosts();
            drawTetrominos();
            drawParticles();
        }

        setTimeout(mainLoop, 1.0 / FRAMERATE);
    }

    /////////////////////////////////////////////////////////////

    var newGame = function () {

        showScreen(0);
        // screen_snake.focus()

        snake = [];
        snake_length = SNAKE_MIN_LENGTH;
        snake_dir = 0;
        snake.push({ x: canvas.width / 2, y: canvas.height / 2, wrap: false });

        ghosts = [];
        time_to_next_ghost = 0;

        tetrominos = [];
        time_to_next_tetromino = 0;

        projectiles = [];
        time_to_next_projectile = 0;

        particles = [];

        paused = false;

        total_score = 0;
        max_score = 0;

        mainLoop();

    }

    /////////////////////////////////////////////////////////////

    // 0 for the game
    // 1 for the main menu
    // 2 for the settings screen
    // 3 for the game over screen
    var showScreen = function (screen_opt) {
        switch (screen_opt) {

            case 0: screen_snake.style.display = "block";
                // screen_menu.style.display = "none";
                // screen_setting.style.display = "none";
                // screen_gameover.style.display = "none";
                break;

            case 1: screen_snake.style.display = "none";
                screen_menu.style.display = "block";
                screen_setting.style.display = "none";
                screen_gameover.style.display = "none";
                break;

            case 2: screen_snake.style.display = "none";
                screen_menu.style.display = "none";
                screen_setting.style.display = "block";
                screen_gameover.style.display = "none";
                break;

            case 3: screen_snake.style.display = "none";
                screen_menu.style.display = "none";
                screen_setting.style.display = "none";
                screen_gameover.style.display = "block";
                break;
        }
    }

    /////////////////////////////////////////////////////////////

    window.onload = function () {
        canvas = document.getElementById("game_canvas");
        ctx = canvas.getContext("2d");

        // Screens
        screen_snake = document.getElementById("game_canvas");

        // Ghost images
        ghost_blinky = document.getElementById("ghost_blinky");
        ghost_inky = document.getElementById("ghost_inky");
        ghost_pinky = document.getElementById("ghost_pinky");
        ghost_clyde = document.getElementById("ghost_clyde");

        // misc
        ele_score = document.getElementById("score_value");
        ele_length = document.getElementById("length_value");
        ele_score_display = document.getElementById("score_display");

        canvas.onkeydown = function (evt) {
            evt = evt || window.event;
            switch (evt.code) {
                case "KeyA":
                case "KeyH":
                case "ArrowRight": keys_pressed.right = true; break;
                case "KeyD":
                case "KeyJ":
                case "ArrowLeft": keys_pressed.left = true; break;
                case "KeyW":
                case "KeyK":
                case "ArrowUp": keys_pressed.up = true; break;
                case "KeyS":
                case "KeyJ":
                case "ArrowDown": keys_pressed.down = true; break;
                case "Space": keys_pressed.space = true; break;
                case "Escape":
                case "KeyP": {
                    paused = !paused;
                    if (paused) {
                        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.font = "30px 'Press Start 2P'";
                        ctx.textAlign = "center";
                        ctx.fillStyle = "#ffffff";
                        ctx.fillText("PAUSED", canvas.width/2, canvas.height/2);
                    }
                    break;
                }
            }
        }
        canvas.onkeyup = function (evt) {
            evt = evt || window.event;
            switch (evt.code) {
                case "KeyA":
                case "KeyH":
                case "ArrowRight": keys_pressed.right = false; break;
                case "KeyD":
                case "KeyJ":
                case "ArrowLeft": keys_pressed.left = false; break;
                case "KeyW":
                case "KeyK":
                case "ArrowUp": keys_pressed.up = false; break;
                case "KeyS":
                case "KeyJ":
                case "ArrowDown": keys_pressed.down = false; break;
                case "Space": keys_pressed.space = false; break;
            }
        }
        canvas.onmousemove = function (evt) {
            mouseX = evt.offsetX;
            mouseY = evt.offsetY;
        }

        newGame()
    }

})();
